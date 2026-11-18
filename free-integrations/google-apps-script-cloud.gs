/**
 * ============================================================================
 * PathPilot AI v5.0 — 100% FREE Cloud, OTP Mailer & Support Ticket Bridge
 * ============================================================================
 * يعمل مجاناً 100% للأبد بدون فيزا وبدون Railway عبر حساب:
 *   pathpilot.app00@gmail.com
 * والحساب المالك الإداري المحمي:
 *   Abdelrhman.maroxo@gmail.com
 *
 * خطوات التفعيل في دقيقتين فقط:
 * 1. افتح المتصفح بحساب الجيميل الخاص بالتطبيق: pathpilot.app00@gmail.com
 * 2. ادخل على: https://script.google.com واضغط "New project" (مشروع جديد)
 * 3. امسح أي كود موجود والصق هذا الملف بالكامل ثم اضغط حفظ (Ctrl+S)
 * 4. اضغط "Deploy" -> "New deployment"
 * 5. اختر النوع "Web app":
 *    - Execute as: Me (pathpilot.app00@gmail.com)
 *    - Who has access: Anyone (أي شخص)
 * 6. اضغط "Deploy" ووافق على صلاحية إرسال البريد وحفظ الشيت، ثم انسخ رابط Web App URL
 * 7. افتح موقعك PathPilot بحساب المالك (Abdelrhman.maroxo@gmail.com) -> الدعم والإعدادات -> الصق الرابط!
 * ============================================================================
 */

const OWNER_EMAIL = 'abdelrhman.maroxo@gmail.com';
const SUPPORT_EMAIL = 'pathpilot.app00@gmail.com';
const SENDER_NAME = 'PathPilot Support';
const APP_URL = 'https://abdelrhmanmaroxo-spec.github.io/pathpilot-ai/';

function getOrCreateDb() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('PATHPILOT_DB_SHEET_ID');
  let ss = null;
  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (err) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('PathPilot_Free_Cloud_Database');
    props.setProperty('PATHPILOT_DB_SHEET_ID', ss.getId());
  }
  ensureSheet(ss, 'users', ['id', 'name', 'email', 'password_hash', 'role', 'email_verified', 'otp_code', 'otp_expires', 'created_at', 'disabled']);
  ensureSheet(ss, 'tickets', ['id', 'requester_name', 'requester_email', 'category', 'priority', 'subject', 'status', 'created_at', 'updated_at']);
  ensureSheet(ss, 'messages', ['id', 'ticket_id', 'sender_role', 'sender_name', 'sender_email', 'body', 'created_at']);
  return ss;
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sendOtpHtmlEmail(toEmail, name, code, purpose) {
  const isReset = purpose === 'reset';
  const subject = isReset
    ? 'كود استعادة كلمة المرور - PathPilot AI (' + code + ')'
    : 'كود تفعيل حسابك في PathPilot AI (' + code + ')';
  const heading = isReset ? 'استعادة كلمة المرور' : 'تفعيل حسابك في PathPilot AI';
  const subtext = isReset
    ? 'استخدم الكود التالي لإعادة تعيين كلمة المرور الخاصة بحسابك (صالح لمدة 30 دقيقة):'
    : 'أهلاً بك في PathPilot AI! أدخل كود التفعيل المكون من 6 أرقام في نافذة التسجيل لتفعيل حسابك فوراً:';

  const htmlBody = [
    '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;padding:28px;background:#0f172a;color:#f8fafc;border-radius:18px;border:1px solid #334155">',
    '  <div style="display:inline-block;padding:8px 14px;border-radius:10px;background:#6d5dfc;color:#fff;font-weight:bold;margin-bottom:16px">PathPilot AI</div>',
    '  <h2 style="margin:0 0 12px;color:#ffffff">' + heading + '</h2>',
    '  <p style="color:#cbd5e1;line-height:1.7">أهلاً <strong>' + escapeHtml(name || 'بك') + '</strong>،</p>',
    '  <p style="color:#cbd5e1;line-height:1.7">' + subtext + '</p>',
    '  <div style="margin:24px 0;padding:20px;text-align:center;background:#1e293b;border:2px dashed #818cf8;border-radius:14px">',
    '    <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">VERIFICATION CODE · كود التأكيد</div>',
    '    <div style="font-size:34px;font-weight:900;letter-spacing:10px;color:#a5b4fc;font-family:monospace">' + escapeHtml(code) + '</div>',
    '  </div>',
    '  <p style="font-size:13px;color:#94a3b8;line-height:1.6">مرسل تلقائياً من بريد المنصة الرسمي: ' + SUPPORT_EMAIL + '</p>',
    '  <p style="font-size:13px;color:#94a3b8"><a href="' + APP_URL + '" style="color:#818cf8;text-decoration:none">فتح منصة PathPilot AI</a></p>',
    '</div>',
  ].join('\n');

  MailApp.sendEmail({
    to: toEmail,
    subject: subject,
    name: SENDER_NAME,
    replyTo: SUPPORT_EMAIL,
    htmlBody: htmlBody,
  });
}

