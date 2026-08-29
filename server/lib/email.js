function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendVerificationEmail({ apiKey, from, to, name, verificationUrl }) {
  if (!apiKey || !from) throw new Error('EMAIL_NOT_CONFIGURED');

  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(verificationUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Verify your PathPilot email',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#111827">
          <h1 style="margin:0 0 16px">Verify your email</h1>
          <p>Hi ${safeName},</p>
          <p>Confirm this email address to activate your PathPilot account. This link expires in 24 hours.</p>
          <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700">Verify email</a></p>
          <p style="font-size:13px;color:#6b7280">If you did not create a PathPilot account, you can ignore this message.</p>
        </div>
      `,
      tags: [{ name: 'category', value: 'verify_email' }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`EMAIL_SEND_FAILED:${response.status}:${payload.slice(0, 200)}`);
  }

  return response.json().catch(() => ({}));
}
