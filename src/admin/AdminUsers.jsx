import {
  Ban, CheckCircle2, Crown, KeyRound, MailPlus, ShieldCheck, Trash2, XCircle,
} from 'lucide-react';
import { dateTime } from './admin-utils.js';
import { EmptyAdmin } from './AdminShared.jsx';

export default function AdminUsers({
  user,
  users = [],
  pendingInvites = [],
  inviteEmail,
  inviteBusy,
  roleBusy,
  deleteBusy,
  banBusy,
  resetBusy,
  onInviteEmailChange,
  onAddAdmin,
  onRevokeInvite,
  onChangeRole,
  onResetPassword,
  onChangeBan,
  onRemoveUser,
}) {
  return (
    <section>
      {user?.isOwner && (
        <article className="usage-card" style={{ marginBottom: 18, display: 'block' }}>
          <div style={{ marginBottom: 14 }}>
            <MailPlus />
            <span>
              <strong>Add Admin by email</strong>
              <small>Existing accounts are promoted immediately. New emails receive the role after verification.</small>
            </span>
          </div>
          <form onSubmit={onAddAdmin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="email"
              required
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={onInviteEmailChange}
              style={{ flex: '1 1 260px' }}
            />
            <button type="submit" className="button button-primary" disabled={inviteBusy}>
              <MailPlus size={16} /> {inviteBusy ? 'Adding…' : 'Add Admin'}
            </button>
          </form>
          {pendingInvites.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {pendingInvites.map((invite) => (
                <div
                  key={invite.email}
                  style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 0' }}
                >
                  <span>
                    <strong>{invite.email}</strong>
                    <small style={{ display: 'block' }}>Pending admin invitation</small>
                  </span>
                  <button className="button button-ghost" type="button" onClick={() => onRevokeInvite(invite.email)}>
                    <XCircle size={15} /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      )}

      <section className="admin-table-wrap">
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Verified</th><th>Status</th>
                <th>Role</th><th>Created</th><th>Last active</th><th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.email}</td>
                  <td>
                    {item.emailVerified ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle2 size={14} /> Verified
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <XCircle size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {item.disabled ? (
                      <span style={{ color: '#f87171', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                        <Ban size={14} /> Banned
                      </span>
                    ) : <span style={{ color: '#86efac' }}>Active</span>}
                  </td>
                  <td>
                    {item.isOwner ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Crown size={14} /> Owner
                      </span>
                    ) : item.role}
                  </td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td>{dateTime(item.last_seen_at)}</td>
                  <td>
                    {item.isOwner ? <strong>Protected owner</strong> : user?.isOwner ? (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="button button-ghost"
                          disabled={roleBusy === item.id || deleteBusy === item.id || banBusy === item.id}
                          onClick={() => onChangeRole(item)}
                        >
                          <ShieldCheck size={15} /> {roleBusy === item.id ? '...' : item.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          disabled={resetBusy === item.id}
                          onClick={() => onResetPassword(item)}
                        >
                          <KeyRound size={15} /> {resetBusy === item.id ? 'Sending…' : 'Reset Password'}
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          style={{
                            borderColor: item.disabled ? 'rgba(34,197,94,.45)' : 'rgba(245,158,11,.45)',
                            color: item.disabled ? '#86efac' : '#fbbf24',
                          }}
                          disabled={banBusy === item.id || deleteBusy === item.id}
                          onClick={() => onChangeBan(item)}
                        >
                          <Ban size={15} /> {banBusy === item.id ? '...' : item.disabled ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          style={{ borderColor: 'rgba(239,68,68,.45)', color: '#f87171' }}
                          disabled={deleteBusy === item.id || roleBusy === item.id || banBusy === item.id}
                          onClick={() => onRemoveUser(item)}
                        >
                          <Trash2 size={15} /> {deleteBusy === item.id ? 'Deleting…' : 'Delete Account'}
                        </button>
                      </div>
                    ) : <span>Owner only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyAdmin>لا يوجد مستخدمون بعد.</EmptyAdmin>}
      </section>
    </section>
  );
}
