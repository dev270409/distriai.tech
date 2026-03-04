import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting storage (in-memory for serverless)
const rateLimitStore = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 5;
  
  const key = `pilot_${ip}`;
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
        subject: `New Pilot Request from ${data.company || data.name}`,
        html: `
          <h2>New Pilot Program Request</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Role:</strong> ${data.role || 'Not specified'}</p>
          <p><strong>Company:</strong> ${data.company || 'Not specified'}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message || 'No message'}</p>
        `
      })
    });
  } catch (error) {
    console.error('Email notification failed:', error);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  try {
    const { name, email, role, company, message, honeypot } = req.body;
    
    // Honeypot check
    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Request submitted successfully.' });
    }
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('pilot_requests')
      .insert([{
        name,
        email,
        role: role || null,
        company: company || null,
        message: message || null,
        status: 'new'
      }])
      .select();
    
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    }
    
    // Send email notification
    await sendNotification({ name, email, role, company, message });
    
    return res.status(200).json({ 
      success: true, 
      message: 'Pilot request submitted successfully. We will contact you within 48 hours.' 
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
