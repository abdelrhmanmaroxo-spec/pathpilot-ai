export default function AdminSystemStatus({ status }) {
  return (
    <section className="provider-panel" aria-label="System status">
      <div><span className={status?.apiOnline ? 'provider-dot online' : 'provider-dot'} /><div><small>AI Provider</small><strong>{status?.provider || 'Not configured'}</strong><small>{status?.model || 'Waiting for model'}</small></div></div>
      <div><small>API Status</small><strong>{status?.apiOnline ? 'Online' : 'Offline'}</strong></div>
      <div><small>Database</small><strong>{status?.databaseOnline ? 'Online' : 'Offline'}</strong></div>
      <div><small>Email Verification</small><strong>{status?.emailVerificationAvailable ? 'Ready' : 'Not configured'}</strong></div>
      <div><small>Google Sign-In</small><strong>{status?.googleAuthAvailable ? 'Ready' : 'Not configured'}</strong></div>
    </section>
  );
}
