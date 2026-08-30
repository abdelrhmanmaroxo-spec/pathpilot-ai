import { useCallback, useState } from 'react';
import {
  deleteUserAccount,
  sendOwnerPasswordReset,
  setUserBan,
  updateUserRole,
} from '../lib/platform.js';
import { canModerateUser } from './admin-permissions.js';

export function useAdminUserActions({
  user,
  isOwner,
  patchUser,
  removeUserFromDashboard,
  setAccountLog,
  setError,
  setNotice,
}) {
  const [roleBusy, setRoleBusy] = useState('');
  const [deleteBusy, setDeleteBusy] = useState('');
  const [banBusy, setBanBusy] = useState('');
  const [resetBusy, setResetBusy] = useState('');

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
  }, [isOwner, patchUser, setError, setNotice]);

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
  }, [patchUser, setError, setNotice, user]);

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
  }, [isOwner, setError, setNotice]);

  const removeUser = useCallback(async (item) => {
    if (!isOwner || item.isOwner) return;
    if (!globalThis.confirm?.(`Delete ${item.email}?\n\nThis permanently deletes the account and active sessions. This cannot be undone.`)) return;
    setDeleteBusy(item.id); setError(''); setNotice('');
    try {
      await deleteUserAccount(item.id);
      removeUserFromDashboard(item.id);
      setAccountLog((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(`${item.email} was deleted.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleteBusy('');
    }
  }, [isOwner, removeUserFromDashboard, setAccountLog, setError, setNotice]);

  return {
    roleBusy,
    deleteBusy,
    banBusy,
    resetBusy,
    changeRole,
    changeBan,
    resetPassword,
    removeUser,
  };
}
