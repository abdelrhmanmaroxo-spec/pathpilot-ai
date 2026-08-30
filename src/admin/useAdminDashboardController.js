import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  exportOwnerData,
  hasPlatformBackend,
  inviteAdminByEmail,
  loadAdminDashboard,
  loadAdminInvites,
  loadOwnerAccountLog,
  revokeAdminInvite,
} from '../lib/platform.js';
import {
  getAdminTabs,
  getAdminUsagePercentages,
  getBannedUsers,
  getPendingAdminInvites,
} from './admin-dashboard-model.js';
import { downloadJson } from './admin-utils.js';
import { useAdminUserActions } from './useAdminUserActions.js';

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

  const removeUserFromDashboard = useCallback((userId) => {
    setData((current) => removeAdminUserFromDashboard(current, userId));
  }, []);

  const {
    roleBusy,
    deleteBusy,
    banBusy,
    resetBusy,
    changeRole,
    changeBan,
    resetPassword,
    removeUser,
  } = useAdminUserActions({
    user,
    isOwner,
    patchUser,
    removeUserFromDashboard,
    setAccountLog,
    setError,
    setNotice,
  });

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
