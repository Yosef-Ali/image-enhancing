
import React, { useState } from 'react';
import Chatbot from './components/Chatbot';
import ImageEnhancer from './components/ImageEnhancer';
import { RobotIcon, ImageIcon } from './components/Icons';

type View = 'chat' | 'image';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('chat');

    const NavButton: React.FC<{ view: View, label: string, icon: React.ReactNode }> = ({ view, label, icon }) => (
        <button
            onClick={() => setCurrentView(view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === view
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-900 text-white overflow-hidden">
            <header className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-md">
                <div className="flex items-center gap-3">
                    <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_light_color_272x92dp.png" alt="Google Logo" className="h-6" />
                    <span className="text-xl font-semibold text-gray-200">Gemini AI Studio</span>
                </div>
                <nav className="flex items-center gap-2 p-1 bg-gray-900 rounded-lg">
                    <NavButton view="chat" label="Chatbot" icon={<RobotIcon className="w-5 h-5" />} />
                    <NavButton view="image" label="Image Enhancer" icon={<ImageIcon className="w-5 h-5" />} />
                </nav>
            </header>
            <main className="flex-1 p-4 md:p-8 overflow-hidden">
                {currentView === 'chat' && <Chatbot />}
                {currentView === 'image' && <ImageEnhancer />}
            </main>
        </div>
    );
};

export default App;
