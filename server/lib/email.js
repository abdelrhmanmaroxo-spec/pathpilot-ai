function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendEmail({ apiKey, from, to, subject, html, tag }) {
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

export async function sendVerificationEmail({ apiKey, from, to, name, verificationUrl }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl);
  return sendEmail({
    apiKey,
    from,
    to,
    subject: 'Verify your PathPilot email',
    tag: 'verify_email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">Verify your email</h1>
        <p>Hi ${safeName},</p>
        <p>Confirm this email address to activate your PathPilot account. This link expires in 24 hours.</p>
        <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Verify email</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not create a PathPilot account, you can ignore this message.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ apiKey, from, to, name, resetUrl }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail({
    apiKey,
    from,
    to,
    subject: 'Reset your PathPilot password',
    tag: 'password_reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
        <h1 style="margin:0 0 16px">Reset your password</h1>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your PathPilot password. This link expires in 30 minutes and can only be used once.</p>
        <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Reset password</a></p>
        <p style="font-size:13px;color:#6b7280">If you did not request this reset, ignore this message. Your password will stay unchanged.</p>
      </div>
    `,
  });
}
