import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_OWNER_EMAIL,
  DEFAULT_SUPPORT_EMAIL,
  createFreeSupportTicket,
  freeGetCurrentUser,
  freeLoginAccount,
  freeRegisterAccount,
  freeRequestPasswordReset,
  freeResetPasswordWithCode,
  freeVerifyEmailCode,
  isOwnerEmail,
  listFreeSupportTickets,
  replyFreeSupportTicket,
  updateFreeSupportTicketStatus,
} from './free-cloud-hub.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

test('owner and official support email constants match configured accounts', () => {
  assert.equal(DEFAULT_OWNER_EMAIL, 'Abdelrhman.maroxo@gmail.com');
  assert.equal(DEFAULT_SUPPORT_EMAIL, 'pathpilot.app00@gmail.com');
  assert.equal(isOwnerEmail('abdelrhman.maroxo@gmail.com'), true);
  assert.equal(isOwnerEmail('ABDELRHMAN.MAROXO@GMAIL.COM'), true);
  assert.equal(isOwnerEmail('someone@example.com'), false);
});

test('free cloud registration issues 6-digit OTP code, verifies account, and grants Owner privileges to Abdelrhman.maroxo@gmail.com', async () => {
  const storage = createMemoryStorage();
  const registration = await freeRegisterAccount({
    name: 'Abdelrhman Essam',
    email: 'Abdelrhman.maroxo@gmail.com',
    password: 'OwnerStrongPassword123!',
  }, { storage });

  assert.equal(registration.requiresVerification, true);
  assert.match(registration.instantOtpCode, /^\d{6}$/);

  await assert.rejects(
    () => freeLoginAccount({ email: 'Abdelrhman.maroxo@gmail.com', password: 'OwnerStrongPassword123!' }, { storage }),
    (err) => err.code === 'EMAIL_NOT_VERIFIED',
  );

  const verified = await freeVerifyEmailCode({
    email: 'Abdelrhman.maroxo@gmail.com',
    code: registration.instantOtpCode,
  }, { storage });

  assert.equal(verified.ok, true);
  assert.equal(verified.user.isOwner, true);
  assert.equal(verified.user.role, 'admin');
  assert.equal(verified.user.emailVerified, true);
  assert.equal(freeGetCurrentUser(storage)?.isOwner, true);
});

test('support tickets support opening a ticket, owner inbox listing, two-way replies, and status updates', async () => {
  const storage = createMemoryStorage();

  // User opens ticket
  const created = await createFreeSupportTicket({
    name: 'Ahmed Student',
    email: 'student@example.com',
    category: 'technical',
    priority: 'high',
    subject: 'مشكلة في تحميل ملخص PDF',
    message: 'أحتاج مساعدة في طباعة الملخص باللغة الإنجليزية.',
  }, { storage });

  assert.equal(created.ok, true);
  assert.match(created.ticket.id, /^TKT-\d{6}$/);
  assert.equal(created.ticket.status, 'open');
  assert.equal(created.ticket.messages.length, 1);

  // Register & verify Owner to manage tickets
  const ownerReg = await freeRegisterAccount({
    name: 'Abdelrhman Owner',
    email: 'Abdelrhman.maroxo@gmail.com',
    password: 'OwnerPassword99!',
  }, { storage });
  await freeVerifyEmailCode({
    email: 'Abdelrhman.maroxo@gmail.com',
    code: ownerReg.instantOtpCode,
  }, { storage });

  const allTickets = listFreeSupportTickets({ includeAll: true }, storage);
  assert.equal(allTickets.length, 1);

  const ownerReply = await replyFreeSupportTicket({
    ticketId: created.ticket.id,
    message: 'أهلاً يا أحمد! اضغط زر PDF من الشات واختر English من الإعدادات.',
  }, { storage });

  assert.equal(ownerReply.ticket.status, 'in_progress');
  assert.equal(ownerReply.ticket.messages.length, 2);
  assert.equal(ownerReply.ticket.messages[1].sender_role, 'owner');
  assert.equal(ownerReply.ticket.messages[1].sender_email, 'pathpilot.app00@gmail.com');

  const resolved = updateFreeSupportTicketStatus({
    ticketId: created.ticket.id,
    status: 'resolved',
  }, storage);
  assert.equal(resolved.status, 'resolved');
});

test('password reset via 6-digit OTP updates password cleanly', async () => {
  const storage = createMemoryStorage();
  const reg = await freeRegisterAccount({
    name: 'Sara User',
    email: 'sara@example.com',
    password: 'InitialPassword1!',
  }, { storage });
  await freeVerifyEmailCode({ email: 'sara@example.com', code: reg.instantOtpCode }, { storage });

  const resetReq = await freeRequestPasswordReset('sara@example.com', { storage });
  assert.match(resetReq.instantOtpCode, /^\d{6}$/);

  await freeResetPasswordWithCode({
    email: 'sara@example.com',
    code: resetReq.instantOtpCode,
    newPassword: 'UpdatedPassword2!',
  }, { storage });

  const login = await freeLoginAccount({
    email: 'sara@example.com',
    password: 'UpdatedPassword2!',
  }, { storage });
  assert.equal(login.user.email, 'sara@example.com');
});
