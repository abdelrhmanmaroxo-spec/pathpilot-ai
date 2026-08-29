import { createSessionToken, hashToken, normalizeEmail } from './lib/auth.js';
import {
  createPasswordReset,
  deleteSessionsForUser,
  findUserById,
  getSessionUser,
  trackEvent,
} from './lib/database.js';
import { sendPasswordResetEmail } from './lib/email.js';

function bearerToken(request) {
  const header = String(request.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function requestOrigin(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return host ? `${proto}://${host}` : '';
}

function clientIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const value = forwarded[0]
    || String(request.headers['cf-connecting-ip'] || '').trim()
    || String(request.headers['x-real-ip'] || '').trim()
    || String(request.socket?.remoteAddress || '').trim()
    || 'unknown';
  return value.replace(/^::ffff:/, '').slice(0, 80);
}

function describeDevice(userAgent, platform = '') {
  const ua = String(userAgent || '');
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let os = String(platform || '').trim();
  if (!os) {
    if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS/iPadOS';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else os = 'Unknown OS';
  }
  const formFactor = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? 'Mobile/Tablet' : 'Desktop';
  return `${browser} · ${os} · ${formFactor}`.slice(0, 180);
}

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function decorateUser(user, ownerEmail) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    disabled: Boolean(user.disabled),
    email_verified: user.email_verified,
    emailVerified: Boolean(user.email_verified),
    verified_at: user.verified_at,
    auth_provider: user.auth_provider,
    created_at: user.created_at,
    last_seen_at: user.last_seen_at,
    isOwner: Boolean(ownerEmail && normalizeEmail(user.email) === ownerEmail),
  };
}

function currentUser(database, request) {
  const token = bearerToken(request);
  return token ? getSessionUser(database, hashToken(token)) : null;
}

function requireAdmin({ database, request, response, origin, allowedOrigins, sendJson }) {
  const user = currentUser(database, request);
  if (!user || user.role !== 'admin') {
    sendJson(response, 403, { error: 'Admin access required.' }, origin, allowedOrigins);
    return null;
  }
  return user;
}

