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

async function sendSmtpEmail({ host, port, secure, user, pass, from, to, replyTo, subject, html }) {
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

    const encodedSubject = `=?UTF-8?B?${Buffer.from(cleanHeader(subject), 'utf8').toString('base64')}?=`;
    const messageId = `<${Date.now()}.${Math.random().toString(16).slice(2)}@pathpilot.local>`;
    const headers = [
      `From: ${cleanHeader(from)}`,
      `To: ${toAddress}`,
      ...(replyTo ? [`Reply-To: ${cleanHeader(replyTo)}`] : []),
      `Subject: ${encodedSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(html),
    ];
    const body = headers.join('\r\n').replace(/\r\n\./g, '\r\n..');

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

async function sendGmailApiEmail({ clientId, clientSecret, refreshToken, from, to, replyTo, subject, html }) {
  const accessToken = await getGmailApiAccessToken({ clientId, clientSecret, refreshToken });
  const fromAddress = mailbox(from);
  const toAddress = mailbox(to) || cleanHeader(to);
  if (!fromAddress || !toAddress) throw new Error('GMAIL_API_INVALID_ADDRESS');

  const encodedSubject = `=?UTF-8?B?${Buffer.from(cleanHeader(subject), 'utf8').toString('base64')}?=`;
  const rawMessage = [
    `From: ${cleanHeader(from)}`,
    `To: ${toAddress}`,
    ...(replyTo ? [`Reply-To: ${cleanHeader(replyTo)}`] : []),
    `Subject: ${encodedSubject}`,
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

async function sendResendEmail({ apiKey, from, to, replyTo, subject, html, tag }) {
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
      ...(replyTo ? { reply_to: replyTo } : {}),
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

export async function sendEmail({ apiKey, from, to, replyTo, subject, html, tag = 'general', provider, smtp, gmailApi }) {
  const mode = getEmailDeliveryMode(from, provider);
  if (mode === 'gmail-api') {
    const config = gmailApi || {};
    return sendGmailApiEmail({
      clientId: config.clientId || process.env.GMAIL_CLIENT_ID || '',
      clientSecret: config.clientSecret || process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: config.refreshToken || process.env.GMAIL_REFRESH_TOKEN || '',
      from,
      to,
      replyTo,
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
      replyTo,
      subject,
      html,
    });
  }
  return sendResendEmail({ apiKey, from, to, replyTo, subject, html, tag });
}

export async function sendVerificationEmail({ apiKey, from, to, name, verificationUrl, verificationCode, provider, smtp, gmailApi }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl || '');
  const safeCode = escapeHtml(verificationCode || '');
  const codeBlock = safeCode ? `
    <div style="margin:22px 0;padding:18px;background:#f5f3ff;border:2px dashed #6d5dfc;border-radius:14px;text-align:center">
      <div style="font-size:12px;color:#4b5563;margin-bottom:6px">كود التفعيل السريع · Verification Code</div>
      <div style="font-size:32px;font-weight:900;letter-spacing:8px;color:#4f46e5;font-family:monospace">${safeCode}</div>
    </div>
  ` : '';
  return sendEmail({
    apiKey,
    from,
    to,
    provider,
    smtp,
    gmailApi,
    subject: safeCode ? `كود تفعيل PathPilot AI: ${safeCode}` : 'Verify your PathPilot email',
    tag: 'verify_email',
    html: `
      <div style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">تفعيل حسابك · Verify your email</h1>
        <p>Hi ${safeName},</p>
        <p>أدخل كود التفعيل المكون من 6 أرقام داخل المنصة، أو اضغط زر التفعيل أدناه (صالح لمدة 24 ساعة):</p>
        ${codeBlock}
        ${safeUrl ? `<p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Verify email · تفعيل بالرابط</a></p>` : ''}
        <p style="font-size:13px;color:#6b7280">If you cannot find this message, check Spam, Junk, or Promotions and mark PathPilot (pathpilot.app00@gmail.com) as trusted.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ apiKey, from, to, name, resetUrl, resetCode, provider, smtp, gmailApi }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl || '');
  const safeCode = escapeHtml(resetCode || '');
  const codeBlock = safeCode ? `
    <div style="margin:20px 0;padding:16px;background:#f5f3ff;border:2px dashed #6d5dfc;border-radius:14px;text-align:center">
      <div style="font-size:12px;color:#4b5563;margin-bottom:6px">كود الاستعادة · Reset Code</div>
      <div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#4f46e5;font-family:monospace">${safeCode}</div>
    </div>
  ` : '';
  return sendEmail({
    apiKey,
    from,
    to,
    provider,
    smtp,
    gmailApi,
    subject: safeCode ? `كود استعادة كلمة المرور PathPilot: ${safeCode}` : 'Reset your PathPilot password',
    tag: 'password_reset',
    html: `
      <div style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">Reset your password · استعادة كلمة المرور</h1>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your PathPilot password. Valid for 30 minutes.</p>
        ${codeBlock}
        ${safeUrl ? `<p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Reset password</a></p>` : ''}
        <p style="font-size:13px;color:#6b7280">If you did not request this reset, ignore this message.</p>
      </div>
    `,
  });
}

export async function sendSupportTicketEmail({
  apiKey,
  from,
  to,
  replyTo,
  ticket,
  messageText,
  isStaffReply = false,
  isOwnerAlert = false,
  provider,
  smtp,
  gmailApi,
}) {
  const safeId = escapeHtml(ticket?.id || '');
  const safeSubject = escapeHtml(ticket?.subject || '');
  const safeName = escapeHtml(ticket?.requester_name || '');
  const safeRequesterEmail = escapeHtml(ticket?.requester_email || '');
  const safeBody = escapeHtml(messageText || '');
  const subject = isOwnerAlert
    ? `[Owner Support Alert #${ticket?.id}] ${ticket?.subject}`
    : isStaffReply
      ? `[PathPilot #${ticket?.id}] رد الدعم الفني: ${ticket?.subject}`
      : `[PathPilot #${ticket?.id}] تم فتح تذكرة الدعم: ${ticket?.subject}`;

  return sendEmail({
    apiKey,
    from,
    to,
    replyTo,
    provider,
    smtp,
    gmailApi,
    subject,
    tag: 'support_ticket',
    html: `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:580px;margin:auto;padding:26px;color:#111827;border:1px solid #e5e7eb;border-radius:16px">
        <h2 style="margin:0 0 12px;color:#4f46e5">${isOwnerAlert ? `تذكرة دعم جديدة #${safeId}` : isStaffReply ? `رد جديد من الدعم الفني #${safeId}` : `تم استلام تذكرتك #${safeId}`}</h2>
        <p><strong>صاحب التذكرة:</strong> ${safeName} (${safeRequesterEmail})</p>
        <p><strong>الموضوع:</strong> ${safeSubject}</p>
        <div style="margin:18px 0;padding:16px;background:#f8fafc;border-right:4px solid #6d5dfc;border-radius:10px;white-space:pre-wrap;line-height:1.7">${safeBody}</div>
        <p style="font-size:13px;color:#6b7280">بريد الدعم الرسمي: pathpilot.app00@gmail.com</p>
      </div>
    `,
  });
}
