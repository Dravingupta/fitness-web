import React, { useState, useRef, useEffect } from 'react';
import { chatWithCoach } from '../services/backendService';
import { Send, User, Bot } from 'lucide-react';

const ChatCoach = ({ user, messages, onUpdateMessages }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', text: input, timestamp: Date.now() };
        const updatedHistory = [...messages, userMsg];

        onUpdateMessages(updatedHistory);
        setInput('');
        setLoading(true);

        try {
           

            const historyForApi = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await chatWithCoach(userMsg.text, historyForApi);

            const botMsg = { role: 'model', text: responseText, timestamp: Date.now() };
            onUpdateMessages([...updatedHistory, botMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg = { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again.", timestamp: Date.now() };
            onUpdateMessages([...updatedHistory, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-800/50" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                                {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                            </div>
                            <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-100 dark:border-slate-600 rounded-bl-none'
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex items-end gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center"><Bot className="w-3 h-3 text-white" /></div>
                            <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-slate-600">
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm text-gray-800 dark:text-white placeholder-gray-400"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatCoach;
