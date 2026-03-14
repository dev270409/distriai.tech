const memoryTasks = new Map();

export function saveMemoryTask(task) {
  memoryTasks.set(task.id, task);
  return task;
}

export function getMemoryTask(taskId) {
  return memoryTasks.get(taskId) || null;
}

export function updateMemoryTask(taskId, patch) {
  const current = getMemoryTask(taskId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString()
  };

  memoryTasks.set(taskId, next);
  return next;
}
