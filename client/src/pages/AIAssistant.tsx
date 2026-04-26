import React, { useState } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { API_BASE_URL } from '../config';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  lang?: string;
  model?: string;
}

export default function AIAssistant() {
  const { t, i18n } = useTranslation();
  const { isOnline, enqueueAction, setLatestPlan } = useStore();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: t('ai.hello') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const quickActions = [
    t('ai.quick_action_1'),
    t('ai.quick_action_2'),
    t('ai.quick_action_3')
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      if (!isOnline) {
        await enqueueAction(`${API_BASE_URL}/api/chat`, 'POST', { query: text, language: i18n.language });
        setMessages([...newMessages, { role: 'assistant', content: t('message.offline_notice') }]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, language: i18n.language })
      });
      const data = await res.json();
      
      let aiText = data.reply;
      
      if (data.error) {
        aiText = t('ai.error_prefix', { defaultValue: 'Error: ' }) + data.error;
      }

      setMessages([...newMessages, { 
        role: 'assistant', 
        content: aiText,
        lang: i18n.language === 'hi' ? 'हिन्दी' : 'English',
        model: 'Gemini 2.5 Flash' 
      }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: 'assistant', content: t('ai.error') }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('ai.title')}</h2>
          <p className="text-sm text-slate-500">{t('ai.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#F8FAFC]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'user' ? 'bg-[#0A1220] text-blue-400' : 'bg-blue-600 text-white'
            }`}>
              {msg.role === 'user' ? <User size={24} /> : <Bot size={24} />}
            </div>
            <div className={`max-w-[70%] group relative ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div className={`rounded-3xl p-5 shadow-sm border transition-all duration-300 ${
                msg.role === 'user' 
                  ? 'bg-white border-slate-200 text-slate-800 rounded-tr-none hover:border-blue-200' 
                  : 'bg-white border-blue-100 text-slate-800 rounded-tl-none hover:shadow-blue-900/5'
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
                
                {msg.role === 'assistant' && msg.lang && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-blue-400" /> {msg.model}</span>
                    <span>{msg.lang}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl rounded-tl-none p-4 flex items-center gap-2 text-slate-500">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              onClick={() => sendMessage(action)}
              className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all duration-300 active:scale-95 shadow-sm"
            >
              {action}
            </button>
          ))}
        </div>
        <div className="relative group">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder={t('ai.placeholder')}
            className="w-full pl-6 pr-14 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-blue-400 bg-slate-50/50 focus:bg-white transition-all shadow-inner"
          />
          <button 
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="absolute right-3 top-3 bottom-3 aspect-square flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-200 transition-all shadow-lg shadow-blue-900/20 active:scale-90"
          >
            <Send size={18} className={input.trim() && !loading ? "ml-0.5" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
