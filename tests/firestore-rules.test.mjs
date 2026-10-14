import {readFile} from "node:fs/promises";
import {before, after, beforeEach, test} from "node:test";
import assert from "node:assert/strict";
import {initializeTestEnvironment, assertFails, assertSucceeds} from "@firebase/rules-unit-testing";
import {doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, Timestamp, writeBatch, runTransaction} from "firebase/firestore";

const projectId = "demo-qavli";
const ownerUid = "owner-user";
const memberUid = "member-user";
const groupId = "group-one";
let env;

before(async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
  env = await initializeTestEnvironment({projectId, firestore: {rules}});
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, "chats", groupId), {
      isGroup: true,
      name: "Test group",
      createdBy: ownerUid,
      members: [ownerUid],
      lastMessage: "",
      lastActivityAt: Timestamp.now()
    });
  });
});

test("profile creation requires a matching username index in the same transaction", async () => {
  const db = env.authenticatedContext(memberUid).firestore();
  await assertSucceeds(runTransaction(db, async tx => {
    tx.set(doc(db, "usernames", "member_1"), {uid: memberUid, createdAt: serverTimestamp()});
    tx.set(doc(db, "users", memberUid), {
      username: "member_1",
      displayName: "Member One",
      online: true,
      lastSeen: serverTimestamp()
    });
  }));
  const profile = await getDoc(doc(db, "users", memberUid));
  assert.equal(profile.exists(), true);
});

test("a non-member cannot join a group by editing its member list directly", async () => {
  const db = env.authenticatedContext(memberUid).firestore();
  await assertFails(updateDoc(doc(db, "chats", groupId), {members: arrayUnion(memberUid)}));
});

test("a valid expiring invite permits joining only when the request is consumed atomically", async () => {
  const ownerDb = env.authenticatedContext(ownerUid).firestore();
  const memberDb = env.authenticatedContext(memberUid).firestore();
  const inviteId = "unguessable-test-token";
  const inviteRef = doc(ownerDb, "groupInvites", inviteId);
  await assertSucceeds(setDoc(inviteRef, {
    chatId: groupId,
    createdBy: ownerUid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }));

  const requestRef = doc(memberDb, "groupJoinRequests", memberUid);
  await assertSucceeds(setDoc(requestRef, {
    chatId: groupId,
    uid: memberUid,
    inviteId,
    createdAt: serverTimestamp()
  }));

  const batch = writeBatch(memberDb);
  batch.update(doc(memberDb, "chats", groupId), {members: [ownerUid, memberUid]});
  batch.delete(requestRef);
  await assertSucceeds(batch.commit());

  const joined = await getDoc(doc(memberDb, "chats", groupId));
  assert.equal(joined.data().members.includes(memberUid), true);
  assert.equal((await getDoc(requestRef)).exists(), false);
});

test("a non-member cannot mint an invite for a group they do not belong to", async () => {
  const db = env.authenticatedContext(memberUid).firestore();
  await assertFails(setDoc(doc(db, "groupInvites", "forbidden-token"), {
    chatId: groupId,
    createdBy: memberUid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)
  }));
});



test("new messages cannot forge read receipts for other users", async () => {
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), "chats", groupId), {members: [ownerUid, memberUid]});
  });
  const db = env.authenticatedContext(memberUid).firestore();
  const ownReceipt = {
    senderId: memberUid,
    text: "Own receipt",
    createdAt: serverTimestamp(),
    readBy: {[memberUid]: serverTimestamp()}
  };
  await assertSucceeds(setDoc(doc(db, "chats", groupId, "messages", "own-receipt"), ownReceipt));
  const forgedReceipt = {
    senderId: memberUid,
    text: "Forged receipt",
    createdAt: serverTimestamp(),
    readBy: {[memberUid]: serverTimestamp(), [ownerUid]: serverTimestamp()}
  };
  await assertFails(setDoc(doc(db, "chats", groupId, "messages", "forged-receipt"), forgedReceipt));
});

test("read receipts can only be changed for the authenticated reader", async () => {
  const messageId = "message-one";
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await updateDoc(doc(db, "chats", groupId), {members: [ownerUid, memberUid]});
    await setDoc(doc(db, "chats", groupId, "messages", messageId), {
      senderId: ownerUid,
      text: "Hello",
      createdAt: Timestamp.now(),
      readBy: {[ownerUid]: Timestamp.now()}
    });
  });
  const db = env.authenticatedContext(memberUid).firestore();
  const messageRef = doc(db, "chats", groupId, "messages", messageId);
  await assertSucceeds(updateDoc(messageRef, {["readBy." + memberUid]: serverTimestamp()}));
  await assertFails(updateDoc(messageRef, {["readBy." + ownerUid]: serverTimestamp()}));
});

test("expired invites cannot authorize a join request", async () => {
  const inviteId = "expired-token";
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "groupInvites", inviteId), {
      chatId: groupId,
      createdBy: ownerUid,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() - 1000)
    });
  });
  const db = env.authenticatedContext(memberUid).firestore();
  await assertFails(setDoc(doc(db, "groupJoinRequests", memberUid), {
    chatId: groupId,
    uid: memberUid,
    inviteId,
    createdAt: serverTimestamp()
  }));
});
