import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, User, Check, CheckCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthProvider';

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  status: 'sent' | 'delivered' | 'read';
}

interface Chat {
  id: string;
  participantIds: string[];
  lastMessage: string;
  lastTimestamp: Timestamp;
  // UI derived
  otherUser?: {
    name: string;
    photoUrl: string;
  };
}

export function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('lastTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList: Chat[] = [];
      for (const d of snapshot.docs) {
        const data = d.data();
        const otherUserId = data.participantIds.find((id: string) => id !== user.uid);
        
        // Fetch other user info
        const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
        const otherUserData = otherUserSnap.data();

        chatList.push({
          id: d.id,
          ...data,
          otherUser: {
            name: otherUserData?.name || 'Utilisateur',
            photoUrl: otherUserData?.photoUrl || `https://ui-avatars.com/api/?name=${otherUserData?.name || 'U'}`
          }
        } as Chat);
      }
      setChats(chatList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', '/chats');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, `chats/${selectedChat.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Message[];
      setMessages(msgList);
    }, (error) => {
      handleFirestoreError(error, 'list', `/chats/${selectedChat.id}/messages`);
    });

    return unsubscribe;
  }, [selectedChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedChat || !user) return;

    const text = inputValue.trim();
    setInputValue('');

    try {
      await addDoc(collection(db, `chats/${selectedChat.id}/messages`), {
        senderId: user.uid,
        chatId: selectedChat.id,
        text,
        timestamp: serverTimestamp(),
        status: 'sent'
      });
    } catch (error) {
      handleFirestoreError(error, 'create', `/chats/${selectedChat.id}/messages`);
    }
  };

  const formatTime = (ts: Timestamp) => {
    if (!ts) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-6">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Connectez-vous pour voir vos messages</h2>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto">Communiquez avec vos mentors et suivez vos apprentissages en direct.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher mentor..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium" 
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>
          ) : chats.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Aucun message pour le moment</div>
          ) : chats.filter(c => c.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Aucun mentor trouvé</div>
          ) : (
            chats
              .filter(chat => chat.otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(chat => (
              <button 
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "w-full p-5 flex gap-4 hover:bg-slate-50 transition-all border-b border-slate-50 text-left relative group",
                  selectedChat?.id === chat.id && "bg-teal-50/30 md:bg-teal-50/50"
                )}
              >
                <div className="relative shrink-0">
                  <img src={chat.otherUser?.photoUrl} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" alt="" referrerPolicy="no-referrer" />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{chat.otherUser?.name}</h4>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                      {formatTime(chat.lastTimestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-medium">
                    {chat.lastMessage || 'Nouvelle conversation'}
                  </p>
                </div>
                {selectedChat?.id === chat.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-brand-primary rounded-r-full" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {selectedChat ? (
          <>
            {/* Header */}
            <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={selectedChat.otherUser?.photoUrl} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" alt="" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">{selectedChat.otherUser?.name}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                      Actif maintenant
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scroll-smooth"
            >
              {messages.map(msg => (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start"
                )}>
                  <div className={cn(
                    "px-5 py-3.5 rounded-2xl text-sm font-medium shadow-sm leading-relaxed",
                    msg.senderId === user.uid 
                      ? "bg-brand-primary text-white rounded-tr-none shadow-teal-900/10" 
                      : "bg-white text-slate-900 border border-slate-100 rounded-tl-none shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatTime(msg.timestamp)}</span>
                    {msg.senderId === user.uid && (
                      msg.status === 'read' ? <CheckCheck size={14} className="text-brand-primary" /> : <Check size={14} className="text-slate-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <form 
                className="flex gap-3"
                onSubmit={handleSendMessage}
              >
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Écrivez votre message..." 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-3.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium" 
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-teal-100 hover:bg-brand-secondary transition-all active:scale-90 disabled:opacity-50 disabled:active:scale-100"
                >
                  <Send size={22} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center opacity-60">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-8">
              <MessageSquare size={40} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Centre de Messagerie</p>
            <p className="text-sm font-medium">Sélectionnez une discussion pour commencer à échanger.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageSquare({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
