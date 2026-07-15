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
  let cleanTitle = todo.title.trim();
  if (cleanTitle.startsWith('⭐ ')) {
    cleanTitle = cleanTitle.substring(2);
  } else if (cleanTitle.startsWith('⭐')) {
    cleanTitle = cleanTitle.substring(1);
  }
  const title = todo.priority === 'high' ? `⭐ ${cleanTitle}` : cleanTitle;
  return {
    title: title,
    notes: todo.notes || '',
    status: todo.completed ? 'completed' : 'needsAction',
    due: todo.due || null,
  };
}

export function fromGoogleTask(gt, defaultCategory) {
  let title = gt.title || '';
  let priority = 'low';
  if (title.startsWith('⭐ ')) {
    title = title.substring(2);
    priority = 'high';
  } else if (title.startsWith('⭐')) {
    title = title.substring(1);
    priority = 'high';
  }
  return {
    title: title,
    completed: gt.status === 'completed',
    priority: priority,
    category: 'others',
    googleTaskId: gt.id,
    notes: gt.notes || '',
    due: gt.due || null,
  };
}
