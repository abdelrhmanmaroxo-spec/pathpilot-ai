import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildProviderRequest, extractProviderText } from './lib/ai-provider.js';
import {
  isProtectedOwnerEmail,
  DEFAULT_SUPPORT_EMAIL,
  createSessionToken,
  createVerificationCode,
  hashEmailOtp,
  hashPassword,
  hashToken,
  normalizeEmail,
  verifyPassword,
} from './lib/auth.js';
import { sendPasswordResetEmail, sendSupportTicketEmail, sendVerificationEmail } from './lib/email.js';
import { verifyGoogleCredential } from './lib/google-auth.js';
import {
  appendSupportMessageRecord,
  consumeEmailVerification,
  consumeEmailVerificationCode,
  consumePasswordReset,
  consumePasswordResetCode,
  createEmailVerification,
  createFeedback,
  createPasswordReset,
  createSession,
  createSupportTicketRecord,
  createUser,
  deleteSession,
  deleteSessionsForUser,
  deleteUser,
  findPendingAdminInvite,
  findSupportTicketById,
  findUserByEmail,
  findUserById,
  getAdminSummary,
  getSessionUser,
  initializeDatabase,
  listAdminInvites,
  listAiRequests,
  listErrors,
  listFeedback,
  listSupportTicketRecords,
  listUsers,
  markAdminInviteAccepted,
  revokeAdminInvite,
  setSupportTicketStatusRecord,
  setUserEmailVerified,
  setUserPasswordHash,
  setUserRole,
  trackAiRequest,
  trackClientError,
  trackEvent,
  upsertAdminInvite,
} from './lib/database.js';

const VALID_MODES = new Set(['general', 'study', 'work']);
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function getBearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(body || '{}');
}

function requestOrigin(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return host ? `${proto}://${host}` : '';
}

function messagePage({ title, message, appUrl, success }) {
  const accent = success ? '#22c55e' : '#ef4444';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#080d19;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:620px;margin:10vh auto;padding:28px"><div style="background:#111827;border:1px solid #243047;border-radius:20px;padding:34px"><div style="width:46px;height:46px;border-radius:14px;background:${accent};display:grid;place-items:center;font-weight:900;color:white">P</div><h1>${title}</h1><p style="line-height:1.7;color:#cbd5e1">${message}</p><a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:10px;background:#6d5dfc;color:white;text-decoration:none;font-weight:700">Open PathPilot</a></div></main></body></html>`;
}

