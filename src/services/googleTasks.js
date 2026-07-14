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
  return {
    title: todo.title,
    notes: `[Flownote] Priority: ${todo.priority} | Category: ${todo.category}`,
    status: todo.completed ? 'completed' : 'needsAction',
  };
}

export function fromGoogleTask(gt, defaultCategory) {
  return {
    title: gt.title || '',
    completed: gt.status === 'completed',
    priority: 'medium',
    category: defaultCategory || 'inbox',
    googleTaskId: gt.id,
    notes: gt.notes || '',
    due: gt.due || null,
  };
}
