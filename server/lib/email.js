import { connect as connectTls } from 'node:tls';

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cleanHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function mailbox(value) {
  const text = cleanHeader(value);
  const angle = text.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angle) return angle[1];
  const plain = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return plain?.[0] || '';
}

function base64Lines(value) {
  const encoded = Buffer.from(String(value), 'utf8').toString('base64');
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function base64Url(value) {
  return Buffer.from(String(value), 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

export function getEmailDeliveryMode(from, provider = process.env.EMAIL_PROVIDER) {
  const selected = String(provider || '').trim().toLowerCase();
  if (selected === 'gmail-api' || selected === 'gmailapi') return 'gmail-api';
  if (selected === 'gmail' || selected === 'smtp') return 'gmail-smtp';
  const value = String(from || '').toLowerCase();
  if (!value) return 'unconfigured';
  if (value.includes('@resend.dev')) return 'sandbox';
  return 'custom-domain';
}

export function getEmailDeliveryFailureCode(error, from, provider = process.env.EMAIL_PROVIDER) {
  const message = String(error?.message || '').toLowerCase();
  const mode = getEmailDeliveryMode(from, provider);
  if (mode === 'sandbox' || message.includes('testing emails') || message.includes('resend.dev')) return 'EMAIL_SANDBOX_RESTRICTED';
  if (message.includes('gmail_token_400') || message.includes('gmail_token_401') || message.includes('gmail_api_401') || message.includes('gmail_api_403')) return 'EMAIL_PROVIDER_AUTH';
  if (message.includes('smtp_auth') || message.includes('535') || message.includes('534')) return 'EMAIL_PROVIDER_AUTH';
  if (message.includes(':401:') || message.includes(':403:')) return 'EMAIL_PROVIDER_AUTH';
  if (message.includes('timeout') || message.includes('etimedout')) return 'EMAIL_PROVIDER_TIMEOUT';
  return 'EMAIL_DELIVERY_FAILED';
}

function createSmtpReader(socket) {
  let buffer = '';
  let current = [];
  const ready = [];
  const waiters = [];
  let terminalError = null;

  const flush = (response) => {
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(response);
    else ready.push(response);
  };

  const fail = (error) => {
    terminalError = error instanceof Error ? error : new Error(String(error || 'SMTP_CONNECTION_FAILED'));
    while (waiters.length) waiters.shift().reject(terminalError);
  };

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    while (buffer.includes('\r\n')) {
      const index = buffer.indexOf('\r\n');
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      current.push(line);
      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        flush({ code, text: current.join('\n') });
        current = [];
      }
    }
  });
  socket.on('error', fail);
  socket.on('close', () => {
    if (!terminalError && waiters.length) fail(new Error('SMTP_CONNECTION_CLOSED'));
  });

  return {
    next() {
      if (ready.length) return Promise.resolve(ready.shift());
      if (terminalError) return Promise.reject(terminalError);
      return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },
  };
}

async function expectResponse(reader, expected, label) {
  const response = await reader.next();
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(response.code)) throw new Error(`${label}_${response.code}:${response.text.slice(0, 180)}`);
  return response;
}

function writeLine(socket, value) {
  socket.write(`${value}\r\n`);
}

