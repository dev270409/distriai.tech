import crypto from 'crypto';
import { getEnv } from './env.js';

const ADMIN_COOKIE_NAME = 'distriai_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret() {
  return getEnv('ADMIN_PASSWORD', { required: true });
}

function signPayload(encodedPayload) {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

export function createAdminSessionCookie() {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomBytes(16).toString('hex')
  });

  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload);
  const token = `${encodedPayload}.${signature}`;

  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;
}

export function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return '';
  }

  const chunks = cookieHeader.split(';').map((chunk) => chunk.trim());
  const match = chunks.find((chunk) => chunk.startsWith(`${name}=`));
  if (!match) {
    return '';
  }

  return match.substring(name.length + 1);
}

export function hasValidAdminSession(req) {
  const token = getCookieValue(req, ADMIN_COOKIE_NAME);
  if (!token || !token.includes('.')) {
    return false;
  }

  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = signPayload(encodedPayload);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function assertAdminPassword(password) {
  const submittedPassword = typeof password === 'string' ? password : '';
  return submittedPassword.length > 0 && submittedPassword === getSecret();
}
