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
const auth = getAuth(app), db = getFirestore(app);
const state = new Map();
let chatUnsub = null, activeChatId = null, toastTimer = null;

const $ = s => document.querySelector(s);

function toast(title, body, chatId){
  let el = $("#qavliNewMessage");
  if(!el){
    el = document.createElement("button");
    el.id="qavliNewMessage"; el.type="button"; el.setAttribute("aria-live","polite");
    el.innerHTML='<span class="qnm-icon">●</span><span><b></b><small></small></span><strong>›</strong>';
    el.style.cssText="position:fixed;left:50%;top:82px;transform:translate(-50%,-14px);z-index:99999;display:flex;align-items:center;gap:10px;width:min(92vw,430px);padding:12px 14px;border:1px solid rgba(255,255,255,.16);border-radius:17px;background:rgba(16,47,72,.96);color:#fff;box-shadow:0 16px 40px rgba(0,0,0,.22);backdrop-filter:blur(16px);opacity:0;pointer-events:none;transition:.22s;font:14px system-ui";
    document.body.appendChild(el);
    const st=document.createElement("style");
    st.textContent="#qavliNewMessage .qnm-icon{color:#f2a93b;font-size:10px}#qavliNewMessage span:nth-child(2){min-width:0;flex:1;text-align:left}#qavliNewMessage b,#qavliNewMessage small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#qavliNewMessage small{opacity:.75;margin-top:2px}#qavliNewMessage strong{font-size:22px;font-weight:400}@media(prefers-reduced-motion:reduce){#qavliNewMessage{transition:none}}";
    document.head.appendChild(st);
  }
  el.dataset.chatId=chatId||"";
  el.querySelector("b").textContent=title;
  el.querySelector("small").textContent=body||"New message";
  el.style.opacity="1"; el.style.transform="translate(-50%,0)"; el.style.pointerEvents="auto";
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{el.style.opacity="0";el.style.transform="translate(-50%,-14px)";el.style.pointerEvents="none"},3500);
  el.onclick=()=>openChatFromUnread(el.dataset.chatId);
}
function openChatFromUnread(id){
  const b=document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(id)+'"]');
  if(b){b.click();return;}
  window.dispatchEvent(new CustomEvent("qavli-open-chat",{detail:{chatId:id}}));
}
function addBadge(id,count,preview){
  const b=document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(id)+'"]');
  if(!b)return;
  let badge=b.querySelector(".qavli-unread-badge");
  if(!badge){
    badge=document.createElement("span"); badge.className="qavli-unread-badge";
    badge.style.cssText="margin-left:auto;flex:none;min-width:24px;height:24px;padding:0 7px;display:grid;place-items:center;border-radius:999px;background:#f2a93b;color:#173f5f;font:800 11px system-ui;box-shadow:0 5px 12px rgba(242,169,59,.22)";
    b.appendChild(badge);
  }
  badge.textContent=count>99?"99+":String(count);
  b.style.borderColor="rgba(242,169,59,.45)";
  b.style.background="rgba(242,169,59,.09)";
  if(preview)b.dataset.qavliPreview=preview;
}
function clearBadge(id){
  const b=document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(id)+'"]');
  b?.querySelector(".qavli-unread-badge")?.remove();
  if(b){b.style.borderColor="";b.style.background="";}
  state.set(id,{...(state.get(id)||{}),unread:0});
}
async function markVisibleRead(id,messages){
  const uid=auth.currentUser?.uid;if(!uid)return;
  const updates=messages.filter(m=>m.senderId!==uid&&!m.readBy?.[uid]);
  for(const m of updates.slice(-20)){
    try{await updateDoc(doc(db,"chats",id,"messages",m.id),{["readBy."+uid]:new Date()});}catch{}
  }
  clearBadge(id);
}
function watchChat(chat){
  return onSnapshot(query(collection(db,"chats",chat.id,"messages"),orderBy("createdAt","desc"),limit(25)),snap=>{
    const messages=snap.docs.map(d=>({id:d.id,...d.data()})).reverse();
    const uid=auth.currentUser?.uid;
    const unread=messages.filter(m=>m.senderId!==uid&&!m.readBy?.[uid]&&!m.deleted);
    const previous=state.get(chat.id)?.unread||0;
    state.set(chat.id,{messages,unread:unread.length});
    if(isChatVisible(chat.id)){markVisibleRead(chat.id,messages);return;}
    if(unread.length){
      addBadge(chat.id,unread.length,unread.at(-1)?.text);
      if(unread.length>previous){
        const m=unread.at(-1);
        toast(chat.isGroup?(chat.name||"Group"):"New message",m?.text||(m?.fileName?"📎 "+m.fileName:"New message"),chat.id);
      }
    }
  });
}
function isChatVisible(id){return !!document.querySelector("#vchat.on")&&activeChatId===id;}
function sortedChats(chats){
  return chats.slice().sort((a,b)=>
    ((b.lastActivityAt?.seconds||b.createdAt?.seconds||0)-
     (a.lastActivityAt?.seconds||a.createdAt?.seconds||0))
  );
}
function syncRows(){
  const rows=[...document.querySelectorAll("#list .row")];
  const chats=sortedChats([...state.values()].map(s=>s.chat).filter(Boolean));
  rows.forEach((r,i)=>{if(chats[i])r.dataset.qavliChatId=chats[i].id;});
  for(const s of state.values())if(s.unread>0)addBadge(s.chat.id,s.unread,s.messages?.at(-1)?.text);
}
function start(chats){
  if(chatUnsub)chatUnsub();
  state.clear();
  const sorted=sortedChats(chats);
  const listeners=sorted.map(chat=>{state.set(chat.id,{chat,unread:0,messages:[]});return watchChat(chat);});
  chatUnsub=()=>listeners.forEach(u=>u());
  setTimeout(syncRows,400);
}
onAuthStateChanged(auth,user=>{
  if(!user){chatUnsub?.();chatUnsub=null;state.clear();return;}
  onSnapshot(query(collection(db,"chats"),where("members","array-contains",user.uid)),snap=>{
    start(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
});
new MutationObserver(syncRows).observe(document.body,{subtree:true,childList:true});
setInterval(()=>{
  const v=document.querySelector("#vchat.on"),title=$("#ct")?.textContent||"";
  if(v&&title){
    const found=[...state.values()].find(s=>{
      const r=document.querySelector('#list .row[data-qavli-chat-id="'+CSS.escape(s.chat.id)+'"]');
      return r?.querySelector("b")?.textContent===title;
    });
    if(found&&activeChatId!==found.chat.id){
      activeChatId=found.chat.id;
      markVisibleRead(found.chat.id,found.messages||[]);
    }
  }else activeChatId=null;
  syncRows();
},700);
window.addEventListener("qavli-chat-opened",e=>{activeChatId=e.detail?.chatId||null;if(activeChatId)clearBadge(activeChatId);});
