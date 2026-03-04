import { getServiceSupabase } from './_lib/supabase.js';
import { getBody, setCors } from './_lib/request.js';
import { hasValidAdminSession } from './_lib/admin-auth.js';

const STATUS_BY_TABLE = {
  pilot_requests: ['new', 'contacted', 'in_call', 'closed'],
  node_waitlist: ['new', 'contacted', 'approved', 'active', 'inactive']
};

function unauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req, res) {
  setCors(res, ['GET', 'POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!hasValidAdminSession(req)) {
    return unauthorized(res);
  }

  try {
    const supabase = getServiceSupabase();

    if (req.method === 'GET') {
      const action = req.query?.action;

      if (action !== 'stats') {
        return res.status(400).json({ error: 'Invalid request' });
      }

      const [pilotResult, nodeResult, newsletterResult] = await Promise.all([
        supabase.from('pilot_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
        supabase.from('node_waitlist').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      ]);

      const queryError = pilotResult.error || nodeResult.error || newsletterResult.error;
      if (queryError) {
        console.error('admin stats query error:', queryError);
        return res.status(500).json({ error: 'Failed to load admin data.' });
      }

      return res.status(200).json({
        pilot_requests: pilotResult.data || [],
        pilot_count: pilotResult.count || 0,
        node_waitlist: nodeResult.data || [],
        node_count: nodeResult.count || 0,
        newsletter_subscribers: newsletterResult.data || [],
        subscriber_count: newsletterResult.count || 0
      });
    }

    if (req.method === 'POST') {
      const body = getBody(req);
      const table = typeof body.table === 'string' ? body.table.trim() : '';
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      const status = typeof body.status === 'string' ? body.status.trim() : '';

      if (!table || !id || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const allowedStatuses = STATUS_BY_TABLE[table];
      if (!allowedStatuses) {
        return res.status(400).json({ error: 'Invalid table' });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { error } = await supabase.from(table).update({ status }).eq('id', id);

      if (error) {
        console.error('admin status update error:', error);
        return res.status(500).json({ error: 'Failed to update status.' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('admin handler error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
