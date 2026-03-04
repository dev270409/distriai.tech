import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;
  
  const key = `newsletter_${ip}`;
  const requests = rateLimitStore.get(key) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitStore.set(key, recentRequests);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  try {
    const { email, honeypot } = req.body;
    
    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Subscribed successfully.' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(200).json({ 
        success: true, 
        message: 'You are already subscribed!' 
      });
    }
    
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email }])
      .select();
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed to updates!' 
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
