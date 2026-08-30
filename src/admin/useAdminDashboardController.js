import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteUserAccount,
  exportOwnerData,
  hasPlatformBackend,
  inviteAdminByEmail,
  loadAdminDashboard,
  loadAdminInvites,
  loadOwnerAccountLog,
  revokeAdminInvite,
  sendOwnerPasswordReset,
  setUserBan,
  updateUserRole,
} from '../lib/platform.js';
import {
  getAdminTabs,
  getAdminUsagePercentages,
  getBannedUsers,
  getPendingAdminInvites,
} from './admin-dashboard-model.js';
import { canModerateUser } from './admin-permissions.js';
import { downloadJson } from './admin-utils.js';

export function patchAdminUserCollection(current, userId, updated) {
  if (!current) return current;
  return {
    ...current,
    users: (current.users || []).map((entry) => entry.id === userId ? { ...entry, ...updated } : entry),
  };
}

export function removeAdminUserFromDashboard(current, userId) {
  if (!current) return current;
  return {
    ...current,
    users: (current.users || []).filter((entry) => entry.id !== userId),
    summary: {
      ...current.summary,
      totalUsers: Math.max(0, (current.summary?.totalUsers || 1) - 1),
    },
  };
}

async function loadAdminWorkspace(isOwner) {
  const dashboard = await loadAdminDashboard();
  if (!isOwner) return { dashboard, currentInvites: [], currentAccountLog: [] };
  const [currentInvites, currentAccountLog] = await Promise.all([
    loadAdminInvites(),
    loadOwnerAccountLog(),
  ]);
  return { dashboard, currentInvites, currentAccountLog };
}

export function useAdminDashboardController(user) {
  const [tab, setTab] = useState('analytics');
  const [data, setData] = useState(null);
  const [invites, setInvites] = useState([]);
  const [accountLog, setAccountLog] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleBusy, setRoleBusy] = useState('');
  const [deleteBusy, setDeleteBusy] = useState('');
  const [banBusy, setBanBusy] = useState('');
  const [resetBusy, setResetBusy] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const isOwner = Boolean(user?.isOwner);
  const isAdmin = hasPlatformBackend && user?.role === 'admin';

  const tabs = useMemo(() => getAdminTabs(isOwner), [isOwner]);
  const bannedUsers = useMemo(() => getBannedUsers(data?.users), [data?.users]);
  const percentages = useMemo(() => getAdminUsagePercentages(data?.summary), [data?.summary]);
  const pendingInvites = useMemo(() => getPendingAdminInvites(invites), [invites]);

  const applyWorkspace = useCallback((result) => {
    setData(result.dashboard);
    setInvites(result.currentInvites);
    setAccountLog(result.currentAccountLog);
  }, []);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      applyWorkspace(await loadAdminWorkspace(isOwner));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [applyWorkspace, isAdmin, isOwner]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    loadAdminWorkspace(isOwner)
      .then((result) => { if (active) applyWorkspace(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyWorkspace, isAdmin, isOwner]);

  const patchUser = useCallback((userId, updated) => {
    setData((current) => patchAdminUserCollection(current, userId, updated));
    setAccountLog((current) => current.map((entry) => entry.id === userId ? { ...entry, ...updated } : entry));
  }, []);

  const changeRole = useCallback(async (item) => {
    if (!isOwner || item.isOwner) return;
    const nextRole = item.role === 'admin' ? 'user' : 'admin';
    setRoleBusy(item.id); setError(''); setNotice('');
    try {
      const updated = await updateUserRole(item.id, nextRole);
      patchUser(item.id, updated);
      setNotice(nextRole === 'admin' ? `${item.email} is now an Admin.` : `Admin access removed from ${item.email}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRoleBusy('');
    }
  }, [isOwner, patchUser]);

  const changeBan = useCallback(async (item) => {
    if (!canModerateUser(user, item)) return;
    const nextBanned = !item.disabled;
    let reason = '';
    if (nextBanned) {
      const enteredReason = globalThis.prompt?.(`Ban ${item.email}?\n\nEnter the reason for the audit log. The account will be signed out immediately.`, 'Policy or security review');
      if (enteredReason === null) return;
      reason = String(enteredReason || '').trim();
    } else if (!globalThis.confirm?.(`Unban ${item.email}?`)) return;
    setBanBusy(item.id); setError(''); setNotice('');
    try {
      const updated = await setUserBan(item.id, nextBanned, reason);
      patchUser(item.id, updated);
      setNotice(nextBanned ? `${item.email} is now banned and all sessions were revoked.` : `${item.email} is active again.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBanBusy('');
    }
  }, [patchUser, user]);

  const resetPassword = useCallback(async (item) => {
    if (!isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Send a secure password reset link to ${item.email}?`)) return;
    setResetBusy(item.id); setError(''); setNotice('');
    try {
      await sendOwnerPasswordReset(item.id);
      setNotice(`Password reset email sent to ${item.email}. The link is single-use and expires in 30 minutes.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setResetBusy('');
    }
  }, [isOwner]);

  const removeUser = useCallback(async (item) => {
    if (!isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Delete ${item.email}?\n\nThis permanently deletes the account and active sessions. This cannot be undone.`)) return;
    setDeleteBusy(item.id); setError(''); setNotice('');
    try {
      await deleteUserAccount(item.id);
      setData((current) => removeAdminUserFromDashboard(current, item.id));
      setAccountLog((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(`${item.email} was deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleteBusy('');
    }
  }, [isOwner]);

  const addAdmin = useCallback(async (event) => {
    event.preventDefault();
    if (!isOwner || !inviteEmail.trim()) return;
    setInviteBusy(true); setError(''); setNotice('');
    try {
      const result = await inviteAdminByEmail(inviteEmail.trim());
      if (result.status === 'admin_granted') {
        patchUser(result.user.id, result.user);
        setNotice(`${result.user.email} is now an Admin.`);
      } else {
        setInvites(await loadAdminInvites());
        setNotice(`Admin invitation saved for ${result.invite.email}. The role activates when that email creates and verifies an account.`);
      }
      setInviteEmail('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setInviteBusy(false);
    }
  }, [inviteEmail, isOwner, patchUser]);

  const revokeInvite = useCallback(async (email) => {
    if (!isOwner) return;
    setError(''); setNotice('');
    try {
      await revokeAdminInvite(email);
      setInvites((current) => current.filter((item) => item.email !== email || item.accepted_at));
      setNotice(`Pending invitation for ${email} was removed.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [isOwner]);

  const exportBackup = useCallback(async () => {
    if (!isOwner) return;
    setBackupBusy(true); setError(''); setNotice('');
    try {
      const snapshot = await exportOwnerData();
      const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
      downloadJson(`pathpilot-owner-export-${stamp}.json`, snapshot);
      setNotice('Safe owner data export downloaded. Password hashes, sessions and security tokens are intentionally excluded.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBackupBusy(false);
    }
  }, [isOwner]);

  return {
    tab, setTab, data, accountLog, inviteEmail, setInviteEmail,
    notice, error, loading, roleBusy, deleteBusy, banBusy, resetBusy,
    inviteBusy, backupBusy, tabs, bannedUsers, percentages, pendingInvites,
    refresh, changeRole, changeBan, resetPassword, removeUser, addAdmin,
    revokeInvite, exportBackup,
  };
}
