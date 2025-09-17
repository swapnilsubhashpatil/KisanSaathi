import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trash2, X, Send, Bot, Loader, Mic, Square, Paperclip, 
  PlayCircle, StopCircle, Globe
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

// --- 🚨 SECURITY & SETUP 🚨 ---
// This is for LOCAL DEVELOPMENT ONLY. DO NOT DEPLOY WITH KEYS HERE.
const GEMINI_API_KEY = "AIzaSyAck8WYOe9sO7s0v852F9WbPgwS1ldsqps"; // For all AI features
const GCP_API_KEY = "AIzaSyAck8WYOe9sO7s0v852F9WbPgwS1ldsqps";   // For audio services

// --- Initialize SDKs ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- INTERFACES AND TYPES ---
interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

// --- CONSTANTS ---
const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'en-US', name: 'English', nativeName: 'English' },
    { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];

// --- UI HELPER COMPONENTS ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-gray-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
      li: ({ children }) => <li className="ml-2">{children}</li>,
      code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
      pre: ({ children }) => <pre className="bg-gray-800 text-white p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>
    }}
  >
    {content}
  </ReactMarkdown>
);

// --- MAIN FULL-PAGE CHAT COMPONENT ---
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ content: string; audio: HTMLAudioElement } | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  
  // State for the new language dropdown
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages]);

  const getLanguageName = (code: string): string => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.nativeName : 'English';
  };

  const handleClearChat = useCallback(() => { setMessages([]); setUploadedImage(null); setError(null); }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Please select a valid image file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("Image file too large. Please select a file under 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.onerror = () => setError("Failed to read image file.");
      reader.readAsDataURL(file);
    }
  };

  // --- Core Message Sending Logic (Gemini 1.5 Flash) ---
  const handleSendMessage = useCallback(async () => {
    const messageContent = input.trim();
    if (!messageContent && !uploadedImage) return setError("Please type a message or upload an image.");

    setIsLoading(true);
    setError(null);

    const userMessage: Message = { role: "user", content: messageContent, imageUrl: uploadedImage };
    setMessages(prev => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setUploadedImage(null);

    try {
      const languageName = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are Krishak-AI, a helpful and knowledgeable assistant for Indian farmers. Respond in ${languageName}. Provide clear, practical, and actionable advice. Use simple language. Keep responses concise. If asked a non-farming question, gently steer the conversation back to agriculture.`
      });

      let contentParts: Part[] = [];
      
      const historyText = messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n');
      if (historyText) {
        contentParts.push({ text: `Previous conversation:\n${historyText}\n\nCurrent query:` });
      }
      
      contentParts.push({ text: messageContent });
      
      if (uploadedImage) {
        const imagePart: Part = {
          inlineData: {
            mimeType: uploadedImage.match(/data:(.*);base64,/)![1],
            data: uploadedImage.split(',')[1]
          }
        };
        contentParts.push(imagePart);
      }
      
      const response = await model.generateContent(contentParts);
      const fullContent = response.response.text();
      
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = fullContent || "Sorry, I couldn't generate a response.";
        return updated;
      });
      
      if (!fullContent) {
        throw new Error("No content received from Gemini");
      }
      
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      const errorMessage = err.message || "An unexpected error occurred.";
      setError(errorMessage);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = `Sorry, there was an error: ${errorMessage}`;
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, uploadedImage, selectedLanguage]);

  // --- GCP Text-to-Speech ---
  const handlePlayAudio = async (content: string) => {
    if (playingAudio?.audio) {
      playingAudio.audio.pause();
      if (playingAudio.content === content) return setPlayingAudio(null);
    }
    setIsLoading(true);
    setError(null);
    try {
      const voiceName = selectedLanguage === 'en-US' ? 'en-US-Studio-O' : `${selectedLanguage}-Standard-A`;
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCP_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: content },
          voice: { languageCode: selectedLanguage, name: voiceName },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });
      if (!response.ok) throw new Error(`GCP Error: ${response.statusText}`);
      const data = await response.json();
      const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setPlayingAudio({ content, audio });
      audio.play();
      audio.onended = () => setPlayingAudio(null);
    } catch (err: any) {
      setError("Audio playback failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- GCP Speech-to-Text ---
  const processAudioRecording = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GCP_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: selectedLanguage,
              alternativeLanguageCodes: ['en-US', 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'gu-IN']
            },
            audio: { content: base64Audio },
          }),
        });
        if (!response.ok) throw new Error(`GCP Error: ${response.statusText}`);
        const data = await response.json();
        const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || "";
        if (transcript) setInput(prev => `${prev} ${transcript}`.trim());
        else setError("Could not detect any speech.");
      };
    } catch (err: any) {
      setError("Transcription failed: " + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Microphone MediaRecorder Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
        await processAudioRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicClick = () => { isRecording ? stopRecording() : startRecording(); };

  // --- JSX RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex justify-between items-center p-4 text-white bg-gradient-to-r from-green-600 to-green-800 shadow-md z-20">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8" />
          <h1 className="text-xl font-semibold">Krishak AI - Multilingual</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Globe className="w-4 h-4 mr-2" />
              {getLanguageName(selectedLanguage)}
            </Button>
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${selectedLanguage === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                      }`}
                  >
                    {lang.nativeName} ({lang.name})
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleClearChat} className="p-2 bg-white/20 hover:bg-white/30 text-white border-white/30">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-4 items-end ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === 'assistant' && (
              <Bot className="w-8 h-8 p-1.5 text-green-700 bg-white rounded-full shadow-md border flex-shrink-0" />
            )}
            <div className={`max-w-[85%] p-4 rounded-xl shadow-lg ${message.role === "user" ? "bg-gradient-to-br from-green-600 to-green-800 text-white" : "bg-white text-gray-800 border"}`}>
              {message.imageUrl && (
                <img src={message.imageUrl} alt="User upload" className="mb-2 rounded-lg max-h-48 object-cover" />
              )}
              <MarkdownMessage content={message.content || (isLoading && index === messages.length - 1 ? "..." : "")} />
            </div>
            {message.role === 'assistant' && message.content && !isLoading && (
              <button
                onClick={() => handlePlayAudio(message.content)}
                title={playingAudio?.content === message.content ? "Stop" : "Listen"}
                className="p-2 text-gray-500 hover:text-green-600 transition-colors"
              >
                {playingAudio?.content === message.content ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
              </button>
            )}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        {error && (
          <div className="mb-2 p-3 text-sm text-red-700 bg-red-100 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {uploadedImage && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <img src={uploadedImage} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
            <span className="text-sm text-gray-600">Image attached</span>
            <button onClick={() => setUploadedImage(null)}><X className="w-4 h-4 text-red-500" /></button>
          </div>
        )}
        {isTranscribing && (
          <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
            <Loader className="w-4 h-4 animate-spin mr-2" />
            <span>Transcribing audio...</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} className="p-3">
            <Paperclip className="w-5 h-5" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isRecording ? "Recording... Click mic to stop." : `Ask in ${getLanguageName(selectedLanguage)}...`}
            disabled={isLoading || isRecording || isTranscribing}
            rows={1}
            className="flex-grow p-3 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <Button
            onClick={handleMicClick}
            disabled={isLoading || isTranscribing}
            className={`p-3 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || isRecording || isTranscribing}
            className="p-3 bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading || isTranscribing ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </footer>
      
      {/* Click outside handler for language dropdown */}
      {showLanguageDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowLanguageDropdown(false)}
        />
      )}
    </div>
  );
}