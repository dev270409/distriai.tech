import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 5;
  
  const key = `node_${ip}`;
  const requests = rateLimitStore.get(key) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitStore.set(key, recentRequests);
  return true;
}

async function sendNotification(data) {
  if (!process.env.RESEND_API_KEY) return;
  
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'DISTRIAI <noreply@distriai.tech>',
        to: 'partnerships@distriai.tech',
        subject: `New Node Operator: ${data.name}`,
        html: `
          <h2>New Node Waitlist Registration</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>GPU Type:</strong> ${data.gpu_type || 'Not specified'}</p>
          <p><strong>Country:</strong> ${data.country || 'Not specified'}</p>
        `
      })
    });
  } catch (error) {
    console.error('Email notification failed:', error);
  }
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
    const { name, email, gpu_type, country, honeypot } = req.body;
    
    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Request submitted successfully.' });
    }
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    
    const { data, error } = await supabase
      .from('node_waitlist')
      .insert([{
        name,
        email,
        gpu_type: gpu_type || null,
        country: country || null,
        status: 'new'
      }])
      .select();
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    }
    
    await sendNotification({ name, email, gpu_type, country });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Successfully joined the node operator waitlist!' 
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
