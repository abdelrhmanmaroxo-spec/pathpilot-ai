function filled(value) {
  return Boolean(String(value || '').trim());
}

function emailReadiness(env) {
  const provider = String(env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const from = filled(env.EMAIL_FROM);
  if (provider === 'gmail-api' || provider === 'gmailapi') {
    const missing = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'].filter((key) => !filled(env[key]));
    return { provider: 'gmail-api', configured: from && missing.length === 0, missing: from ? missing : ['EMAIL_FROM', ...missing] };
  }
  if (provider === 'gmail' || provider === 'smtp') {
    const missing = ['SMTP_USER', 'SMTP_PASS'].filter((key) => !filled(env[key]));
    return { provider: 'gmail-smtp', configured: from && missing.length === 0, missing: from ? missing : ['EMAIL_FROM', ...missing] };
  }
  const missing = ['RESEND_API_KEY'].filter((key) => !filled(env[key]));
  return { provider: 'resend', configured: from && missing.length === 0, missing: from ? missing : ['EMAIL_FROM', ...missing] };
}

export function inspectRuntimeConfig(env = process.env) {
  const production = String(env.NODE_ENV || '').toLowerCase() === 'production' || filled(env.RAILWAY_ENVIRONMENT);
  const errors = [];
  const warnings = [];
  const email = emailReadiness(env);
  const aiKey = filled(env.AI_API_KEY);
  const aiModel = filled(env.AI_MODEL);
  const aiConfigured = aiKey && aiModel;
  const databasePath = String(env.DATABASE_PATH || '').trim();
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  const port = Number(env.PORT || 8787);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) errors.push('PORT_INVALID');
  if (production && !databasePath) errors.push('DATABASE_PATH_REQUIRED_IN_PRODUCTION');
  if (production && databasePath === ':memory:') errors.push('DATABASE_PATH_MUST_BE_PERSISTENT_IN_PRODUCTION');
  if (production && !allowedOrigins.length) errors.push('ALLOWED_ORIGINS_REQUIRED_IN_PRODUCTION');
  if (aiKey !== aiModel) warnings.push('AI_CONFIGURATION_INCOMPLETE');
  if (!filled(env.TAVILY_API_KEY)) warnings.push('TAVILY_NOT_CONFIGURED');
  if (!email.configured) warnings.push(`EMAIL_CONFIGURATION_INCOMPLETE:${email.missing.join(',')}`);
  if (!filled(env.OWNER_EMAIL) && !filled(env.ADMIN_EMAIL)) warnings.push('OWNER_EMAIL_NOT_CONFIGURED');
  if (!filled(env.GOOGLE_CLIENT_ID)) warnings.push('GOOGLE_SIGN_IN_NOT_CONFIGURED');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    features: {
      ai: aiConfigured,
      research: filled(env.TAVILY_API_KEY),
      email: email.configured,
      emailProvider: email.provider,
      googleSignIn: filled(env.GOOGLE_CLIENT_ID),
      persistentDatabase: Boolean(databasePath && databasePath !== ':memory:'),
    },
  };
}

export function assertRuntimeConfig(env = process.env) {
  const report = inspectRuntimeConfig(env);
  if (!report.ok) {
    const error = new Error(`INVALID_RUNTIME_CONFIG:${report.errors.join(',')}`);
    error.code = 'INVALID_RUNTIME_CONFIG';
    error.report = report;
    throw error;
  }
  return report;
}

export function logRuntimeConfig(report, logger = console) {
  const enabled = Object.entries(report.features)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
    .join(', ') || 'core';
  logger.info?.(`[PathPilot config] enabled: ${enabled}; email=${report.features.emailProvider}`);
  for (const warning of report.warnings) logger.warn?.(`[PathPilot config] ${warning}`);
}
