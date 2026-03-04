import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyPassword(password) {
  return password === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const password = authHeader.replace('Bearer ', '');
  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  try {
    const { action, table, id, status } = req.query;
    
    // GET - Fetch data
    if (req.method === 'GET') {
      if (action === 'stats') {
        const [pilots, nodes, subscribers] = await Promise.all([
          supabase.from('pilot_requests').select('*', { count: 'exact' }),
          supabase.from('node_waitlist').select('*', { count: 'exact' }),
          supabase.from('newsletter_subscribers').select('*', { count: 'exact' })
        ]);
        
        return res.status(200).json({
          pilot_requests: pilots.data || [],
          pilot_count: pilots.count || 0,
          node_waitlist: nodes.data || [],
          node_count: nodes.count || 0,
          newsletter_subscribers: subscribers.data || [],
          subscriber_count: subscribers.count || 0
        });
      }
      
      if (table === 'pilot_requests') {
        const { data, error } = await supabase
          .from('pilot_requests')
          .select('*')
          .order('created_at', { ascending: false });
        return res.status(200).json({ data, error });
      }
      
      if (table === 'node_waitlist') {
        const { data, error } = await supabase
          .from('node_waitlist')
          .select('*')
          .order('created_at', { ascending: false });
        return res.status(200).json({ data, error });
      }
      
      if (table === 'newsletter_subscribers') {
        const { data, error } = await supabase
          .from('newsletter_subscribers')
          .select('*')
          .order('created_at', { ascending: false });
        return res.status(200).json({ data, error });
      }
    }
    
    // POST - Update status
    if (req.method === 'POST') {
      const body = req.body;
      
      if (!body.table || !body.id || !body.status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const validTables = ['pilot_requests', 'node_waitlist'];
      if (!validTables.includes(body.table)) {
        return res.status(400).json({ error: 'Invalid table' });
      }
      
      const { data, error } = await supabase
        .from(body.table)
        .update({ status: body.status })
        .eq('id', body.id)
        .select();
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true, data });
    }
    
    return res.status(400).json({ error: 'Invalid request' });
    
  } catch (error) {
    console.error('Admin error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
