import { randomUUID } from 'node:crypto';
import { getServiceSupabase } from '../_lib/supabase.js';
import { getBody, getClientIp, isRateLimited, setCors } from '../_lib/request.js';
import { buildDemoTaskPayload, getTaskProjection } from '../_lib/demo-simulation.js';

function buildImageUrl(imageId) {
  return `https://cdn.distriai.tech/demo-images/${imageId}.jpg`;
}

export default async function handler(req, res) {
  setCors(res, ['POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited({ ip, bucket: 'demo_start_task', maxRequests: 10 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const body = getBody(req);
    const imageId = Number(body.image_id);

    if (!Number.isInteger(imageId) || imageId < 1 || imageId > 1000) {
      return res.status(400).json({ error: 'image_id must be an integer between 1 and 1000.' });
    }

    const taskId = randomUUID();
    const { nodeLogs, auditTrail } = buildDemoTaskPayload(imageId, taskId);
    const supabase = getServiceSupabase();

    const insertPayload = {
      id: taskId,
      image_id: imageId,
      image_url: buildImageUrl(imageId),
      status: 'SUBMITTING',
      node_logs: nodeLogs,
      audit_trail: auditTrail
    };

    const { data, error } = await supabase
      .from('demo_tasks')
      .insert([insertPayload])
      .select('id, image_id, image_url, status, node_logs, audit_trail, created_at, updated_at')
      .single();

    if (error) {
      console.error('demo_tasks insert error:', error);
      return res.status(500).json({ error: 'Failed to start demo task.' });
    }

    return res.status(200).json({
      success: true,
      task: getTaskProjection(data)
    });
  } catch (error) {
    console.error('demo/start-task error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
