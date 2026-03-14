const API_BASE = '/api/demo';

export async function startDemoTask(imageId) {
  const response = await fetch(`${API_BASE}/start-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_id: imageId })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Unable to start demo task.');
  }

  return payload.task;
}

export async function fetchDemoTaskStatus(taskId) {
  const response = await fetch(`${API_BASE}/task-status?task_id=${encodeURIComponent(taskId)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to fetch demo task status.');
  }

  return payload.task;
}

export function subscribeToDemoTask(taskId, { intervalMs = 1500, onUpdate, onCompleted, onError } = {}) {
  let timerId;
  let stopped = false;

  const poll = async () => {
    if (stopped) {
      return;
    }

    try {
      const task = await fetchDemoTaskStatus(taskId);
      onUpdate?.(task);

      if (task.status === 'COMPLETED') {
        onCompleted?.(task);
        return;
      }
    } catch (error) {
      onError?.(error);
    }

    timerId = setTimeout(poll, intervalMs);
  };

  poll();

  return () => {
    stopped = true;
    if (timerId) {
      clearTimeout(timerId);
    }
  };
}
