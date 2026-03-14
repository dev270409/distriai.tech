import { getServiceSupabase } from '../_lib/supabase.js';
import { getMemoryTask, updateMemoryTask } from '../_lib/demo-task-store.js';
import { getClientIp, isRateLimited, setCors } from '../_lib/request.js';
import { getTaskProjection } from '../_lib/demo-simulation.js';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  setCors(res, ['GET', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited({ ip, bucket: 'demo_task_status', maxRequests: 60 })) {
    return res.status(429).json({ error: 'Too many requests. Please slow down polling.' });
  }

  try {
    const taskId = req.query.task_id;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'task_id query parameter is required.' });
    }

    if (!UUID_V4_RE.test(taskId)) {
      return res.status(400).json({ error: 'task_id must be a valid UUID.' });
    }

    const memoryTask = getMemoryTask(taskId);
    if (memoryTask) {
      const projectedMemoryTask = getTaskProjection(memoryTask);
      if (projectedMemoryTask.status !== memoryTask.status) {
        updateMemoryTask(taskId, { status: projectedMemoryTask.status });
      }

      return res.status(200).json({ success: true, task: projectedMemoryTask, storage: 'memory' });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('demo_tasks')
      .select('id, image_id, image_url, status, node_logs, audit_trail, created_at, updated_at')
      .eq('id', taskId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Demo task not found.' });
    }

    const projectedTask = getTaskProjection(data);

    if (projectedTask.status !== data.status) {
      const { error: updateError } = await supabase
        .from('demo_tasks')
        .update({ status: projectedTask.status })
        .eq('id', taskId);

      if (updateError) {
        console.error('demo_tasks status update error:', updateError);
      }
    }

    return res.status(200).json({ success: true, task: projectedTask, storage: 'supabase' });
  } catch (error) {
    console.error('demo/task-status error:', error);
    return res.status(500).json({ error: `Failed to fetch task status: ${error.message}` });
  }
}
