import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyA3DT-yjo96ntatEA6V7K63x9lofg87ESjcA",
  authDomain: "qavli-37983.firebaseapp.com",
  projectId: "qavli-37983",
  storageBucket: "qavli-37983.firebasestorage.app",
  appId: "1:168938701514:web:783d81a63d8e4423e56a33",
  messagingSenderId: "168938701514"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const state = new Map();
let chatUnsub = null;
let activeChatId = null;
let toastTimer = null;

const $ = s => document.querySelector(s);
const esc = s => String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(title, body){
  let el = $("#qavliNewMessage");
  if(!el){
    el = document.createElement("button");
    el.id = "qavliNewMessage";
    el.type = "button";
    el.setAttribute("aria-live","polite");
    el.innerHTML = '<span class="qnm-icon">●</span><span><b></b><small></small></span><strong>›</strong>';
    el.style.cssText = "position:fixed;left:50%;top:82px;transform:translate(-50%,-14px);z-index:99999;display:flex;align-items:center;gap:10px;width:min(92vw,430px);padding:12px 14px;border:1px solid rgba(255,255,255,.16);border-radius:17px;background:rgba(16,47,72,.96);color:#fff;box-shadow:0 16px 40px rgba(0,0,0,.22);backdrop-filter:blur(16px);opacity:0;pointer-events:none;transition:.22s;font:14px system-ui";
    document.body.appendChild(el);
    const st = document.createElement("style");
    st.textContent = "#qavliNewMessage .qnm-icon{color:#f2a93b;font-size:10px}#qavliNewMessage span:nth-child(2){min-width:0;flex:1;text-align:left}#qavliNewMessage b,#qavliNewMessage small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#qavliNewMessage small{opacity:.75;margin-top:2px}#qavliNewMessage strong{font-size:22px;font-weight:400}@media(prefers-reduced-motion:reduce){#qavliNewMessage{transition:none}}";
    document.head.appendChild(st);
  }
  el.querySelector("b").textContent = title;
  el.querySelector("small").textContent = body || "New message";
  el.style.opacity = "1"; el.style.transform = "translate(-50%,0)"; el.style.pointerEvents = "auto";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{el.style.opacity="0";el.style.transform="translate(-50%,-14px)";el.style.pointerEvents="none"},3500);
  el.onclick = () => { if(el.dataset.chatId) openChatFromUnread(el.dataset.chatId); };
}
function openChatFromUnread(id){
  const buttons = [...document.querySelectorAll("#list .row")];
  const b = buttons.find(x => x.dataset.qavliChatId === id);
  if(b){ b.click(); return; }
  const ev = new CustomEvent("qavli-open-chat",{detail:{chatId:id}});
  window.dispatchEvent(ev);
}
function isChatVisible(id){
  return document.querySelector("#vchat.on") && activeChatId === id;
}
function addBadge(chatId, count, preview){
  const b = document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(chatId)+'"]');
  if(!b) return;
  let badge = b.querySelector(".qavli-unread-badge");
  if(!badge){
    badge = document.createElement("span");
    badge.className = "qavli-unread-badge";
    badge.style.cssText = "margin-left:auto;flex:none;min-width:24px;height:24px;padding:0 7px;display:grid;place-items:center;border-radius:999px;background:#f2a93b;color:#173f5f;font:800 11px system-ui;box-shadow:0 5px 12px rgba(242,169,59,.22)";
    b.appendChild(badge);
  }
  badge.textContent = count > 99 ? "99+" : String(count);
  b.style.borderColor = "rgba(242,169,59,.45)";
  b.style.background = "rgba(242,169,59,.09)";
  if(preview) b.dataset.qavliPreview = preview;
}
function clearBadge(chatId){
  const b = document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(chatId)+'"]');
  b?.querySelector(".qavli-unread-badge")?.remove();
  if(b){b.style.borderColor="";b.style.background="";}
  state.set(chatId,{...(state.get(chatId)||{}),unread:0});
}

async function markVisibleRead(chatId, messages){
  if(!messages.length) return;
  const updates = messages.filter(m => m.senderId !== auth.currentUser?.uid && !m.readBy?.[auth.currentUser.uid]);
  for(const m of updates.slice(-20)){
    try{ await updateDoc(doc(db,"chats",chatId,"messages",m.id),{["readBy."+auth.currentUser.uid]:new Date()}); }catch{}
  }
  clearBadge(chatId);
}

function watchChat(chat){
  const id = chat.id;
  return onSnapshot(query(collection(db,"chats",id,"messages"),orderBy("createdAt","desc"),limit(25)), snap=>{
    const messages = snap.docs.map(d=>({id:d.id,...d.data()})).reverse();
    const me = auth.currentUser?.uid;
    const unread = messages.filter(m=>m.senderId!==me && !m.readBy?.[me] && !m.deleted);
    state.set(id,{messages,unread:unread.length});
    if(isChatVisible(id)){ markVisibleRead(id,messages); return; }
    if(unread.length){
      addBadge(id,unread.length,unread[unread.length-1].text);
      const newest = unread[unread.length-1];
      const title = chat.isGroup ? (chat.name||"Group") : "New message";
      const body = newest.text || (newest.fileName ? "📎 "+newest.fileName : "New message");
      toast(title,body);
      const t=$("#qavliNewMessage"); if(t) t.dataset.chatId=id;
    }
  });
}

function refreshBadges(){
  for(const [id,s] of state) if(s.unread>0) addBadge(id,s.unread,s.messages?.[s.messages.length-1]?.text);
}

function start(chats){
  if(chatUnsub) chatUnsub();
  const listeners = chats.map(watchChat);
  chatUnsub = () => listeners.forEach(u=>u());
  setTimeout(refreshBadges,500);
}

onAuthStateChanged(auth,user=>{
  if(!user){ chatUnsub?.(); chatUnsub=null; state.clear(); return; }
  onSnapshot(query(collection(db,"chats"),where("members","array-contains",user.uid)),snap=>{
    start(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
});

const sync = ()=>{
  const title = $("#ct")?.textContent || "";
  const rows = [...document.querySelectorAll("#list .row")];
  const chats = [...state.keys()];
  rows.forEach((r,i)=>{ if(chats[i]) r.dataset.qavliChatId = chats[i]; });
};
new MutationObserver(sync).observe(document.body,{subtree:true,childList:true});
setInterval(()=>{
  const v = document.querySelector("#vchat.on");
  const title = $("#ct")?.textContent || "";
  if(v && title){
    for(const [id,s] of state){
      const chatRow=document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(id)+'"]');
      if(chatRow && chatRow.querySelector("b")?.textContent===title && activeChatId!==id){
        activeChatId=id;
        markVisibleRead(id,s.messages||[]);
        break;
      }
    }
  } else activeChatId=null;
  sync();
},700);

window.addEventListener("qavli-chat-opened",e=>{
  activeChatId=e.detail?.chatId||null;
  if(activeChatId) clearBadge(activeChatId);
});
