import { listTasks, insertTask, updateTask, deleteTask as apiDeleteTask, toGoogleTask, fromGoogleTask } from './googleTasks.js';

const LAST_SYNC_KEY = 'flownote_lastSync';
const DELETED_QUEUE_KEY = 'flownote_deletedGoogleTaskIds';

// Helper to get from chrome.storage or localStorage fallback
async function getStorageData(key, defaultValue) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (res) => {
        resolve(res[key] !== undefined ? res[key] : defaultValue);
      });
    });
  }
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Helper to set to chrome.storage or localStorage fallback
async function setStorageData(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export async function getLastSyncTime() {
  return getStorageData(LAST_SYNC_KEY, null);
}

export async function queueDeletedTaskId(googleTaskId) {
  if (!googleTaskId) return;
  const queue = await getStorageData(DELETED_QUEUE_KEY, []);
  if (!queue.includes(googleTaskId)) {
    queue.push(googleTaskId);
    await setStorageData(DELETED_QUEUE_KEY, queue);
  }
}

function matchesGoogleTask(localTodos, googleTask) {
  const direct = localTodos.find(t => t.googleTaskId === googleTask.id);
  if (direct) return direct;
  return localTodos.find(t => t.title.trim().toLowerCase() === (googleTask.title || '').trim().toLowerCase());
}

export async function fullSync(taskListId, localTodos, defaultCategory, onProgress) {
  onProgress?.('Fetching tasks from Google Tasks...');
  let googleTasks = [];
  try {
    googleTasks = await listTasks(taskListId);
  } catch (err) {
    throw new Error(`Failed to fetch tasks from Google: ${err.message}`);
  }

  // 1. Sync Deletions to Google Tasks
  const deletedQueue = await getStorageData(DELETED_QUEUE_KEY, []);
  if (deletedQueue.length > 0) {
    onProgress?.(`Syncing ${deletedQueue.length} local deletion(s) to Google...`);
    const remainingDeletions = [];
    for (const gid of deletedQueue) {
      try {
        await apiDeleteTask(taskListId, gid);
      } catch (err) {
        // If the task is already deleted on Google (404), that's fine. Otherwise retry later.
        if (!err.message.includes('404')) {
          remainingDeletions.push(gid);
        }
      }
    }
    await setStorageData(DELETED_QUEUE_KEY, remainingDeletions);
  }

  // Keep track of tasks to merge
  const finalTodos = [...localTodos];
  const googleTaskIds = new Set(googleTasks.map(gt => gt.id));

  // 2. Process Google Tasks (Pull)
  onProgress?.('Merging Google Tasks changes...');
  const importedCount = { val: 0 };
  const updatedCount = { val: 0 };

  for (const gt of googleTasks) {
    const match = matchesGoogleTask(finalTodos, gt);
    if (match) {
      // If found, update local task to match Google task
      // BUT only if the local task is not dirty (meaning local changes should take precedence until pushed)
      if (!match.dirty) {
        const newTitle = gt.title || match.title;
        const newCompleted = gt.status === 'completed';
        if (match.title !== newTitle || match.completed !== newCompleted || match.googleTaskId !== gt.id) {
          const idx = finalTodos.findIndex(t => t.id === match.id);
          if (idx !== -1) {
            finalTodos[idx] = {
              ...match,
              title: newTitle,
              completed: newCompleted,
              googleTaskId: gt.id,
              dirty: false // clear dirty if we pull Google's truth
            };
            updatedCount.val++;
          }
        }
      } else {
        // If the local task is dirty, make sure it has the correct googleTaskId linked
        if (match.googleTaskId !== gt.id) {
          const idx = finalTodos.findIndex(t => t.id === match.id);
          if (idx !== -1) {
            finalTodos[idx] = { ...match, googleTaskId: gt.id };
          }
        }
      }
    } else {
      // Task exists on Google but not locally -> Import it
      const todo = fromGoogleTask(gt, defaultCategory);
      todo.id = Math.random().toString(36).substr(2, 9);
      todo.dirty = false;
      todo.taskListId = taskListId;
      finalTodos.push(todo);
      importedCount.val++;
    }
  }

  // 3. Handle Deletions on Google side:
  // If a local task has googleTaskId, but it was NOT found in googleTasks, and it is not dirty (new),
  // it was deleted on Google Tasks -> Delete it locally.
  const syncedLocalTodos = finalTodos.filter(todo => {
    if (todo.googleTaskId && !googleTaskIds.has(todo.googleTaskId)) {
      // It was deleted on Google, so remove it locally unless it has local unsaved updates
      if (!todo.dirty) {
        return false;
      }
      // If it is dirty, we will recreate/update it on Google
      delete todo.googleTaskId;
    }
    return true;
  });

  // 4. Push local changes/new tasks to Google
  onProgress?.('Pushing local changes to Google Tasks...');
  let pushedCount = 0;
  const errors = [];

  for (let i = 0; i < syncedLocalTodos.length; i++) {
    const todo = syncedLocalTodos[i];
    
    // Only push if it is a new task (no googleTaskId) or if it has local edits (dirty === true)
    if (!todo.googleTaskId || todo.dirty) {
      try {
        if (todo.googleTaskId) {
          // Update existing task on Google
          await updateTask(taskListId, todo.googleTaskId, toGoogleTask(todo));
          syncedLocalTodos[i] = { ...todo, dirty: false };
        } else {
          // Insert new task to Google
          const created = await insertTask(taskListId, toGoogleTask(todo));
          syncedLocalTodos[i] = { ...todo, googleTaskId: created.id, dirty: false };
        }
        pushedCount++;
      } catch (err) {
        errors.push({ todo, error: err.message });
      }
    }
  }

  // Update last sync time
  const now = new Date().toISOString();
  await setStorageData(LAST_SYNC_KEY, now);

  return {
    todos: syncedLocalTodos,
    imported: importedCount.val,
    updated: updatedCount.val,
    synced: pushedCount,
    errors: errors.length,
    errorDetails: errors
  };
}

export async function deleteFromGoogle(taskListId, googleTaskId) {
  try {
    await apiDeleteTask(taskListId, googleTaskId);
  } catch (e) {
    if (!e.message.includes('404')) throw e;
  }
}

