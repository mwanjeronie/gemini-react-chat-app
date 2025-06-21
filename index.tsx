/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

function App() {
  const [chat, setChat] = useState<Chat | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const newChat = ai.chats.create({
          model: MODEL_NAME,
          config: {
            systemInstruction: 'You are a helpful and friendly chat assistant.',
          },
        });
        setChat(newChat);
        setIsLoading(true);
        // Initial greeting from the AI
        const welcomeMessage = "Hello! How can I help you today? 😊";
        const initialMessageId = Date.now().toString();
        setChatHistory([{ id: initialMessageId, role: 'model', text: '' }]);

        let currentText = '';
        for (const char of welcomeMessage) {
            currentText += char;
            setChatHistory([{ id: initialMessageId, role: 'model', text: currentText }]);
            await new Promise(resolve => setTimeout(resolve, 30)); // Simulate streaming
        }

      } catch (e) {
        console.error(e);
        setError('Failed to initialize the chat. Please ensure your API key is set up correctly.');
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userInput,
    };
    setChatHistory((prevHistory) => [...prevHistory, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const responseStream = await chat.sendMessageStream({ message: userInput });
      let currentText = '';
      const modelMessageId = (Date.now() + 1).toString(); // Unique ID for model's response

      // Add a placeholder for the model's response
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { id: modelMessageId, role: 'model', text: '' },
      ]);

      for await (const chunk of responseStream) {
        currentText += chunk.text;
        setChatHistory((prevHistory) =>
          prevHistory.map((msg) =>
            msg.id === modelMessageId ? { ...msg, text: currentText } : msg
          )
        );
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred while sending the message. Please try again.');
      // Optionally remove the placeholder or add an error message in chat
      setChatHistory(prev => prev.filter(msg => msg.id !== (Date.now() + 1).toString())); // Quick way to remove if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-app">
      <header className="app-header">
        <h1>Gemini Chat</h1>
      </header>
      <div className="chat-container" ref={chatContainerRef} aria-live="polite">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length -1].role === 'user' && (
           <div className="message model">
             <p className="loading-dots"><span>.</span><span>.</span><span>.</span></p>
           </div>
        )}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <form className="input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          aria-label="Your message"
          disabled={isLoading || !chat}
        />
        <button type="submit" disabled={isLoading || !userInput.trim() || !chat}>
          Send
        </button>
      </form>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
