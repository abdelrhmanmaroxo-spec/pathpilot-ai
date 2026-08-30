const UNKNOWN_IP = 'unknown';

export function getClientIp(request) {
  const forwarded = String(request?.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  // PathPilot runs behind Railway's reverse proxy in production. Use the
  // right-most forwarded address so a client-supplied fake value placed at
  // the start of X-Forwarded-For cannot win over the proxy-appended address.
  const value = forwarded.at(-1)
    || String(request?.headers?.['x-real-ip'] || '').trim()
    || String(request?.headers?.['cf-connecting-ip'] || '').trim()
    || String(request?.socket?.remoteAddress || '').trim()
    || UNKNOWN_IP;

  return value.replace(/^::ffff:/, '').slice(0, 80) || UNKNOWN_IP;
}

export function getUserAgent(request) {
  return String(request?.headers?.['user-agent'] || '').trim().slice(0, 500);
}

export function describeClientDevice(userAgent, platform = '') {
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

export function visitorSecurityMetadata(request) {
  const userAgent = getUserAgent(request);
  return {
    ip: getClientIp(request),
    userAgent,
    device: describeClientDevice(userAgent),
    recordedAt: new Date().toISOString(),
  };
}
