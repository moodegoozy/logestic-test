'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'default' });

// ── Set default region ──────────────────────────────────────────────────────
setGlobalOptions({ region: 'us-central1' });

const WHATSBOT_URL = 'https://whatsbot.at/api';
const STRICT_PHONE_MATCH = process.env.WHATSBOT_STRICT_PHONE_MATCH === 'true';
const OTP_EXPIRY_MINUTES = 5;
const OTP_COOLDOWN_SECONDS = 45;
const OTP_MAX_ATTEMPTS = 5;

// ── Statuses that block cancellation ────────────────────────────────────────
const NON_CANCELABLE = new Set(['delivered', 'completed', 'cancelled', 'cancelled_by_customer']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCredentials() {
  const instanceId = process.env.WHATSBOT_INSTANCE_ID;
  const accessToken = process.env.WHATSBOT_ACCESS_TOKEN;
  if (!instanceId || !accessToken) {
    throw new Error('WhatsBot credentials not configured');
  }
  return { instanceId, accessToken };
}

function normalizePhone(raw = '') {
  let p = raw.replace(/@[^@]+$/, '').replace(/[^\d]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = '966' + p.slice(1);
  if (p.length === 9) p = '966' + p;
  return p;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    if (key.endsWith(']')) {
      const m = key.match(/(.+)\[(\d+)\]$/);
      if (!m) return undefined;
      const arr = acc[m[1]];
      return Array.isArray(arr) ? arr[Number(m[2])] : undefined;
    }
    return acc[key];
  }, obj);
}