async function sendSmtpEmail({ host, port, secure, user, pass, from, to, subject, html }) {
  if (!host || !user || !pass || !from) throw new Error('SMTP_NOT_CONFIGURED');
  if (!secure) throw new Error('SMTP_SECURE_REQUIRED');
  const fromAddress = mailbox(from) || user;
  const toAddress = mailbox(to) || cleanHeader(to);
  if (!fromAddress || !toAddress) throw new Error('SMTP_INVALID_ADDRESS');

  const socket = connectTls({
    host,
    port: Number(port || 465),
    servername: host,
    rejectUnauthorized: true,
  });
  socket.setTimeout(15_000, () => socket.destroy(new Error('SMTP_TIMEOUT')));
  const reader = createSmtpReader(socket);

  try {
    await expectResponse(reader, 220, 'SMTP_GREETING');
    writeLine(socket, 'EHLO pathpilot.local');
    await expectResponse(reader, 250, 'SMTP_EHLO');
    writeLine(socket, 'AUTH LOGIN');
    await expectResponse(reader, 334, 'SMTP_AUTH');
    writeLine(socket, Buffer.from(user, 'utf8').toString('base64'));
    await expectResponse(reader, 334, 'SMTP_AUTH_USER');
    writeLine(socket, Buffer.from(pass.replace(/\s+/g, ''), 'utf8').toString('base64'));
    await expectResponse(reader, 235, 'SMTP_AUTH_PASS');
    writeLine(socket, `MAIL FROM:<${fromAddress}>`);
    await expectResponse(reader, 250, 'SMTP_MAIL_FROM');
    writeLine(socket, `RCPT TO:<${toAddress}>`);
    await expectResponse(reader, [250, 251], 'SMTP_RCPT_TO');
    writeLine(socket, 'DATA');
    await expectResponse(reader, 354, 'SMTP_DATA');

    const messageId = `<${Date.now()}.${Math.random().toString(16).slice(2)}@pathpilot.local>`;
    const body = [
      `From: ${cleanHeader(from)}`,
      `To: ${toAddress}`,
      `Subject: ${cleanHeader(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(html),
    ].join('\r\n').replace(/\r\n\./g, '\r\n..');

    socket.write(`${body}\r\n.\r\n`);
    await expectResponse(reader, 250, 'SMTP_MESSAGE');
    writeLine(socket, 'QUIT');
    await expectResponse(reader, 221, 'SMTP_QUIT').catch(() => undefined);
    return { provider: 'gmail-smtp', accepted: true };
  } finally {
    socket.end();
  }
}

async function getGmailApiAccessToken({ clientId, clientSecret, refreshToken }) {
  if (!clientId || !clientSecret || !refreshToken) throw new Error('GMAIL_API_NOT_CONFIGURED');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`GMAIL_TOKEN_${response.status}:${String(payload?.error_description || payload?.error || '').slice(0, 160)}`);
  }
  return payload.access_token;
}

async function sendGmailApiEmail({ clientId, clientSecret, refreshToken, from, to, subject, html }) {
  const accessToken = await getGmailApiAccessToken({ clientId, clientSecret, refreshToken });
  const fromAddress = mailbox(from);
  const toAddress = mailbox(to) || cleanHeader(to);
  if (!fromAddress || !toAddress) throw new Error('GMAIL_API_INVALID_ADDRESS');

  const rawMessage = [
    `From: ${cleanHeader(from)}`,
    `To: ${toAddress}`,
    `Subject: ${cleanHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(html),
  ].join('\r\n');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Url(rawMessage) }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`GMAIL_API_${response.status}:${String(payload?.error?.message || '').slice(0, 180)}`);
  }
  return { provider: 'gmail-api', accepted: true, id: payload.id || null };
}

async function sendResendEmail({ apiKey, from, to, subject, html, tag }) {
  if (!apiKey || !from) throw new Error('EMAIL_NOT_CONFIGURED');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      tags: [{ name: 'category', value: tag }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`EMAIL_SEND_FAILED:${response.status}:${payload.slice(0, 200)}`);
  }

  return response.json().catch(() => ({}));
}

async function sendEmail({ apiKey, from, to, subject, html, tag, provider, smtp, gmailApi }) {
  const mode = getEmailDeliveryMode(from, provider);
  if (mode === 'gmail-api') {
    const config = gmailApi || {};
    return sendGmailApiEmail({
      clientId: config.clientId || process.env.GMAIL_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: config.refreshToken || process.env.GMAIL_REFRESH_TOKEN || '',
      from,
      to,
      subject,
      html,
    });
  }
  if (mode === 'gmail-smtp') {
    const config = smtp || {};
    return sendSmtpEmail({
      host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: config.port || process.env.SMTP_PORT || 465,
      secure: config.secure ?? String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true',
      user: config.user || process.env.SMTP_USER || '',
      pass: config.pass || process.env.SMTP_PASS || '',
      from,
      to,
      subject,
      html,
    });
  }
  return sendResendEmail({ apiKey, from, to, subject, html, tag });
}

export async function sendVerificationEmail({ apiKey, from, to, name, verificationUrl, provider, smtp, gmailApi }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl);
  return sendEmail({
    apiKey,
    from,
    to,
    provider,
    smtp,
    gmailApi,
    subject: 'Verify your PathPilot email',
    tag: 'verify_email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">Verify your email</h1>
        <p>Hi ${safeName},</p>
        <p>Confirm this email address to activate your PathPilot account. This link expires in 24 hours.</p>
        <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Verify email</a></p>
        <p style="font-size:13px;color:#6b7280">If you cannot find this message, check Spam, Junk, or Promotions and mark PathPilot as trusted.</p>
        <p style="font-size:13px;color:#6b7280">If you did not create a PathPilot account, you can ignore this message.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ apiKey, from, to, name, resetUrl, provider, smtp, gmailApi }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail({
    apiKey,
    from,
    to,
    provider,
    smtp,
    gmailApi,
    subject: 'Reset your PathPilot password',
    tag: 'password_reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">Reset your password</h1>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your PathPilot password. This link expires in 30 minutes and can only be used once.</p>
        <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Reset password</a></p>
        <p style="font-size:13px;color:#6b7280">If you cannot find this message, check Spam, Junk, or Promotions.</p>
        <p style="font-size:13px;color:#6b7280">If you did not request this reset, ignore this message. Your password will stay unchanged.</p>
      </div>
    `,
  });
}
