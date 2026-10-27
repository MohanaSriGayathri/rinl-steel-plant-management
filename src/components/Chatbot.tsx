import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      text: 'Hello! How can I help you with RINL steel plant operations today?',
      isBot: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: ChatMessage = { text: inputValue.trim(), isBot: false };
    const currentHistory = [...messages, userMessage];
    setMessages(currentHistory);
    setInputValue('');
    setLoading(true);

    try {
      // 1. Preferred secure approach: Invoke Supabase Edge Function (keeps API keys on the server)
      try {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { messages: currentHistory }
        });

        if (!error && data?.reply) {
          setMessages((prev) => [...prev, { text: data.reply, isBot: true }]);
          return;
        }
      } catch (fnErr) {
        // If function is not deployed or unreachable, fall through to client dev fallback
        console.debug('Supabase chat edge function invocation skipped:', fnErr);
      }

      // 2. Client fallback for local development if VITE_GROQ_API_KEY is configured
      const localKey = import.meta.env.VITE_GROQ_API_KEY;
      if (localKey && localKey !== 'your_groq_api_key_here') {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: GROQ_MODEL,
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant for RINL steel plant operations. Answer questions on steel production, blast furnaces, raw materials, inventory, and equipment efficiently.',
              },
              ...currentHistory.map((msg) => ({
                role: msg.isBot ? 'assistant' : 'user',
                content: msg.text,
              })),
            ],
            temperature: 0.7,
            max_tokens: 1024,
          },
          {
            headers: {
              Authorization: `Bearer ${localKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const botReply = response.data.choices?.[0]?.message?.content;
        if (botReply) {
          setMessages((prev) => [...prev, { text: botReply, isBot: true }]);
          return;
        }
      }

      // 3. Inform the user how to enable AI if neither is configured
      setMessages((prev) => [
        ...prev,
        {
          text:
            'AI Assistant is currently offline. To enable it, deploy the Supabase `chat` Edge Function or provide a valid GROQ API key in your environment.',
          isBot: true,
        },
      ]);
    } catch (err: unknown) {
      console.error('Chatbot error:', err);
      let errorMsg = 'Failed to get a response from AI.';

      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
        errorMsg = axiosErr.response?.data?.error?.message || axiosErr.message;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          text: `Notice: ${errorMsg}`,
          isBot: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          aria-label="Open RINL Assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-2xl w-80 sm:w-96 h-[26rem] flex flex-col animate-in slide-in-from-bottom-5 duration-300 border border-gray-200">
          <div className="bg-slate-900 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-semibold text-sm">RINL Steel Plant Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white"
              aria-label="Close Assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.isBot
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-teal-600 text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-xs text-gray-500 italic p-1">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                </div>
                <span>RINL Assistant is typing...</span>
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-gray-50 rounded-b-lg">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about steel grades, stock, shifts..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !inputValue.trim()}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-2 rounded-md transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
