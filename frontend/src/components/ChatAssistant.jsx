import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, Loader2, Sparkles } from 'lucide-react';

export default function ChatAssistant({ sessionId, summary }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am CleanIQ. I have analyzed your dataset. Ask me anything about the issues found or how to fix them!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const baseUrl = import.meta.env.VITE_API_URL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    
    try {
        const res = await axios.post(`${baseUrl}/chat`, {
            session_id: sessionId,
            message: userMsg
        });
        
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to my AI brain.' }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col h-[500px] xl:h-full relative overflow-hidden group">
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
            <div className="bg-primary-50 p-2 rounded-xl text-primary-600 border border-primary-100">
                <Bot size={22} />
            </div>
            <div>
                <h3 className="font-bold text-slate-800 text-sm">CleanIQ Assistant</h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    Powered by Groq llama3 <Sparkles size={10} className="text-amber-500" />
                </p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm shadow-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                        {msg.content}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 rounded-tl-sm shadow-sm">
                        <Loader2 size={16} className="text-primary-500 animate-spin" />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your dataset..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-sm"
                />
                <button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="absolute right-2 p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Send size={16} />
                </button>
            </div>
        </form>
    </div>
  );
}