function sendTicketNotificationEmails(ticket, messageText, isAdminReply) {
  if (isAdminReply) {
    const userHtml = [
      '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:580px;margin:auto;padding:26px;background:#0f172a;color:#f8fafc;border-radius:18px;border:1px solid #334155">',
      '  <h2 style="margin:0 0 10px;color:#a5b4fc">رد جديد من دعم PathPilot AI على تذكرتك #' + escapeHtml(ticket.id) + '</h2>',
      '  <p style="color:#cbd5e1">أهلاً <strong>' + escapeHtml(ticket.requester_name) + '</strong>،</p>',
      '  <p style="color:#cbd5e1">بخصوص التذكرة: <strong>' + escapeHtml(ticket.subject) + '</strong> (الحالة: ' + escapeHtml(ticket.status) + ')</p>',
      '  <div style="margin:18px 0;padding:16px;background:#1e293b;border-right:4px solid #6d5dfc;border-radius:10px;color:#f1f5f9;white-space:pre-wrap;line-height:1.7">' + escapeHtml(messageText) + '</div>',
      '  <p style="font-size:13px;color:#94a3b8">يمكنك الرد مباشرة من داخل قسم (الدعم وتذاكر المساعدة) في <a href="' + APP_URL + '" style="color:#818cf8">PathPilot AI</a> أو الرد على هذا البريد.</p>',
      '</div>',
    ].join('\n');
    MailApp.sendEmail({
      to: ticket.requester_email,
      subject: '[PathPilot #' + ticket.id + '] رد الدعم الفني: ' + ticket.subject,
      name: SENDER_NAME,
      replyTo: SUPPORT_EMAIL,
      htmlBody: userHtml,
    });
  } else {
    const confirmHtml = [
      '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:580px;margin:auto;padding:26px;background:#0f172a;color:#f8fafc;border-radius:18px;border:1px solid #334155">',
      '  <h2 style="margin:0 0 10px;color:#86efac">تم استلام تذكرة الدعم #' + escapeHtml(ticket.id) + '</h2>',
      '  <p style="color:#cbd5e1">أهلاً <strong>' + escapeHtml(ticket.requester_name) + '</strong>، استلم فريق دعم PathPilot AI رسالتك وسيتم الرد عليك في أقرب وقت.</p>',
      '  <p style="color:#cbd5e1"><strong>الموضوع:</strong> ' + escapeHtml(ticket.subject) + '</p>',
      '  <div style="margin:16px 0;padding:14px;background:#1e293b;border-radius:10px;color:#e2e8f0;white-space:pre-wrap">' + escapeHtml(messageText) + '</div>',
      '  <p style="font-size:13px;color:#94a3b8">رقم التذكرة للمتابعة داخل المنصة: <strong>' + escapeHtml(ticket.id) + '</strong></p>',
      '</div>',
    ].join('\n');
    MailApp.sendEmail({
      to: ticket.requester_email,
      subject: '[PathPilot #' + ticket.id + '] تم فتح تذكرة الدعم: ' + ticket.subject,
      name: SENDER_NAME,
      replyTo: SUPPORT_EMAIL,
      htmlBody: confirmHtml,
    });

    const ownerHtml = [
      '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:580px;margin:auto;padding:24px;background:#111827;color:#f8fafc;border-radius:16px">',
      '  <h2 style="margin:0 0 12px;color:#fbbf24">تذكرة دعم جديدة أو رسالة مستخدم #' + escapeHtml(ticket.id) + '</h2>',
      '  <p><strong>المرسل:</strong> ' + escapeHtml(ticket.requester_name) + ' (' + escapeHtml(ticket.requester_email) + ')</p>',
      '  <p><strong>التصنيف / الأولوية:</strong> ' + escapeHtml(ticket.category) + ' · ' + escapeHtml(ticket.priority) + '</p>',
      '  <p><strong>العنوان:</strong> ' + escapeHtml(ticket.subject) + '</p>',
      '  <div style="margin:16px 0;padding:14px;background:#1f2937;border-radius:10px;white-space:pre-wrap">' + escapeHtml(messageText) + '</div>',
      '  <p><a href="' + APP_URL + '" style="color:#818cf8">افتح لوحة المالك في PathPilot للرد المباشر</a></p>',
      '</div>',
    ].join('\n');
    MailApp.sendEmail({
      to: OWNER_EMAIL,
      subject: '[Owner Alert #' + ticket.id + '] ' + ticket.subject + ' - ' + ticket.requester_email,
      name: SENDER_NAME,
      replyTo: ticket.requester_email,
      htmlBody: ownerHtml,
    });
  }
}

