const rateLimitStore = new Map();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeText(value));
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

export function isRateLimited({ ip, bucket, windowMs = 60000, maxRequests = 5 }) {
  const now = Date.now();
  const key = `${bucket}:${ip}`;

  const requests = rateLimitStore.get(key) || [];
  const recentRequests = requests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    rateLimitStore.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  rateLimitStore.set(key, recentRequests);
  return false;
}

export function getBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (typeof req.body === 'object') {
    return req.body;
  }

  return {};
}

export function setCors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
