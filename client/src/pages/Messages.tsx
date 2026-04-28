import React, { useState, useEffect, useRef } from 'react';
import { Send, Globe, Radio, Smartphone, Users, User, Clock, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initMeshSocket, getMeshStatus, sendMessage, generateSmsUri, MeshMessage } from '../lib/meshComm';
import { useStore } from '../store/useStore';
import { API_BASE_URL } from '../config';

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  deliveredVia: 'internet' | 'mesh' | 'sms' | 'pending';
}

export default function Messages() {
  const { t } = useTranslation();
  const { isOnline, user } = useStore();
  const MY_ID = user?.email || user?.id || 'coordinator_1';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeContact, setActiveContact] = useState('broadcast');
  const [input, setInput] = useState('');
  const [meshActive, setMeshActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contacts = [
    { id: 'broadcast', name: t('message.contact_broadcast'), icon: Users },
    { id: 'coordinator_2', name: t('message.contact_alpha'), icon: User },
    { id: 'coordinator_3', name: t('message.contact_haridwar'), icon: User },
  ];

  // Fetch internet messages
  useEffect(() => {
    if (isOnline) {
      fetch(`${API_BASE_URL}/api/messages/${MY_ID}`)
        .then(r => r.json())
        .then(data => setMessages(data))
        .catch(console.error);
    }
  }, [isOnline]);

  // Init mesh socket
  useEffect(() => {
    initMeshSocket((meshMsg: MeshMessage) => {
      // Receive mesh message
      if (meshMsg.to === MY_ID || meshMsg.to === 'broadcast') {
        const newMsg: Message = {
          id: meshMsg.id,
          senderId: meshMsg.from,
          recipientId: meshMsg.to,
          content: meshMsg.body,
          timestamp: meshMsg.ts,
          deliveredVia: 'mesh'
        };
        setMessages(prev => [...prev, newMsg]);
      }
    });

    const interval = setInterval(() => {
      setMeshActive(getMeshStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  // Helper to get a display name from a senderId
  const getSenderName = (senderId: string): string => {
    if (senderId === MY_ID) return t('message.you', { defaultValue: 'You' });
    // Check if senderId looks like an email
    if (senderId.includes('@')) return senderId.split('@')[0];
    // Check if it matches a known contact
    const contact = contacts.find(c => c.id === senderId);
    if (contact) return contact.name;
    // Fallback: show shortened ID
    return senderId.length > 12 ? senderId.substring(0, 12) + '…' : senderId;
  };

  const handleSend = async () => {
    if (!input.trim() || input.length > 160) return;
    
    const body = input.trim();
    setInput('');
    
    // Add optimistic pending message
    const tempId = Math.random().toString();
    const tempMsg: Message = {
      id: tempId,
      senderId: MY_ID,
      recipientId: activeContact,
      content: body,
      timestamp: Date.now(),
      deliveredVia: 'pending'
    };
    setMessages(prev => [...prev, tempMsg]);

    const mode = await sendMessage(MY_ID, activeContact, body);
    
    if (mode === 'sms') {
      // Trigger SMS fallback
      window.location.href = generateSmsUri(body, tempId);
    }
    
    // Update temp message with final mode
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, deliveredVia: mode } : m));
  };

  const currentMessages = messages.filter(
    m => (m.recipientId === activeContact && m.senderId === MY_ID) || 
         (m.senderId === activeContact && m.recipientId === MY_ID) ||
         (activeContact === 'broadcast' && m.recipientId === 'broadcast')
  );

  return (
    <div className="flex h-full bg-[#F8FAFC] relative overflow-hidden">
      {/* Contact List (Left) */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
        <div className="p-8 border-b border-slate-100 shrink-0">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('nav.messages')}</h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('message.net')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              <span className={`w-2 h-2 rounded-full ${meshActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('message.mesh')}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {contacts.map(contact => {
            const Icon = contact.icon;
            const isActive = activeContact === contact.id;
            return (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                  isActive ? 'bg-white/20 scale-110 shadow-inner' : 'bg-slate-100 text-slate-500 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-500'
                }`}>
                  <Icon size={24} />
                </div>
                <div className="text-left">
                  <h3 className={`font-black text-sm tracking-tight ${isActive ? 'text-white' : 'text-slate-700'}`}>
                    {contact.name}
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {contact.id === 'broadcast' ? t('message.global_channel') : t('message.active_personnel')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Area (Right) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="p-6 border-b border-slate-200/50 bg-white/70 backdrop-blur-md flex items-center gap-4 shrink-0 z-10 sticky top-0">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400 shadow-lg">
            {activeContact === 'broadcast' ? <Users size={24} /> : <User size={24} />}
          </div>
          <div>
            <h2 className="font-black text-slate-800 text-lg tracking-tight">
              {contacts.find(c => c.id === activeContact)?.name}
            </h2>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">{t('message.secure_encryption')}</p>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
          {currentMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="font-black text-sm uppercase tracking-widest">{t('message.no_transmissions')}</p>
            </div>
          )}
          {currentMessages.map(msg => {
            const isMe = msg.senderId === MY_ID;
            const senderName = getSenderName(msg.senderId);
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                {/* Sender name label */}
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 px-2 ${
                  isMe ? 'text-blue-400' : 'text-slate-400'
                }`}>
                  {senderName}
                </p>
                <div className={`max-w-[65%] p-5 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-md ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-900/10' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-2 mt-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/50 border border-slate-200/50">
                      {msg.deliveredVia === 'internet' && <Globe size={10} className="text-emerald-500" />}
                      {msg.deliveredVia === 'mesh' && <Radio size={10}  className="text-blue-500" />}
                      {msg.deliveredVia === 'sms' && <Smartphone size={10} className="text-amber-500" />}
                      {msg.deliveredVia === 'pending' && <Clock size={10}  className="text-rose-500 animate-spin" />}
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{msg.deliveredVia}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-white border-t border-slate-200/50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div className="relative group max-w-4xl mx-auto">
            <textarea 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t('message.type_placeholder')}
              className="w-full resize-none rounded-3xl border-2 border-slate-100 focus:outline-none focus:border-blue-400 py-5 pl-6 pr-24 h-20 text-sm font-medium bg-slate-50/50 focus:bg-white transition-all shadow-inner"
            />
            <div className="absolute right-20 top-5 text-[10px] font-black tracking-widest text-slate-300">
              <span className={input.length > 160 ? 'text-rose-500' : ''}>{input.length}</span> / 160
            </div>
            <button 
              onClick={handleSend}
              disabled={!input.trim() || input.length > 160}
              className="absolute right-4 top-4 bottom-4 aspect-square flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg shadow-blue-900/20 active:scale-90"
            >
              <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
            </button>
          </div>
          {input.length > 160 && (
            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-3 text-center animate-bounce">{t('message.exceeds_length')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