function sheetRows(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(function (row, idx) {
    const obj = { _rowIndex: idx + 2 };
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function doGet() {
  return jsonOut({
    ok: true,
    service: 'PathPilot Free Cloud & Gmail Bridge',
    sender: SUPPORT_EMAIL,
    owner: OWNER_EMAIL,
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(payload.action || '');
    const ss = getOrCreateDb();

    if (action === 'ping') {
      return jsonOut({ ok: true, sender: SUPPORT_EMAIL, owner: OWNER_EMAIL });
    }

    if (action === 'send_otp') {
      const email = String(payload.email || '').trim().toLowerCase();
      const name = String(payload.name || '').trim();
      const code = String(payload.code || '').trim();
      const purpose = String(payload.purpose || 'verify');
      if (!email || !code) return jsonOut({ ok: false, error: 'Missing email or code.' });
      sendOtpHtmlEmail(email, name, code, purpose);
      return jsonOut({ ok: true, delivered: true, sender: SUPPORT_EMAIL });
    }

    if (action === 'notify_ticket') {
      const ticket = payload.ticket || {};
      const messageText = String(payload.message || '');
      const isAdminReply = Boolean(payload.isAdminReply);
      const ticketsSheet = ss.getSheetByName('tickets');
      const messagesSheet = ss.getSheetByName('messages');

      const existing = sheetRows(ticketsSheet).find(function (r) { return String(r.id) === String(ticket.id); });
      const now = new Date().toISOString();
      if (!existing && ticket.id) {
        ticketsSheet.appendRow([
          ticket.id,
          ticket.requester_name || '',
          ticket.requester_email || '',
          ticket.category || 'general',
          ticket.priority || 'normal',
          ticket.subject || '',
          ticket.status || 'open',
          ticket.created_at || now,
          now,
        ]);
      } else if (existing) {
        ticketsSheet.getRange(existing._rowIndex, 7).setValue(ticket.status || existing.status);
        ticketsSheet.getRange(existing._rowIndex, 9).setValue(now);
      }

      if (messageText && ticket.id) {
        messagesSheet.appendRow([
          'MSG-' + new Date().getTime(),
          ticket.id,
          isAdminReply ? 'owner' : 'user',
          payload.senderName || ticket.requester_name || '',
          payload.senderEmail || ticket.requester_email || '',
          messageText,
          now,
        ]);
      }

      if (ticket.requester_email) {
        sendTicketNotificationEmails(ticket, messageText, isAdminReply);
      }
      return jsonOut({ ok: true, delivered: true });
    }

    if (action === 'list_cloud_tickets') {
      const tickets = sheetRows(ss.getSheetByName('tickets'));
      const messages = sheetRows(ss.getSheetByName('messages'));
      return jsonOut({ ok: true, tickets: tickets, messages: messages });
    }

    return jsonOut({ ok: false, error: 'Unknown action: ' + action });
  } catch (error) {
    return jsonOut({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}
