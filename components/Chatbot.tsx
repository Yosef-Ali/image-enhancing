
import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import type { Chat } from '@google/genai';
import { createChat } from '../services/geminiService';
import { SendIcon, UserIcon, RobotIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm Gemini. How can I assist you today?", sender: 'bot' },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatRef.current = createChat();
    }, []);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            if (!chatRef.current) {
                throw new Error("Chat not initialized");
            }

            const response = await chatRef.current.sendMessage({ message: input });
            const botMessage: Message = { id: Date.now().toString() + '-bot', text: response.text, sender: 'bot' };
            setMessages((prev) => [...prev, botMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            const errorBotMessage: Message = { id: Date.now().toString() + '-bot-error', text: `Sorry, I encountered an error: ${errorMessage}`, sender: 'bot' };
            setMessages((prev) => [...prev, errorBotMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {messages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                        {message.sender === 'bot' && (
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                                <RobotIcon className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <div className={`px-4 py-3 rounded-xl max-w-md ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                           <p className="whitespace-pre-wrap">{message.text}</p>
                        </div>
                        {message.sender === 'user' && (
                           <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-4">
                         <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
                            <RobotIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-xl bg-gray-700 text-gray-200 rounded-bl-none flex items-center">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-2"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-2 delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-gray-900/50 border-t border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Gemini anything..."
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-300"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-indigo-600 text-white rounded-full p-3 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                    >
                        {isLoading ? <LoadingSpinner /> : <SendIcon className="w-6 h-6" />}
                    </button>
                </form>
                {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default Chatbot;