function requireOwner({ database, request, response, origin, allowedOrigins, sendJson, ownerEmail }) {
  const user = currentUser(database, request);
  if (!user || !ownerEmail || normalizeEmail(user.email) !== ownerEmail) {
    sendJson(response, 403, { error: 'Owner access required.' }, origin, allowedOrigins);
    return null;
  }
  return user;
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

export function createAdminExtensions({ database, env = process.env, sendJson, allowedOrigins }) {
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL || env.ADMIN_EMAIL);
  const resendApiKey = String(env.RESEND_API_KEY || '').trim();
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const emailReady = Boolean(resendApiKey && emailFrom);

  return async function handleAdminExtension(request, response, origin, path) {
    if (request.method === 'POST' && path === '/api/security/login-device') {
      const user = currentUser(database, request);
      if (!user) {
        sendJson(response, 401, { error: 'Not signed in.' }, origin, allowedOrigins);
        return true;
      }
      const body = await readJson(request);
      const userAgent = String(request.headers['user-agent'] || body.userAgent || '').slice(0, 500);
      const metadata = {
        ip: clientIp(request),
        device: describeDevice(userAgent, body.platform),
        userAgent,
        platform: String(body.platform || '').slice(0, 120) || null,
        language: String(body.language || '').slice(0, 40) || null,
        timezone: String(body.timezone || '').slice(0, 80) || null,
        screen: String(body.screen || '').slice(0, 40) || null,
        recordedAt: new Date().toISOString(),
      };
      const latestLogin = database.prepare(`
        SELECT id,event_type,created_at
        FROM events
        WHERE user_id = ? AND event_type IN ('login','google_login','google_account_created')
        ORDER BY id DESC
        LIMIT 1
      `).get(user.id);
      if (latestLogin) {
        database.prepare('UPDATE events SET metadata_json = ? WHERE id = ?').run(JSON.stringify(metadata), latestLogin.id);
      } else {
        trackEvent(database, { userId: user.id, eventType: 'login_device', metadata });
      }
      sendJson(response, 200, { ok: true }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'GET' && path === '/api/admin/feedback') {
      if (!requireAdmin({ database, request, response, origin, allowedOrigins, sendJson })) return true;
      const feedback = database.prepare(`
        SELECT f.id,f.rating,f.message,f.workspace,f.tool,f.created_at,
               u.id AS user_id,u.name AS user_name,u.email AS user_email
        FROM feedback f
        LEFT JOIN users u ON u.id = f.user_id
        ORDER BY f.created_at DESC
        LIMIT 100
      `).all();
      sendJson(response, 200, { feedback }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'GET' && path === '/api/admin/login-log') {
      if (!requireAdmin({ database, request, response, origin, allowedOrigins, sendJson })) return true;
      const logins = database.prepare(`
        SELECT e.id,e.event_type,e.created_at,e.metadata_json,
               u.id AS user_id,u.name AS user_name,u.email AS user_email,u.role,u.auth_provider
        FROM events e
        LEFT JOIN users u ON u.id = e.user_id
        WHERE e.event_type IN ('login','google_login','google_account_created','login_device')
        ORDER BY e.created_at DESC
        LIMIT 200
      `).all().map((item) => {
        const metadata = safeJson(item.metadata_json, {});
        const ip = metadata.ip || '—';
        const device = metadata.device || 'Unknown device';
        return {
          ...item,
          metadata,
          ip,
          device,
          event_key: item.event_type,
          event_type: `${item.event_type} · IP ${ip} · ${device}`,
        };
      });
      sendJson(response, 200, { logins }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'GET' && path === '/api/admin/account-log') {
      if (!requireOwner({ database, request, response, origin, allowedOrigins, sendJson, ownerEmail })) return true;
      const accounts = database.prepare(`
        SELECT u.id,u.name,u.email,u.role,u.disabled,u.email_verified,u.verified_at,u.auth_provider,u.created_at,u.last_seen_at,
          (SELECT COUNT(*) FROM events e WHERE e.user_id=u.id AND e.event_type IN ('login','google_login','google_account_created')) AS login_count,
          (SELECT MAX(e.created_at) FROM events e WHERE e.user_id=u.id AND e.event_type IN ('login','google_login','google_account_created')) AS last_login_at
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 200
      `).all().map((item) => decorateUser({ ...item, login_count: Number(item.login_count || 0), last_login_at: item.last_login_at }, ownerEmail));

      const accountRows = database.prepare(`
        SELECT u.id,u.name,u.email,u.role,u.disabled,u.email_verified,u.verified_at,u.auth_provider,u.created_at,u.last_seen_at,
          (SELECT COUNT(*) FROM events e WHERE e.user_id=u.id AND e.event_type IN ('login','google_login','google_account_created')) AS login_count,
          (SELECT MAX(e.created_at) FROM events e WHERE e.user_id=u.id AND e.event_type IN ('login','google_login','google_account_created')) AS last_login_at
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 200
      `).all().map((item) => ({
        ...decorateUser(item, ownerEmail),
        loginCount: Number(item.login_count || 0),
        lastLoginAt: item.last_login_at || null,
      }));
      sendJson(response, 200, { accounts: accountRows, count: accounts.length }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'POST' && path === '/api/admin/users/ban') {
      const owner = requireOwner({ database, request, response, origin, allowedOrigins, sendJson, ownerEmail });
      if (!owner) return true;
      const body = await readJson(request);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) {
        sendJson(response, 404, { error: 'User not found.' }, origin, allowedOrigins);
        return true;
      }
      if (ownerEmail && normalizeEmail(target.email) === ownerEmail) {
        sendJson(response, 400, { error: 'The protected owner account cannot be banned.' }, origin, allowedOrigins);
        return true;
      }
      const banned = Boolean(body.banned);
      database.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(banned ? 1 : 0, target.id);
      if (banned) deleteSessionsForUser(database, target.id);
      trackEvent(database, {
        userId: owner.id,
        eventType: banned ? 'user_banned_by_owner' : 'user_unbanned_by_owner',
        metadata: { targetUserId: target.id, targetEmail: target.email },
      });
      sendJson(response, 200, { user: decorateUser(findUserById(database, target.id), ownerEmail) }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'POST' && path === '/api/admin/users/reset-password') {
      const owner = requireOwner({ database, request, response, origin, allowedOrigins, sendJson, ownerEmail });
      if (!owner) return true;
      if (!emailReady) {
        sendJson(response, 503, { error: 'Password reset email is not configured yet.' }, origin, allowedOrigins);
        return true;
      }
      const body = await readJson(request);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) {
        sendJson(response, 404, { error: 'User not found.' }, origin, allowedOrigins);
        return true;
      }
      if (!target.email_verified) {
        sendJson(response, 400, { error: 'Verify this email before sending a password reset.' }, origin, allowedOrigins);
        return true;
      }
      const token = createSessionToken();
      createPasswordReset(database, { tokenHash: hashToken(token), userId: target.id, minutes: 30 });
      const apiOrigin = requestOrigin(request);
      if (!apiOrigin) {
        sendJson(response, 500, { error: 'Public API origin could not be resolved.' }, origin, allowedOrigins);
        return true;
      }
      try {
        await sendPasswordResetEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: target.email,
          name: target.name,
          resetUrl: `${apiOrigin}/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        });
      } catch {
        sendJson(response, 502, { error: 'Could not send the password reset email.' }, origin, allowedOrigins);
        return true;
      }
      trackEvent(database, {
        userId: owner.id,
        eventType: 'password_reset_sent_by_owner',
        metadata: { targetUserId: target.id, targetEmail: target.email },
      });
      sendJson(response, 200, { ok: true, email: target.email }, origin, allowedOrigins);
      return true;
    }

    if (request.method === 'GET' && path === '/api/admin/export') {
      const owner = requireOwner({ database, request, response, origin, allowedOrigins, sendJson, ownerEmail });
      if (!owner) return true;
      const users = database.prepare(`
        SELECT id,name,email,role,disabled,email_verified,verified_at,auth_provider,created_at,last_seen_at
        FROM users ORDER BY created_at DESC
      `).all().map((item) => decorateUser(item, ownerEmail));
      const snapshot = {
        kind: 'PathPilotOwnerDataExport',
        version: 1,
        generatedAt: new Date().toISOString(),
        note: 'Security secrets, password hashes, sessions, and reset tokens are intentionally excluded.',
        users,
        events: database.prepare('SELECT id,user_id,anonymous_id,event_type,workspace,tool,metadata_json,created_at FROM events ORDER BY id DESC LIMIT 5000').all(),
        feedback: database.prepare('SELECT id,user_id,rating,message,workspace,tool,created_at FROM feedback ORDER BY id DESC LIMIT 5000').all(),
        aiRequests: database.prepare('SELECT id,user_id,workspace,tool,model,status,latency_ms,error_code,created_at FROM ai_requests ORDER BY id DESC LIMIT 5000').all(),
        clientErrors: database.prepare('SELECT id,user_id,message,context,created_at FROM client_errors ORDER BY id DESC LIMIT 5000').all(),
        adminInvites: database.prepare('SELECT email,invited_by,created_at,accepted_at FROM admin_invites ORDER BY created_at DESC').all(),
      };
      trackEvent(database, { userId: owner.id, eventType: 'owner_data_exported' });
      sendJson(response, 200, { snapshot }, origin, allowedOrigins);
      return true;
    }

    return false;
  };
}