function pickFirstString(obj, paths) {
  for (const p of paths) {
    const v = getByPath(obj, p);
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function deepFindFirstString(obj, preferredKeys) {
  const queue = [obj];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur == null) continue;

    if (typeof cur === 'string' && cur.trim()) {
      continue;
    }

    if (Array.isArray(cur)) {
      for (const item of cur) queue.push(item);
      continue;
    }

    if (typeof cur === 'object') {
      for (const key of preferredKeys) {
        const v = cur[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      for (const k of Object.keys(cur)) queue.push(cur[k]);
    }
  }
  return '';
}

function deepCollectStrings(obj, cap = 400) {
  const out = [];
  const queue = [obj];
  while (queue.length > 0 && out.length < cap) {
    const cur = queue.shift();
    if (cur == null) continue;
    if (typeof cur === 'string') {
      if (cur.trim()) out.push(cur.trim());
      continue;
    }
    if (Array.isArray(cur)) {
      for (const item of cur) queue.push(item);
      continue;
    }
    if (typeof cur === 'object') {
      for (const k of Object.keys(cur)) queue.push(cur[k]);
    }
  }
  return out;
}

function extractPhoneCandidate(strings) {
  for (const s of strings) {
    const mJid = s.match(/(\d{8,15})@(?:s\.whatsapp\.net|c\.us)/i);
    if (mJid) return mJid[1];
    const mDigits = s.replace(/[^\d]/g, '');
    if (mDigits.length >= 8 && mDigits.length <= 15) return mDigits;
  }
  return '';
}

function isLikelyPhone(number) {
  const p = normalizePhone(number);
  return /^\d{8,15}$/.test(p) && !p.endsWith('000000000');
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function nowMs() {
  return Date.now();
}

async function sendWhatsApp(phone, message) {
  const { instanceId, accessToken } = getCredentials();
  const to = normalizePhone(phone);
  const payload = {
    number: to,
    type: 'text',
    message,
    instance_id: instanceId,
    access_token: accessToken,
  };

  const response = await fetch(`${WHATSBOT_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`WhatsBot API responded ${response.status}: ${raw}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`WhatsBot returned non-JSON response: ${raw.slice(0, 160)}`);
  }

  if (parsed?.status !== 'success') {
    throw new Error(`WhatsBot send failed: ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

async function findDriverByPhone(phoneNormalized) {
  const snap = await db.collection('users').where('role', '==', 'driver').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .find((u) => normalizePhone(u.phone || '') === phoneNormalized);
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCTION 1: HTTP POST /sendOrderConfirmation
// Called by frontend AFTER order is created in Firestore.
// Accepts { orderId } — fetches customerPhone server-side (never in request).
// ════════════════════════════════════════════════════════════════════════════
exports.sendOrderConfirmation = onRequest(
  { cors: ['https://for-all-directions-sa.web.app', 'https://sfrtalbyt-f7fd1.web.app'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId } = req.body || {};

    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      return res.status(400).json({ error: 'orderId is required' });
    }

    try {
      const orderRef = db.collection('orders').doc(orderId.trim());
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderDoc.data();

      if (order.whatsappConfirmSent === true) {
        return res.status(200).json({ status: 'already_sent', orderNumber: order.orderNumber });
      }

      if (!order.customerPhone) {
        return res.status(200).json({ status: 'skipped', reason: 'no phone' });
      }

      const message =
        `تم استلام طلبك ✅\n` +
        `رقم الطلب: #${order.orderNumber}\n` +
        `تفاصيل الطلب:\n${order.orderDetails}\n\n` +
        `لإلغاء الطلب اكتب:\n` +
        `الغاء #${order.orderNumber}`;

      const sendResult = await sendWhatsApp(order.customerPhone, message);

      // Mark confirmation sent
      await orderRef.update({
        whatsappConfirmSent: true,
        whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[sendOrderConfirmation] WhatsApp sent for order ${order.orderNumber}; ` +
        `response=${JSON.stringify(sendResult)}`
      );
      return res.status(200).json({ status: 'sent', orderNumber: order.orderNumber });

    } catch (err) {
      console.error('[sendOrderConfirmation] Error:', err.message);
      // Non-fatal: order is already saved in Firestore
      return res.status(500).json({ error: 'Failed to send WhatsApp confirmation' });
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════
// FUNCTION 1.5: Driver OTP login via WhatsBot
// requestDriverOtp -> send code to driver's registered phone
// verifyDriverOtp  -> validate code and return Firebase custom token
// ════════════════════════════════════════════════════════════════════════════
exports.requestDriverOtp = onRequest(
  { cors: ['https://for-all-directions-sa.web.app', 'https://sfrtalbyt-f7fd1.web.app'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const phone = normalizePhone(req.body?.phone || '');
      if (!isLikelyPhone(phone)) {
        return res.status(400).json({ error: 'رقم الجوال غير صالح' });
      }

      const driver = await findDriverByPhone(phone);
      if (!driver) {
        // Generic response to avoid user enumeration.
        return res.status(200).json({ status: 'sent_if_exists' });
      }

      const otpRef = db.collection('driver_login_otps').doc(phone);
      const otpDoc = await otpRef.get();
      const now = nowMs();

      if (otpDoc.exists) {
        const old = otpDoc.data();
        const lastRequestedMs = old?.requestedAt?.toMillis ? old.requestedAt.toMillis() : 0;
        if (lastRequestedMs && now - lastRequestedMs < OTP_COOLDOWN_SECONDS * 1000) {
          const waitSec = Math.ceil((OTP_COOLDOWN_SECONDS * 1000 - (now - lastRequestedMs)) / 1000);
          return res.status(429).json({ error: `انتظر ${waitSec} ثانية قبل طلب رمز جديد` });
        }
      }

      const code = generateOtpCode();
      const expiresAt = admin.firestore.Timestamp.fromMillis(now + OTP_EXPIRY_MINUTES * 60 * 1000);

      await otpRef.set({
        phone,
        userId: driver.id,
        code,
        attempts: 0,
        requestedAt: admin.firestore.Timestamp.fromMillis(now),
        expiresAt,
      }, { merge: true });

      await sendWhatsApp(
        phone,
        `رمز دخولك هو: ${code}\n` +
        `صالح لمدة ${OTP_EXPIRY_MINUTES} دقائق فقط.\n` +
        `لا تشارك هذا الرمز مع أي شخص.`
      );

      return res.status(200).json({
        status: 'sent',
        expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      });
    } catch (err) {
      console.error('[requestDriverOtp] Error:', err.message);
      return res.status(500).json({ error: 'تعذر إرسال رمز التحقق' });
    }
  }
);

exports.verifyDriverOtp = onRequest(
  { cors: ['https://for-all-directions-sa.web.app', 'https://sfrtalbyt-f7fd1.web.app'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const phone = normalizePhone(req.body?.phone || '');
      const code = String(req.body?.code || '').trim();

      if (!isLikelyPhone(phone)) {
        return res.status(400).json({ error: 'رقم الجوال غير صالح' });
      }
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'رمز التحقق يجب أن يكون 6 أرقام' });
      }

      const otpRef = db.collection('driver_login_otps').doc(phone);
      const otpDoc = await otpRef.get();
      if (!otpDoc.exists) {
        return res.status(400).json({ error: 'رمز التحقق غير موجود أو منتهي' });
      }

      const otp = otpDoc.data();
      const expiresMs = otp?.expiresAt?.toMillis ? otp.expiresAt.toMillis() : 0;
      if (!expiresMs || nowMs() > expiresMs) {
        await otpRef.delete().catch(() => {});
        return res.status(400).json({ error: 'انتهت صلاحية رمز التحقق' });
      }

      if (otp.code !== code) {
        const attempts = Number(otp.attempts || 0) + 1;
        if (attempts >= OTP_MAX_ATTEMPTS) {
          await otpRef.delete().catch(() => {});
          return res.status(400).json({ error: 'تم تجاوز عدد المحاولات المسموح' });
        }
        await otpRef.update({ attempts });
        return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
      }

      const userId = otp.userId;
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'driver') {
        return res.status(403).json({ error: 'هذا الحساب غير مصرح له بالدخول كمندوب' });
      }

      const token = await admin.auth().createCustomToken(userId, { role: 'driver' });
      await otpRef.delete().catch(() => {});

      return res.status(200).json({ status: 'verified', token });
    } catch (err) {
      console.error('[verifyDriverOtp] Error:', err.message);
      return res.status(500).json({ error: 'تعذر التحقق من رمز الدخول' });
    }
  }
);



// ════════════════════════════════════════════════════════════════════════════
// FUNCTION 2: HTTP POST /whatsappWebhook — receive incoming WhatsApp messages
// ════════════════════════════════════════════════════════════════════════════
exports.whatsappWebhook = onRequest({ cors: false }, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const dataObj = typeof body?.data === 'string'
      ? (() => {
          try { return JSON.parse(body.data); } catch { return {}; }
        })()
      : (body?.data || {});
    const eventData = typeof dataObj?.data === 'string'
      ? (() => {
          try { return JSON.parse(dataObj.data); } catch { return {}; }
        })()
      : (dataObj?.data || {});
    const root = { ...body, data: dataObj, eventData };

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid or empty body' });
    }

    console.log(
      `[whatsappWebhook] payload keys: ${Object.keys(body).join(', ')}; ` +
      `data keys: ${Object.keys(dataObj).join(', ')}; ` +
      `eventData keys: ${Object.keys(eventData).join(', ')}`
    );

    // ── Extract sender phone and message ──
    let fromRaw = pickFirstString(root, [
      'data.from',
      'eventData.from',
      'from',
      'sender',
      'phone',
      'data.phone',
      'eventData.phone',
      'data.sender',
      'eventData.sender',
      'data.key.remoteJid',
      'eventData.key.remoteJid',
      'data.participant',
      'eventData.participant',
      'data.author',
      'eventData.author',
      'key.remoteJid',
      'data.messages[0].from',
      'data.messages[0].key.remoteJid',
      'eventData.messages[0].from',
      'eventData.messages[0].key.remoteJid',
      'data.entry[0].changes[0].value.messages[0].from',
      'messages[0].from',
      'messages[0].key.remoteJid',
    ]);

    let messageText = pickFirstString(root, [
      'data.body',
      'eventData.body',
      'data.message',
      'eventData.message',
      'message',
      'body',
      'text',
      'data.text',
      'eventData.text',
      'data.messages[0].text.body',
      'eventData.messages[0].text.body',
      'data.messages[0].body',
      'eventData.messages[0].body',
      'messages[0].text.body',
      'messages[0].message.conversation',
      'messages[0].message.extendedTextMessage.text',
      'data.message.conversation',
      'data.message.extendedTextMessage.text',
      'eventData.message.conversation',
      'eventData.message.extendedTextMessage.text',
      'data.entry[0].changes[0].value.messages[0].text.body',
    ]);

    if (!fromRaw) {
      fromRaw = deepFindFirstString(root, [
        'from',
        'remoteJid',
        'sender',
        'author',
        'participant',
        'jid',
      ]);
    }

    if (!messageText) {
      messageText = deepFindFirstString(root, [
        'body',
        'message',
        'text',
        'conversation',
        'caption',
      ]);
    }

    const allStrings = deepCollectStrings(root);
    if (!fromRaw || fromRaw.includes('@lid')) {
      const candidate = extractPhoneCandidate(allStrings);
      if (candidate) fromRaw = candidate;
    }

    if (!messageText) {
      const cancelLike = allStrings.find((s) => /(?:الغاء|إلغاء)\s*#?\s*[\w\-]+/iu.test(s));
      if (cancelLike) messageText = cancelLike;
    }

    if (!fromRaw || !messageText) {
      console.log(
        `[whatsappWebhook] ignored (missing fields): fromRaw="${fromRaw}" messageTextLen=${messageText.length}`
      );
      // Not a text message event we care about (could be status update etc.)
      return res.status(200).json({ status: 'ignored', reason: 'no from/message' });
    }

    const senderPhone = normalizePhone(fromRaw);
    if (!isLikelyPhone(senderPhone)) {
      console.log(`[whatsappWebhook] ignored (invalid sender phone): fromRaw="${fromRaw}" normalized="${senderPhone}"`);
      return res.status(200).json({ status: 'ignored', reason: 'invalid_sender_phone' });
    }

    // ── Check for cancellation request ───────────────────────────────────
    // Accepts: الغاء #ORDER  or  إلغاء #ORDER  (with/without space)
    const cancelMatch = messageText
      .trim()
      .match(/(?:الغاء|إلغاء)\s*#?\s*([\w\-]+)/iu);

    if (!cancelMatch) {
      return res.status(200).json({ status: 'not_a_cancel_request' });
    }

    const requestedOrderNumber = cancelMatch[1].trim().toUpperCase();

    if (!requestedOrderNumber) {
      return res.status(200).json({ status: 'missing_order_number' });
    }

    // ── Find order in Firestore ───────────────────────────────────────────
    const ordersSnap = await db
      .collection('orders')
      .where('orderNumber', '==', requestedOrderNumber)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      await sendWhatsApp(
        senderPhone,
        `عذراً، لم يتم العثور على طلب برقم #${requestedOrderNumber} 🔍\n` +
        `يرجى التحقق من الرقم والمحاولة مجدداً`
      ).catch(console.error);
      return res.status(200).json({ status: 'order_not_found', orderNumber: requestedOrderNumber });
    }

    const orderDoc = ordersSnap.docs[0];
    const order = orderDoc.data();

    // ── Verify phone ownership ───────────────────────────────────────────
    const orderPhone = normalizePhone(order.customerPhone || '');
    if (senderPhone !== orderPhone) {
      console.warn(
        `[whatsappWebhook] Phone mismatch for order ${requestedOrderNumber}: ` +
        `expected ${orderPhone}, got ${senderPhone}; strict=${STRICT_PHONE_MATCH}`
      );

      if (STRICT_PHONE_MATCH) {
        await sendWhatsApp(
          senderPhone,
          `عذراً، لا يمكنك إلغاء هذا الطلب 🚫\n` +
          `رقم الهاتف غير مطابق لبيانات الطلب`
        ).catch(console.error);
        return res.status(200).json({ status: 'phone_mismatch' });
      }
    }

    // ── Block terminal statuses ──────────────────────────────────────────
    if (NON_CANCELABLE.has(order.status)) {
      const statusNote = {
        delivered: 'الطلب تم توصيله بالفعل ولا يمكن إلغاؤه',
        completed: 'الطلب مكتمل ولا يمكن إلغاؤه',
        cancelled: 'تم إلغاء الطلب مسبقاً',
        cancelled_by_customer: 'تم إلغاء الطلب مسبقاً من قِبلك',
      }[order.status] || 'لا يمكن إلغاء هذا الطلب';

      await sendWhatsApp(
        senderPhone,
        `عذراً، ${statusNote} ❌\n` +
        `رقم الطلب: #${requestedOrderNumber}`
      ).catch(console.error);

      return res.status(200).json({ status: 'cannot_cancel', currentStatus: order.status });
    }

    // ── Cancel the order ─────────────────────────────────────────────────
    await orderDoc.ref.update({
      status: 'cancelled',
      driverStatus: 'cancelled_by_customer',
      cancellationSourcePhone: senderPhone,
      cancellationExpectedPhone: orderPhone,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: 'customer',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ── Send confirmation ────────────────────────────────────────────────
    await sendWhatsApp(
      senderPhone,
      `تم إلغاء طلبك رقم #${requestedOrderNumber} بنجاح ✅\n` +
      `نتمنى خدمتك في وقت آخر 🙏\n` +
      `لكل الاتجاهات`
    ).catch((e) => {
      console.error('[whatsappWebhook] cancel confirmation send failed:', e.message);
    });

    console.log(`[whatsappWebhook] Order ${requestedOrderNumber} cancelled by customer`);
    return res.status(200).json({ status: 'cancelled', orderNumber: requestedOrderNumber });

  } catch (err) {
    console.error('[whatsappWebhook] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
