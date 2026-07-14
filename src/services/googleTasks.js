import { getToken } from './googleAuth.js';

const BASE = 'https://tasks.googleapis.com/tasks/v1';

async function api(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Tasks API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function listTaskLists() {
  const data = await api('/users/@me/lists');
  return data.items || [];
}

export async function listTasks(taskListId, showCompleted = true) {
  const params = new URLSearchParams({ showCompleted: String(showCompleted), showHidden: 'true' });
  const data = await api(`/lists/${taskListId}/tasks?${params}`);
  return data.items || [];
}

export async function insertTask(taskListId, task) {
  return api(`/lists/${taskListId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(taskListId, taskId, task) {
  return api(`/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(task),
  });
}

export async function deleteTask(taskListId, taskId) {
  return api(`/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export function toGoogleTask(todo) {
  let due = todo.due;
  if (todo.category === 'today') {
    due = new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
  } else if (todo.category === 'others' && todo.due) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (todo.due.split('T')[0] === todayStr) {
      due = null;
    }
  }
  return {
    title: todo.title,
    notes: todo.notes || `[Flownote] Priority: ${todo.priority}`,
    status: todo.completed ? 'completed' : 'needsAction',
    due: due,
  };
}

export function fromGoogleTask(gt, defaultCategory) {
  const todayStr = new Date().toISOString().split('T')[0];
  let category = 'others';
  if (gt.due) {
    const dueStr = gt.due.split('T')[0];
    if (dueStr === todayStr) {
      category = 'today';
    }
  }
  return {
    title: gt.title || '',
    completed: gt.status === 'completed',
    priority: 'medium',
    category: category,
    googleTaskId: gt.id,
    notes: gt.notes || '',
    due: gt.due || null,
  };
}
