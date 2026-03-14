import { randomUUID } from 'node:crypto';
import { getServiceSupabase } from '../_lib/supabase.js';
 codex/integrate-pilot-demo-for-1000-images-brmkkq
import { saveMemoryTask } from '../_lib/demo-task-store.js';

 codex/integrate-pilot-demo-for-1000-images-8klg5c
import { saveMemoryTask } from '../_lib/demo-task-store.js';

 main
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
 codex/integrate-pilot-demo-for-1000-images-brmkkq

 codex/integrate-pilot-demo-for-1000-images-8klg5c

    const supabase = getServiceSupabase();
 main
 main

    const insertPayload = {
      id: taskId,
      image_id: imageId,
      image_url: buildImageUrl(imageId),
      status: 'SUBMITTING',
      node_logs: nodeLogs,
      audit_trail: auditTrail
    };

 codex/integrate-pilot-demo-for-1000-images-brmkkq

 codex/integrate-pilot-demo-for-1000-images-8klg5c
 main
    const nowIso = new Date().toISOString();

    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('demo_tasks')
        .insert([insertPayload])
        .select('id, image_id, image_url, status, node_logs, audit_trail, created_at, updated_at')
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        task: getTaskProjection(data),
        storage: 'supabase'
      });
    } catch (insertError) {
      console.error('demo_tasks insert error (falling back to memory):', insertError);

      const memoryTask = saveMemoryTask({
        ...insertPayload,
        created_at: nowIso,
        updated_at: nowIso
      });

      return res.status(200).json({
        success: true,
        task: getTaskProjection(memoryTask),
        storage: 'memory',
        warning:
          'Demo task running in temporary in-memory mode. Check Supabase env and run database/migrations/20260314_demo_tasks.sql.'
      });
    }
  } catch (error) {
    console.error('demo/start-task error:', error);
    return res.status(500).json({ error: `Failed to start demo task: ${error.message}` });
 codex/integrate-pilot-demo-for-1000-images-brmkkq


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
 main
  }
}
