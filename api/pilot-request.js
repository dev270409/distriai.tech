import { getServiceSupabase } from './_lib/supabase.js';
import { getBody, getClientIp, isRateLimited, isValidEmail, normalizeText, setCors } from './_lib/request.js';
import { getEnv } from './_lib/env.js';

async function sendPilotNotification({ name, email, company, message }) {
  const resendKey = getEnv('RESEND_API_KEY');
  if (!resendKey) {
    return;
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'DISTRIAI <noreply@distriai.tech>',
        to: 'partnerships@distriai.tech',
        subject: 'New Pilot Request – DISTRIAI',
        html: `
          <h2>New Pilot Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || 'Not provided'}</p>
          <p><strong>Message:</strong> ${message || 'Not provided'}</p>
        `
      })
    });
  } catch (error) {
    console.error('Pilot notification email failed:', error);
  }
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
  if (isRateLimited({ ip, bucket: 'pilot_request', maxRequests: 5 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const body = getBody(req);
    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const role = normalizeText(body.role);
    const company = normalizeText(body.company);
    const message = normalizeText(body.message);
    const honeypot = normalizeText(body.honeypot);

    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Pilot request submitted successfully.' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('pilot_requests').insert([
      {
        name,
        email,
        role: role || null,
        company: company || null,
        message: message || null,
        status: 'new'
      }
    ]);

    if (error) {
      console.error('pilot_requests insert error:', error);
      return res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    }

    await sendPilotNotification({ name, email, company, message });

    return res.status(200).json({
      success: true,
      message: 'Pilot request submitted successfully. We will contact you within 48 hours.'
    });
  } catch (error) {
    console.error('pilot-request handler error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
