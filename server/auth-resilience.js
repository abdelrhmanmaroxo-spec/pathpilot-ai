import { createSessionToken, hashPassword, hashToken, normalizeEmail } from './lib/auth.js';
import {
  createEmailVerification,
  createUser,
  findPendingAdminInvite,
  findUserByEmail,
  trackEvent,
} from './lib/database.js';
import {
  getEmailDeliveryFailureCode,
  getEmailDeliveryMode,
  sendVerificationEmail,
} from './lib/email.js';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

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

function safeDeliveryMessage(mode) {
  if (mode === 'sandbox') {
    return 'Account created and saved, but email delivery is currently in test mode. The account is waiting for verification.';
  }
  if (mode === 'gmail-smtp') {
    return 'Account created and saved, but Gmail could not deliver the verification message yet. Check the mail settings and retry verification.';
  }
  return 'Account created and saved, but the verification email could not be delivered yet. You can retry verification later.';
}

export function createAuthResilience({
  database,
  env = process.env,
  sendJson,
  allowedOrigins,
  emailSender = sendVerificationEmail,
} = {}) {
  const ownerEmail = normalizeEmail(env.OWNER_EMAIL || env.ADMIN_EMAIL);
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  const emailFrom = String(env.EMAIL_FROM || '').trim();
  const emailProvider = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const smtp = {
    host: String(env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(env.SMTP_PORT || 465),
    secure: String(env.SMTP_SECURE || 'true').trim().toLowerCase() === 'true',
    user: String(env.SMTP_USER || '').trim(),
    pass: String(env.SMTP_PASS || '').replace(/\s+/g, ''),
  };
  const smtpConfigured = ['gmail', 'smtp'].includes(emailProvider) && Boolean(smtp.host && smtp.user && smtp.pass && emailFrom);
  const resendConfigured = Boolean(apiKey && emailFrom);
  const configured = smtpConfigured || resendConfigured;
  const deliveryMode = getEmailDeliveryMode(emailFrom, emailProvider);

  function roleFor(email) {
    if (ownerEmail && email === ownerEmail) return 'admin';
    return findPendingAdminInvite(database, email) ? 'admin' : 'user';
  }

  async function issueVerification(request, userRecord) {
    const token = createSessionToken();
    createEmailVerification(database, {
      tokenHash: hashToken(token),
      userId: userRecord.id,
      hours: 24,
    });
    const apiOrigin = requestOrigin(request);
    if (!apiOrigin) throw new Error('PUBLIC_API_ORIGIN');
    await emailSender({
      apiKey,
      from: emailFrom,
      to: userRecord.email,
      name: userRecord.name,
      verificationUrl: `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      provider: emailProvider,
      smtp,
    });
  }

  return async function handleAuthResilience(request, response, origin, path) {
    if (request.method === 'POST' && path === '/api/auth/register') {
      if (!configured) {
        sendJson(response, 503, {
          error: 'Email verification is not configured yet.',
          code: 'EMAIL_VERIFICATION_NOT_CONFIGURED',
        }, origin, allowedOrigins);
        return true;
      }

      let body;
      try {
        body = await readJson(request);
      } catch {
        sendJson(response, 400, { error: 'Invalid request.' }, origin, allowedOrigins);
        return true;
      }

      const name = String(body.name || '').trim().slice(0, 60);
      const email = normalizeEmail(body.email);
      if (name.length < 2 || !EMAIL_PATTERN.test(email)) {
        sendJson(response, 400, { error: 'Name or email is invalid.' }, origin, allowedOrigins);
        return true;
      }

      const existing = findUserByEmail(database, email);
      if (existing) {
        const code = existing.email_verified ? 'ACCOUNT_EXISTS' : 'EMAIL_NOT_VERIFIED';
        sendJson(response, 409, {
          error: existing.email_verified
            ? 'An account already exists for this email.'
            : 'This email is waiting for verification. Use resend verification.',
          code,
          requiresVerification: !existing.email_verified,
          email,
        }, origin, allowedOrigins);
        return true;
      }

      let passwordHash;
      try {
        passwordHash = await hashPassword(body.password);
      } catch (error) {
        sendJson(response, 400, {
          error: error?.message === 'PASSWORD_LENGTH'
            ? 'Password must be 8–128 characters.'
            : 'Could not create the account.',
        }, origin, allowedOrigins);
        return true;
      }

      let userRecord;
      try {
        userRecord = createUser(database, {
          name,
          email,
          passwordHash,
          role: roleFor(email),
          emailVerified: false,
          authProvider: 'password',
        });
        trackEvent(database, { userId: userRecord.id, eventType: 'pending_account_created' });
      } catch {
        sendJson(response, 500, { error: 'Could not create the account.' }, origin, allowedOrigins);
        return true;
      }

      try {
        await issueVerification(request, userRecord);
        trackEvent(database, {
          userId: userRecord.id,
          eventType: 'verification_sent',
          metadata: { mode: deliveryMode },
        });
        sendJson(response, 201, {
          requiresVerification: true,
          deliveryPending: false,
          deliveryMode,
          email,
        }, origin, allowedOrigins);
      } catch (error) {
        const deliveryCode = getEmailDeliveryFailureCode(error, emailFrom, emailProvider);
        trackEvent(database, {
          userId: userRecord.id,
          eventType: 'verification_delivery_failed',
          metadata: { code: deliveryCode, mode: deliveryMode },
        });
        sendJson(response, 202, {
          requiresVerification: true,
          deliveryPending: true,
          deliveryCode,
          deliveryMode,
          email,
          message: safeDeliveryMessage(deliveryMode),
        }, origin, allowedOrigins);
      }
      return true;
    }

    if (request.method === 'POST' && path === '/api/auth/resend-verification') {
      if (!configured) {
        sendJson(response, 503, {
          error: 'Email verification is not configured yet.',
          code: 'EMAIL_VERIFICATION_NOT_CONFIGURED',
        }, origin, allowedOrigins);
        return true;
      }

      let body;
      try {
        body = await readJson(request);
      } catch {
        sendJson(response, 400, { error: 'Invalid request.' }, origin, allowedOrigins);
        return true;
      }

      const email = normalizeEmail(body.email);
      const userRecord = EMAIL_PATTERN.test(email) ? findUserByEmail(database, email) : null;
      let deliveryPending = deliveryMode === 'sandbox';
      if (userRecord && !userRecord.email_verified && !userRecord.disabled) {
        try {
          await issueVerification(request, userRecord);
          deliveryPending = false;
          trackEvent(database, {
            userId: userRecord.id,
            eventType: 'verification_resent',
            metadata: { mode: deliveryMode },
          });
        } catch (error) {
          deliveryPending = true;
          trackEvent(database, {
            userId: userRecord.id,
            eventType: 'verification_resend_failed',
            metadata: { code: getEmailDeliveryFailureCode(error, emailFrom, emailProvider), mode: deliveryMode },
          });
        }
      }

      sendJson(response, 202, {
        ok: true,
        deliveryPending,
        deliveryMode,
        message: 'If this account is waiting for verification, a delivery attempt has been made.',
      }, origin, allowedOrigins);
      return true;
    }

    return false;
  };
}
