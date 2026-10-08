const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {logger} = require('firebase-functions');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const APP_URL = 'https://qavli-chat-app.github.io/qavli/';
const MAX_MESSAGES_PER_SEND = 400;

function cleanText(value, max = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function messageBody(message) {
  if (message.text) return cleanText(message.text);
  if (message.fileName) return '📎 ' + cleanText(message.fileName, 90);
  if (message.imageUrl) return '📷 Sent an image';
  return 'New message';
}
function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

exports.sendQavliMessageNotification = onDocumentCreated(
  {
    document: 'chats/{chatId}/messages/{messageId}',
    region: 'us-central1',
    retry: true,
    maxInstances: 5
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data() || {};
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;
    const senderId = message.senderId;
    if (!senderId) return;

    const chatSnap = await db.doc('chats/' + chatId).get();
    if (!chatSnap.exists) return;
    const chat = chatSnap.data() || {};
    const members = Array.isArray(chat.members) ? chat.members : [];
    const recipients = members.filter((uid) => uid && uid !== senderId);
    if (!recipients.length) return;

    const senderSnap = await db.doc('users/' + senderId).get();
    const sender = senderSnap.exists ? senderSnap.data() || {} : {};
    const senderName = cleanText(sender.displayName || sender.username || 'Someone', 40);

    const tokenSnapshots = await Promise.all(recipients.map((uid) =>
      db.collection('users').doc(uid).collection('notificationTokens').get()
    ));

    const entries = [];
    for (let i = 0; i < recipients.length; i++) {
      tokenSnapshots[i].forEach((tokenDoc) => {
        const data = tokenDoc.data() || {};
        if (typeof data.token !== 'string' || !data.token) return;
        const link = typeof data.link === 'string' && data.link.startsWith('https://') ? data.link : APP_URL;
        entries.push({token:data.token, tokenRef:tokenDoc.ref, link});
      });
    }
    if (!entries.length) return;

    const title = chat.isGroup ? cleanText(chat.name || 'QAVLI group', 60) : senderName;
    const bodyText = messageBody(message);
    const body = chat.isGroup ? senderName + ': ' + bodyText : bodyText;
    const messages = entries.map((entry) => ({
      token: entry.token,
      notification: {title, body},
      data: {chatId, messageId, senderId, link: entry.link},
      webpush: {fcmOptions: {link: entry.link}}
    }));

    const entryBatches = chunks(entries, MAX_MESSAGES_PER_SEND);
    const messageBatches = chunks(messages, MAX_MESSAGES_PER_SEND);
    for (let i = 0; i < messageBatches.length; i++) {
      const response = await messaging.sendEach(messageBatches[i]);
      const removals = [];
      response.responses.forEach((result, index) => {
        if (result.success) return;
        const code = result.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
          const entry = entryBatches[i][index];
          if (entry) removals.push(entry.tokenRef.delete());
        } else {
          logger.warn('QAVLI notification delivery failed', {code, chatId});
        }
      });
      if (removals.length) await Promise.allSettled(removals);
    }
  }
);
