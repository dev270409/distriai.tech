import { getServiceSupabase } from '../_lib/supabase.js';
import { getClientIp, isRateLimited, setCors } from '../_lib/request.js';
import { getTaskProjection } from '../_lib/demo-simulation.js';

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
      await supabase
        .from('demo_tasks')
        .update({ status: projectedTask.status })
        .eq('id', taskId);
    }

    return res.status(200).json({ success: true, task: projectedTask });
  } catch (error) {
    console.error('demo/task-status error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