function passwordResetPage({ token, appUrl }) {
  const tokenJson = JSON.stringify(token);
  const appUrlJson = JSON.stringify(appUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset PathPilot password</title></head><body style="margin:0;background:#080d19;color:#f8fafc;font-family:Arial,sans-serif"><main style="max-width:620px;margin:8vh auto;padding:28px"><div style="background:#111827;border:1px solid #243047;border-radius:20px;padding:34px"><div style="width:46px;height:46px;border-radius:14px;background:#6d5dfc;display:grid;place-items:center;font-weight:900;color:white">P</div><h1>Choose a new password</h1><p style="line-height:1.7;color:#cbd5e1">Use at least 8 characters. After the reset, all existing PathPilot sessions will be signed out.</p><form id="reset-form"><label style="display:block;margin:18px 0 8px">New password</label><input id="password" type="password" minlength="8" maxlength="128" required autocomplete="new-password" style="box-sizing:border-box;width:100%;padding:13px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:white"><label style="display:block;margin:18px 0 8px">Confirm password</label><input id="confirm" type="password" minlength="8" maxlength="128" required autocomplete="new-password" style="box-sizing:border-box;width:100%;padding:13px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:white"><div id="status" style="min-height:24px;margin:14px 0;color:#fca5a5"></div><button id="submit" type="submit" style="border:0;border-radius:10px;background:#6d5dfc;color:white;padding:12px 18px;font-weight:700;cursor:pointer">Reset password</button></form></div></main><script>const token=${tokenJson};const appUrl=${appUrlJson};const form=document.getElementById('reset-form');const status=document.getElementById('status');const submit=document.getElementById('submit');form.addEventListener('submit',async(e)=>{e.preventDefault();const password=document.getElementById('password').value;const confirm=document.getElementById('confirm').value;if(password!==confirm){status.textContent='Passwords do not match.';return;}submit.disabled=true;status.textContent='Resetting password...';try{const res=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Reset failed.');form.innerHTML='<h2 style="color:#86efac">Password updated</h2><p>Your password was reset and old sessions were signed out.</p><a style="display:inline-block;margin-top:12px;color:#c4b5fd" href="'+appUrl+'">Return to PathPilot</a>';}catch(err){status.textContent=err.message;submit.disabled=false;}});</script></body></html>`;
}

export function createPathPilotServer({
  env = process.env,
  database = initializeDatabase(),
  emailSender = sendVerificationEmail,
  passwordResetSender = sendPasswordResetEmail,
  supportEmailSender = sendSupportTicketEmail,
} = {}) {
  const apiKey = env.AI_API_KEY || '';
  const model = env.AI_MODEL || '';
  const apiMode = env.AI_API_MODE === 'responses' ? 'responses' : 'chat-completions';
  const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const provider = env.AI_PROVIDER || (baseUrl.includes('openai.com') ? 'OpenAI' : baseUrl.includes('googleapis.com') ? 'Gemini' : baseUrl.includes('anthropic.com') ? 'Claude' : 'Compatible API');
  const endpoint = env.AI_ENDPOINT || `${baseUrl}/${apiMode === 'responses' ? 'responses' : 'chat/completions'}`;
  const reasoningEffort = env.AI_REASONING_EFFORT || '';
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean));
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL || env.ADMIN_EMAIL || '');
  const supportEmail = String(env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
  const googleClientId = String(env.GOOGLE_CLIENT_ID || '').trim();
  const resendApiKey = String(env.RESEND_API_KEY || '').trim();
  const emailProvider = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const smtp = {
    host: String(env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(env.SMTP_PORT || 465),
    secure: String(env.SMTP_SECURE || 'true').trim().toLowerCase() === 'true',
    user: String(env.SMTP_USER || '').trim(),
    pass: String(env.SMTP_PASS || '').replace(/\s+/g, ''),
  };
  const gmailApi = {
    clientId: String(env.GMAIL_CLIENT_ID || '').trim(),
    clientSecret: String(env.GMAIL_CLIENT_SECRET || '').trim(),
    refreshToken: String(env.GMAIL_REFRESH_TOKEN || '').trim(),
  };
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const appUrl = String(env.PUBLIC_APP_URL || 'https://abdelrhmanmaroxo-spec.github.io/pathpilot-ai/').trim();
  const aiConfigured = Boolean(apiKey && model);
  const smtpReady = ['gmail', 'smtp'].includes(emailProvider) && Boolean(smtp.host && smtp.user && smtp.pass && emailFrom);
  const gmailApiReady = ['gmail-api', 'gmailapi'].includes(emailProvider) && Boolean(gmailApi.clientId && gmailApi.clientSecret && gmailApi.refreshToken && emailFrom);
  const resendReady = Boolean(resendApiKey && emailFrom);
  const emailVerificationConfigured = Boolean(smtpReady || gmailApiReady || resendReady);
  const rateLimits = new Map();

  function corsHeaders(origin) {
    const allowed = origin && allowedOrigins.has(origin) ? origin : '';
    return {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
      Vary: 'Origin',
    };
  }

  function sendJson(response, status, body, origin = '') {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...corsHeaders(origin),
    });
    response.end(JSON.stringify(body));
  }

  function sendHtml(response, status, html) {
    response.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
    response.end(html);
  }

  function checkRateLimit(request, limit = 60) {
    const path = new URL(request.url || '/', 'http://localhost').pathname;
    const key = `${request.socket.remoteAddress || 'unknown'}:${path}`;
    const minute = Math.floor(Date.now() / 60_000);
    const record = rateLimits.get(key);
    if (!record || record.minute !== minute) {
      rateLimits.set(key, { minute, count: 1 });
      return true;
    }
    record.count += 1;
    return record.count <= limit;
  }

  function decorateUser(user) {
    if (!user) return null;
    const isOwner = isProtectedOwnerEmail(user.email, env);
    let role = user.role;
    if (isOwner && role !== 'admin') {
      setUserRole(database, user.id, 'admin');
      role = 'admin';
    }
    return { ...user, role, isOwner, emailVerified: Boolean(user.email_verified) };
  }

  function initialRoleForEmail(email) {
    if (isProtectedOwnerEmail(email, env)) return 'admin';
    return findPendingAdminInvite(database, email) ? 'admin' : 'user';
  }

  function acceptAdminInviteIfPresent(userRecord) {
    const email = normalizeEmail(userRecord.email);
    const invite = findPendingAdminInvite(database, email);
    if (!invite) return userRecord;
    const promoted = userRecord.role === 'admin' ? userRecord : setUserRole(database, userRecord.id, 'admin');
    markAdminInviteAccepted(database, email);
    trackEvent(database, { userId: promoted.id, eventType: 'admin_invite_accepted' });
    return promoted;
  }

  function currentUser(request) {
    const token = getBearerToken(request);
    return token ? decorateUser(getSessionUser(database, hashToken(token))) : null;
  }

  function requireAdmin(request, response, origin) {
    const user = currentUser(request);
    if (!user || user.role !== 'admin') {
      sendJson(response, 403, { error: 'Admin access required.' }, origin);
      return null;
    }
    return user;
  }

  function requireOwner(request, response, origin) {
    const user = currentUser(request);
    if (!user?.isOwner) {
      sendJson(response, 403, { error: 'Owner access required.' }, origin);
      return null;
    }
    return user;
  }

  function startSessionFor(userRecord, eventType) {
    const user = decorateUser(userRecord);
    const token = createSessionToken();
    createSession(database, { tokenHash: hashToken(token), userId: user.id });
    trackEvent(database, { userId: user.id, eventType });
    return { token, user };
  }

  async function issueVerification(request, userRecord) {
    const token = createSessionToken();
    const verificationCode = createVerificationCode();
    createEmailVerification(database, {
      tokenHash: hashToken(token),
      codeHash: hashEmailOtp(userRecord.email, verificationCode),
      userId: userRecord.id,
      hours: 24,
    });
    const apiOrigin = requestOrigin(request);
    if (!apiOrigin) throw new Error('PUBLIC_API_ORIGIN');
    await emailSender({
      apiKey: resendApiKey,
      from: emailFrom,
      to: userRecord.email,
      name: userRecord.name,
      verificationCode,
      verificationUrl: `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      provider: emailProvider,
      smtp,
      gmailApi,
    });
  }

  async function issuePasswordReset(request, userRecord) {
    const token = createSessionToken();
    const resetCode = createVerificationCode();
    createPasswordReset(database, {
      tokenHash: hashToken(token),
      codeHash: hashEmailOtp(userRecord.email, resetCode),
      userId: userRecord.id,
      minutes: 30,
    });
    const apiOrigin = requestOrigin(request);
    if (!apiOrigin) throw new Error('PUBLIC_API_ORIGIN');
    await passwordResetSender({
      apiKey: resendApiKey,
      from: emailFrom,
      to: userRecord.email,
      name: userRecord.name,
      resetCode,
      resetUrl: `${apiOrigin}/api/auth/reset-password?token=${encodeURIComponent(token)}`,
      provider: emailProvider,
      smtp,
      gmailApi,
    });
  }

  async function dispatchTicketNotifications(ticket, messageText, isStaffReply) {
    if (!emailVerificationConfigured) return false;
    try {
      await supportEmailSender({
        apiKey: resendApiKey,
        from: emailFrom,
        to: ticket.requester_email,
        replyTo: supportEmail,
        ticket,
        messageText,
        isStaffReply,
        isOwnerAlert: false,
        provider: emailProvider,
        smtp,
        gmailApi,
      });
      if (!isStaffReply && ownerEmail) {
        await supportEmailSender({
          apiKey: resendApiKey,
          from: emailFrom,
          to: ownerEmail,
          replyTo: ticket.requester_email,
          ticket,
          messageText,
          isStaffReply: false,
          isOwnerAlert: true,
          provider: emailProvider,
          smtp,
          gmailApi,
        });
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handle(request, response) {
    const origin = request.headers.origin || '';
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    const path = requestUrl.pathname;
    if (origin && !allowedOrigins.has(origin)) return sendJson(response, 403, { error: 'Origin not allowed.' });
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin));
      response.end();
      return;
    }

    const rateLimit = path === '/api/assistant'
      ? 30
      : ['/api/auth/register', '/api/auth/resend-verification', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-code', '/api/auth/reset-password-code'].includes(path)
        ? 10
        : 90;
    if (!checkRateLimit(request, rateLimit)) return sendJson(response, 429, { error: 'Too many requests. Try again shortly.' }, origin);

    if (request.method === 'GET' && ['/health', '/api/status'].includes(path)) {
      return sendJson(response, 200, {
        ok: true,
        apiOnline: aiConfigured,
        apiMode,
        provider,
        model: aiConfigured ? model : null,
        databaseOnline: true,
        googleAuthAvailable: Boolean(googleClientId),
        googleClientId: googleClientId || null,
        emailVerificationAvailable: emailVerificationConfigured,
        passwordResetAvailable: emailVerificationConfigured,
        otpVerificationAvailable: emailVerificationConfigured,
        supportTicketsAvailable: true,
        supportEmail,
      }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      if (!emailVerificationConfigured) return sendJson(response, 503, { error: 'Email verification is not configured yet.', code: 'EMAIL_VERIFICATION_NOT_CONFIGURED' }, origin);
      let createdUser = null;
      try {
        const body = await readJson(request);
        const name = String(body.name || '').trim().slice(0, 60);
        const email = normalizeEmail(body.email);
        if (name.length < 2 || !EMAIL_PATTERN.test(email)) return sendJson(response, 400, { error: 'Name or email is invalid.' }, origin);
        const existing = findUserByEmail(database, email);
        if (existing) {
          const code = existing.email_verified ? 'ACCOUNT_EXISTS' : 'EMAIL_NOT_VERIFIED';
          return sendJson(response, 409, { error: existing.email_verified ? 'An account already exists for this email.' : 'This email is waiting for verification. Enter the 6-digit code or resend.', code }, origin);
        }
        const passwordHash = await hashPassword(body.password);
        createdUser = createUser(database, { name, email, passwordHash, role: initialRoleForEmail(email), emailVerified: false, authProvider: 'password' });
        await issueVerification(request, createdUser);
        trackEvent(database, { userId: createdUser.id, eventType: 'verification_sent' });
        return sendJson(response, 201, { requiresVerification: true, otpEnabled: true, email }, origin);
      } catch (error) {
        if (createdUser) deleteUser(database, createdUser.id);
        if (error.message === 'PASSWORD_LENGTH') return sendJson(response, 400, { error: 'Password must be 8–128 characters.' }, origin);
        return sendJson(response, 502, { error: 'Could not send the verification email. Please try again.', code: 'EMAIL_SEND_FAILED' }, origin);
      }
    }

    if (request.method === 'POST' && path === '/api/auth/verify-code') {
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const code = String(body.code || '').replace(/\s+/g, '');
      if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
        return sendJson(response, 400, { error: 'Enter the 6-digit verification code.' }, origin);
      }
      const existing = findUserByEmail(database, email);
      if (!existing || existing.disabled) {
        return sendJson(response, 400, { error: 'Verification code is invalid or expired.' }, origin);
      }
      const userRecord = consumeEmailVerificationCode(database, existing.id, hashEmailOtp(email, code));
      if (!userRecord) {
        return sendJson(response, 400, { error: 'Verification code is invalid or expired.' }, origin);
      }
      const activated = acceptAdminInviteIfPresent(userRecord);
      trackEvent(database, { userId: activated.id, eventType: 'email_verified_otp' });
      return sendJson(response, 200, { ok: true, ...startSessionFor(activated, 'login') }, origin);
    }

    if (request.method === 'GET' && path === '/api/auth/verify-email') {
      const token = String(requestUrl.searchParams.get('token') || '');
      const userRecord = token.length >= 20 ? consumeEmailVerification(database, hashToken(token)) : null;
      if (!userRecord) return sendHtml(response, 400, messagePage({ title: 'Verification link is invalid', message: 'This link is invalid or expired. Return to PathPilot and request a new verification email.', appUrl, success: false }));
      const activated = acceptAdminInviteIfPresent(userRecord);
      trackEvent(database, { userId: activated.id, eventType: 'email_verified' });
      return sendHtml(response, 200, messagePage({ title: 'Email verified', message: 'Your PathPilot account is active. Return to the app and sign in.', appUrl, success: true }));
    }

    if (request.method === 'POST' && path === '/api/auth/resend-verification') {
      if (!emailVerificationConfigured) return sendJson(response, 503, { error: 'Email verification is not configured yet.' }, origin);
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const userRecord = findUserByEmail(database, email);
      if (userRecord && !userRecord.email_verified && !userRecord.disabled) {
        try {
          await issueVerification(request, userRecord);
          trackEvent(database, { userId: userRecord.id, eventType: 'verification_resent' });
        } catch {
          return sendJson(response, 502, { error: 'Could not send the verification email. Please try again.' }, origin);
        }
      }
      return sendJson(response, 200, { ok: true, message: 'If this account is waiting for verification, a new code has been sent.' }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/forgot-password') {
      if (!emailVerificationConfigured) return sendJson(response, 503, { error: 'Password reset email is not configured yet.' }, origin);
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const userRecord = EMAIL_PATTERN.test(email) ? findUserByEmail(database, email) : null;
      if (userRecord && !userRecord.disabled && userRecord.email_verified) {
        try {
          await issuePasswordReset(request, userRecord);
          trackEvent(database, { userId: userRecord.id, eventType: 'password_reset_sent' });
        } catch {
          return sendJson(response, 502, { error: 'Could not send the password reset email. Please try again.' }, origin);
        }
      }
      return sendJson(response, 200, { ok: true, requiresResetCode: true, message: 'If an eligible account exists for that email, a password reset code and link have been sent.' }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/reset-password-code') {
      try {
        const body = await readJson(request);
        const email = normalizeEmail(body.email);
        const code = String(body.code || '').replace(/\s+/g, '');
        if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
          return sendJson(response, 400, { error: 'Reset code is invalid or expired.' }, origin);
        }
        const existing = findUserByEmail(database, email);
        if (!existing || existing.disabled) return sendJson(response, 400, { error: 'Reset code is invalid or expired.' }, origin);
        const userRecord = consumePasswordResetCode(database, existing.id, hashEmailOtp(email, code));
        if (!userRecord) return sendJson(response, 400, { error: 'Reset code is invalid or expired.' }, origin);
        const passwordHash = await hashPassword(body.password);
        setUserPasswordHash(database, userRecord.id, passwordHash);
        deleteSessionsForUser(database, userRecord.id);
        trackEvent(database, { userId: userRecord.id, eventType: 'password_reset_completed_otp' });
        return sendJson(response, 200, { ok: true }, origin);
      } catch (error) {
        return sendJson(response, 400, { error: error.message === 'PASSWORD_LENGTH' ? 'Password must be 8–128 characters.' : 'Could not reset the password.' }, origin);
      }
    }

    if (request.method === 'GET' && path === '/api/auth/reset-password') {
      const token = String(requestUrl.searchParams.get('token') || '');
      if (token.length < 20) return sendHtml(response, 400, messagePage({ title: 'Reset link is invalid', message: 'This password reset link is invalid. Request a new one from PathPilot.', appUrl, success: false }));
      return sendHtml(response, 200, passwordResetPage({ token, appUrl }));
    }

    if (request.method === 'POST' && path === '/api/auth/reset-password') {
      try {
        const body = await readJson(request);
        const token = String(body.token || '');
        if (token.length < 20) return sendJson(response, 400, { error: 'Password reset link is invalid or expired.' }, origin);
        const userRecord = consumePasswordReset(database, hashToken(token));
        if (!userRecord || userRecord.disabled) return sendJson(response, 400, { error: 'Password reset link is invalid or expired.' }, origin);
        const passwordHash = await hashPassword(body.password);
        setUserPasswordHash(database, userRecord.id, passwordHash);
        deleteSessionsForUser(database, userRecord.id);
        trackEvent(database, { userId: userRecord.id, eventType: 'password_reset_completed' });
        return sendJson(response, 200, { ok: true }, origin);
      } catch (error) {
        return sendJson(response, 400, { error: error.message === 'PASSWORD_LENGTH' ? 'Password must be 8–128 characters.' : 'Could not reset the password.' }, origin);
      }
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readJson(request);
      const userRecord = findUserByEmail(database, normalizeEmail(body.email));
      if (!userRecord || userRecord.disabled || !(await verifyPassword(body.password, userRecord.password_hash))) return sendJson(response, 401, { error: 'Email or password is incorrect.' }, origin);
      if (!userRecord.email_verified) return sendJson(response, 403, { error: 'Verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }, origin);
      return sendJson(response, 200, startSessionFor(acceptAdminInviteIfPresent(userRecord), 'login'), origin);
    }

    if (request.method === 'POST' && path === '/api/auth/google') {
      if (!googleClientId) return sendJson(response, 503, { error: 'Google sign-in is not configured.' }, origin);
      try {
        const body = await readJson(request);
        const profile = await verifyGoogleCredential(body.credential, googleClientId);
        const email = normalizeEmail(profile.email);
        let userRecord = findUserByEmail(database, email);
        if (userRecord?.disabled) return sendJson(response, 403, { error: 'This account is disabled.' }, origin);
        if (!userRecord) {
          userRecord = createUser(database, { name: profile.name, email, passwordHash: 'google-only', role: initialRoleForEmail(email), emailVerified: true, authProvider: 'google' });
          userRecord = acceptAdminInviteIfPresent(userRecord);
          return sendJson(response, 201, startSessionFor(userRecord, 'google_account_created'), origin);
        }
        if (!userRecord.email_verified) userRecord = setUserEmailVerified(database, userRecord.id, true);
        userRecord = acceptAdminInviteIfPresent(userRecord);
        return sendJson(response, 200, startSessionFor(userRecord, 'google_login'), origin);
      } catch {
        return sendJson(response, 401, { error: 'Google sign-in could not be verified.' }, origin);
      }
    }

    if (request.method === 'GET' && path === '/api/auth/me') {
      const user = currentUser(request);
      return user ? sendJson(response, 200, { user }, origin) : sendJson(response, 401, { error: 'Not signed in.' }, origin);
    }

    if (request.method === 'POST' && path === '/api/auth/logout') {
      const token = getBearerToken(request);
      if (token) deleteSession(database, hashToken(token));
      return sendJson(response, 200, { ok: true }, origin);
    }

    // Support Tickets & Two-Way Messaging Endpoints
    if (request.method === 'POST' && path === '/api/support/tickets') {
      const body = await readJson(request);
      const user = currentUser(request);
      const requesterName = String(body.name || user?.name || '').trim().slice(0, 80);
      const requesterEmail = normalizeEmail(body.email || user?.email || '');
      const subject = String(body.subject || '').trim().slice(0, 160);
      const message = String(body.message || '').trim().slice(0, 4000);
      if (requesterName.length < 2 || !EMAIL_PATTERN.test(requesterEmail)) {
        return sendJson(response, 400, { error: 'Valid name and email are required.' }, origin);
      }
      if (subject.length < 3 || message.length < 5) {
        return sendJson(response, 400, { error: 'Subject and message details are required.' }, origin);
      }
      const ticket = createSupportTicketRecord(database, {
        userId: user?.id || null,
        requesterName,
        requesterEmail,
        category: body.category,
        priority: body.priority,
        subject,
        message,
      });
      trackEvent(database, { userId: user?.id || null, eventType: 'support_ticket_created', metadata: { ticketId: ticket.id } });
      const emailDelivered = await dispatchTicketNotifications(ticket, message, false);
      return sendJson(response, 201, { ok: true, ticket, emailDelivered, supportEmail }, origin);
    }

    if (request.method === 'GET' && path === '/api/support/tickets') {
      const user = currentUser(request);
      const queryEmail = normalizeEmail(requestUrl.searchParams.get('email') || user?.email || '');
      const ticketId = String(requestUrl.searchParams.get('ticketId') || '').trim();
      const tickets = listSupportTicketRecords(database, { requesterEmail: queryEmail, ticketId });
      return sendJson(response, 200, { tickets }, origin);
    }

    if (request.method === 'POST' && path === '/api/support/tickets/reply') {
      const body = await readJson(request);
      const user = currentUser(request);
      const ticketId = String(body.ticketId || '').trim();
      const message = String(body.message || '').trim().slice(0, 4000);
      if (!ticketId || message.length < 2) {
        return sendJson(response, 400, { error: 'Ticket ID and reply message are required.' }, origin);
      }
      const target = findSupportTicketById(database, ticketId);
      if (!target) return sendJson(response, 404, { error: 'Support ticket not found.' }, origin);
      const isStaff = Boolean(user && (user.role === 'admin' || user.isOwner));
      const senderEmail = normalizeEmail(body.senderEmail || user?.email || '');
      if (!isStaff && senderEmail !== normalizeEmail(target.requester_email)) {
        return sendJson(response, 403, { error: 'Not authorized to reply to this ticket.' }, origin);
      }
      const updated = appendSupportMessageRecord(database, {
        ticketId: target.id,
        senderRole: user?.isOwner ? 'owner' : isStaff ? 'support' : 'user',
        senderName: isStaff ? (user.name || 'PathPilot Support') : (String(body.senderName || user?.name || target.requester_name).slice(0, 80)),
        senderEmail: isStaff ? supportEmail : target.requester_email,
        body: message,
      });
      const emailDelivered = await dispatchTicketNotifications(updated, message, isStaff);
      return sendJson(response, 200, { ok: true, ticket: updated, emailDelivered }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/tickets') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { tickets: listSupportTicketRecords(database, { all: true, limit: 200 }) }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/tickets/status') {
      if (!requireAdmin(request, response, origin)) return;
      const body = await readJson(request);
      const ticketId = String(body.ticketId || '').trim();
      const status = String(body.status || '').trim();
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return sendJson(response, 400, { error: 'Invalid ticket status.' }, origin);
      }
      const updated = setSupportTicketStatusRecord(database, ticketId, status);
      if (!updated) return sendJson(response, 404, { error: 'Support ticket not found.' }, origin);
      return sendJson(response, 200, { ok: true, ticket: updated }, origin);
    }

    if (request.method === 'POST' && path === '/api/events') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackEvent(database, { userId: user?.id || null, anonymousId: String(body.anonymousId || '').slice(0, 80) || null, eventType: String(body.eventType || 'unknown').slice(0, 60), workspace: VALID_MODES.has(body.workspace) ? body.workspace : null, tool: String(body.tool || '').slice(0, 60) || null, metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/feedback') {
      const body = await readJson(request);
      const user = currentUser(request);
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendJson(response, 400, { error: 'Rating must be from 1 to 5.' }, origin);
      createFeedback(database, { userId: user?.id || null, rating, message: String(body.message || '').slice(0, 2000), workspace: body.workspace, tool: body.tool });
      return sendJson(response, 201, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/client-errors') {
      const body = await readJson(request);
      const user = currentUser(request);
      trackClientError(database, { userId: user?.id || null, message: String(body.message || 'Unknown error').slice(0, 1000), context: String(body.context || '').slice(0, 2000) });
      return sendJson(response, 202, { ok: true }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/summary') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { summary: getAdminSummary(database, aiConfigured) }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/users') {
      if (!requireAdmin(request, response, origin)) return;
      const users = listUsers(database).map((item) => ({ ...item, isOwner: isProtectedOwnerEmail(item.email, env), emailVerified: Boolean(item.email_verified) }));
      return sendJson(response, 200, { users }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/invites') {
      if (!requireOwner(request, response, origin)) return;
      return sendJson(response, 200, { invites: listAdminInvites(database) }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/invites') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      if (!EMAIL_PATTERN.test(email)) return sendJson(response, 400, { error: 'Enter a valid email address.' }, origin);
      if ((ownerEmail && email === ownerEmail) || isProtectedOwnerEmail(email, env)) return sendJson(response, 400, { error: 'This is already the protected owner account.' }, origin);
      const existing = findUserByEmail(database, email);
      if (existing) {
        const user = setUserRole(database, existing.id, 'admin');
        trackEvent(database, { userId: user.id, eventType: 'admin_granted_by_owner' });
        return sendJson(response, 200, { status: 'admin_granted', user: { ...user, emailVerified: Boolean(user.email_verified) } }, origin);
      }
      const invite = upsertAdminInvite(database, { email, invitedBy: owner.id });
      trackEvent(database, { userId: owner.id, eventType: 'admin_invite_created', metadata: { email } });
      return sendJson(response, 201, { status: 'invite_created', invite }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/invites/revoke') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      revokeAdminInvite(database, email);
      trackEvent(database, { userId: owner.id, eventType: 'admin_invite_revoked', metadata: { email } });
      return sendJson(response, 200, { ok: true }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/users/role') {
      if (!requireOwner(request, response, origin)) return;
      const body = await readJson(request);
      const role = String(body.role || '');
      if (!['user', 'admin'].includes(role)) return sendJson(response, 400, { error: 'Invalid role.' }, origin);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) return sendJson(response, 404, { error: 'User not found.' }, origin);
      if (((ownerEmail && normalizeEmail(target.email) === ownerEmail) || isProtectedOwnerEmail(target.email, env)) && role !== 'admin') return sendJson(response, 400, { error: 'The owner account cannot be demoted.' }, origin);
      const user = setUserRole(database, target.id, role);
      trackEvent(database, { userId: user.id, eventType: role === 'admin' ? 'admin_granted' : 'admin_removed' });
      return sendJson(response, 200, { user: { ...user, isOwner: isProtectedOwnerEmail(user.email, env), emailVerified: Boolean(user.email_verified) } }, origin);
    }

    if (request.method === 'POST' && path === '/api/admin/users/delete') {
      const owner = requireOwner(request, response, origin);
      if (!owner) return;
      const body = await readJson(request);
      const target = findUserById(database, String(body.userId || ''));
      if (!target) return sendJson(response, 404, { error: 'User not found.' }, origin);
      if ((ownerEmail && normalizeEmail(target.email) === ownerEmail) || isProtectedOwnerEmail(target.email, env)) return sendJson(response, 400, { error: 'The protected owner account cannot be deleted.' }, origin);
      const deleted = { id: target.id, email: target.email, name: target.name };
      deleteUser(database, target.id);
      trackEvent(database, { userId: owner.id, eventType: 'user_deleted_by_owner', metadata: { email: deleted.email } });
      return sendJson(response, 200, { ok: true, deleted }, origin);
    }

    if (request.method === 'GET' && path === '/api/admin/api-usage') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { requests: listAiRequests(database) }, origin);
    }
    if (request.method === 'GET' && path === '/api/admin/errors') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { errors: listErrors(database) }, origin);
    }
    if (request.method === 'GET' && path === '/api/admin/feedback') {
      if (!requireAdmin(request, response, origin)) return;
      return sendJson(response, 200, { feedback: listFeedback(database) }, origin);
    }

    if (request.method === 'POST' && path === '/api/assistant') {
      if (!aiConfigured) return sendJson(response, 503, { error: 'Live AI is not configured. The frontend will continue using Smart Demo mode.' }, origin);
      const startedAt = Date.now();
      const user = currentUser(request);
      let mode = 'general';
      let tool = 'ask';
      try {
        const body = await readJson(request);
        const prompt = String(body.prompt || '').trim();
        mode = VALID_MODES.has(body.mode) ? body.mode : 'general';
        tool = String(body.tool || 'ask').slice(0, 60);
        if (prompt.length < 2 || prompt.length > 12_000) return sendJson(response, 400, { error: 'Prompt length is invalid.' }, origin);
        const providerResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildProviderRequest({ apiMode, model, prompt, mode, tool, preferences: body.preferences || {}, reasoningEffort })),
          signal: AbortSignal.timeout(60_000),
        });
        const providerPayload = await providerResponse.json();
        if (!providerResponse.ok) throw new Error(`PROVIDER_${providerResponse.status}`);
        const answer = extractProviderText(providerPayload, apiMode);
        if (!answer) throw new Error('EMPTY_RESPONSE');
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'success', latencyMs: Date.now() - startedAt });
        trackEvent(database, { userId: user?.id || null, eventType: 'tool_request', workspace: mode, tool, metadata: { source: 'live' } });
        return sendJson(response, 200, { answer }, origin);
      } catch (error) {
        trackAiRequest(database, { userId: user?.id || null, workspace: mode, tool, model, status: 'error', latencyMs: Date.now() - startedAt, errorCode: error.message.slice(0, 80) });
        return sendJson(response, 502, { error: 'The AI provider could not complete the request.' }, origin);
      }
    }

    return sendJson(response, 404, { error: 'Not found.' }, origin);
  }

  const safeHandle = async (request, response) => {
    try {
      await handle(request, response);
    } catch {
      if (!response.headersSent) sendJson(response, 400, { error: 'Invalid request.' }, request.headers.origin || '');
      else response.end();
    }
  };

  return { handle: safeHandle, database, aiConfigured };
}

if (process.argv[1]?.endsWith('server/index.js')) {
  const databasePath = process.env.DATABASE_PATH || 'server/data/pathpilot.sqlite';
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const app = createPathPilotServer({ database: initializeDatabase(databasePath) });
  const port = Number(process.env.PORT || 8787);
  createServer(app.handle).listen(port, () => console.log(`PathPilot platform listening on port ${port}`));
}
