import { listTasks, insertTask, updateTask, deleteTask as apiDeleteTask, toGoogleTask, fromGoogleTask } from './googleTasks.js';

const SYNC_KEY = 'flownote_lastSync';

function getLastSync() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) || 'null');
  } catch { return null; }
}

function setLastSync() {
  localStorage.setItem(SYNC_KEY, JSON.stringify(new Date().toISOString()));
}

function matchesGoogleTask(localTodos, googleTask) {
  const direct = localTodos.find(t => t.googleTaskId === googleTask.id);
  if (direct) return direct;
  return localTodos.find(t => t.title.trim().toLowerCase() === (googleTask.title || '').trim().toLowerCase());
}

export async function pullFromGoogle(taskListId, localTodos, defaultCategory) {
  const googleTasks = await listTasks(taskListId);
  const imported = [];
  const updated = [];

  for (const gt of googleTasks) {
    const match = matchesGoogleTask(localTodos, gt);
    if (match) {
      const newTitle = gt.title || match.title;
      const newCompleted = gt.status === 'completed';
      if (match.title !== newTitle || match.completed !== newCompleted) {
        updated.push({
          ...match,
          title: newTitle,
          completed: newCompleted,
          googleTaskId: gt.id,
        });
      }
    } else {
      const todo = fromGoogleTask(gt, defaultCategory);
      todo.id = Math.random().toString(36).substr(2, 9);
      imported.push(todo);
    }
  }

  return { imported, updated };
}

export async function pushToGoogle(taskListId, localTodos) {
  const synced = [];
  const errors = [];

  for (const todo of localTodos) {
    try {
      if (todo.googleTaskId) {
        await updateTask(taskListId, todo.googleTaskId, toGoogleTask(todo));
      } else {
        const created = await insertTask(taskListId, toGoogleTask(todo));
        synced.push({ ...todo, googleTaskId: created.id });
      }
    } catch (e) {
      errors.push({ todo, error: e.message });
    }
  }

  return { synced, errors };
}

export async function deleteFromGoogle(taskListId, googleTaskId) {
  try {
    await apiDeleteTask(taskListId, googleTaskId);
  } catch (e) {
    if (!e.message.includes('404')) throw e;
  }
}

export async function fullSync(taskListId, localTodos, defaultCategory, onProgress) {
  onProgress?.('Pulling from Google Tasks...');
  const { imported, updated } = await pullFromGoogle(taskListId, localTodos, defaultCategory);

  const mergedTodos = localTodos
    .filter(t => !updated.find(u => u.id === t.id))
    .concat(updated)
    .concat(imported);

  onProgress?.('Pushing local changes to Google Tasks...');
  const { synced, errors } = await pushToGoogle(taskListId, mergedTodos);

  for (const s of synced) {
    const idx = mergedTodos.findIndex(t => t.id === s.id);
    if (idx !== -1) mergedTodos[idx] = s;
  }

  setLastSync();

  return {
    todos: mergedTodos,
    imported: imported.length,
    updated: updated.length,
    synced: synced.length,
    errors: errors.length,
    errorDetails: errors,
  };
}

export function getLastSyncTime() {
  return getLastSync();
}
