import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Bot, Mic, Square, Paperclip, PlayCircle, StopCircle,
  Globe, Camera, ImageUp, Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

// --- TYPE DEFINITIONS & CONSTANTS ---
export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  suggestions?: string[];
};

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  welcome: string;
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English', nativeName: 'English', welcome: "Welcome! How can I help you with your farming questions today?" },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', welcome: "नमस्ते! मैं आज आपकी खेती के सवालों में कैसे मदद कर सकता हूँ?" },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', welcome: "வணக்கம்! இன்று உங்கள் விவசாய கேள்விகளுக்கு நான் எப்படி உதவ முடியும்?" },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', welcome: "నమస్కారం! ఈ రోజు మీ వ్యవసాయ ప్రశ్నలతో నేను మీకు ఎలా సహాయపడగలను?" },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', welcome: "ನಮಸ್ಕಾರ! ಇಂದು ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?" },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', welcome: "നമസ്കാരം! ഇന്ന് നിങ്ങളുടെ കാർഷിക ചോദ്യങ്ങളിൽ ഞാൻ എങ്ങനെ സഹായിക്കും?" },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', welcome: "नमस्कार! आज मी तुमच्या शेतीच्या प्रश्नांसाठी कशी मदत करू शकेन?" },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', welcome: "નમસ્તે! આજે હું તમારા ખેતીના પ્રશ્નોમાં કેવી રીતે મદદ કરી શકું?" },
];

export const INITIAL_SUGGESTIONS: { [key: string]: string[] } = {
  'en-US': ["Best crops for summer?", "How to treat leaf curl disease?", "Organic fertilizer tips"],
  'hi-IN': ["गर्मी के लिए सबसे अच्छी फसलें?", "पत्ती मोड़क रोग का इलाज कैसे करें?", "जैविक खाद के टिप्स"],
  'ta-IN': ["கோடைக்கு சிறந்த பயிர்கள்?", "இலை சுருட்டு நோயை எவ்வாறு குணப்படுத்துவது?", "இயற்கை உரக் குறிப்புகள்"],
  'te-IN': ["వేసవికి ఉత్తమ పంటలు?", "ఆకు ముడత వ్యాధిని ఎలా నయం చేయాలి?", "సేంద్రీయ ఎరువుల చిట్కాలు"],
  'kn-IN': ["ಬೇಸಿಗೆಗೆ ಉತ್ತಮ ಬೆಳೆಗಳು?", "ಎಲೆ ಸುರುಳಿ ರೋಗವನ್ನು ಹೇಗೆ ಗುಣಪಡಿಸುವುದು?", "ಸಾವಯವ ಗೊಬ್ಬರದ ಸಲಹೆಗಳು"],
  'ml-IN': ["വേനൽക്കാലത്ത് മികച്ച വിളകൾ?", "ഇല ചുരുളൽ രോഗം എങ്ങനെ ചികിത്സിക്കാം?", "ജൈവ വളപ്രയോഗത്തിനുള്ള നുറുങ്ങുകൾ"],
  'mr-IN': ["उन्हाळ्यासाठी सर्वोत्तम पिके?", "पाने कुरूप होण्याच्या रोगावर उपचार कसे करावे?", "सेंद्रिय खताच्या टिप्स"],
  'gu-IN': ["ઉનાળા માટે શ્રેષ્ઠ પાક?", "પાન વાળવાના રોગનો ઉપચાર કેવી રીતે કરવો?", "ઓર્ગેનિક ખાતર ટિપ્સ"],
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GCP_API_KEY = import.meta.env.VITE_GCP_API_KEY;
if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not defined in .env file.");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- UI COMPONENTS ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button ref={ref} className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none rounded-xl active:scale-95 ${className}`} {...props}>
      {children}
    </button>
  )
);
Button.displayName = "Button";
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown>{content}</ReactMarkdown>
);

const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
  </div>
);

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    const savedLanguage = localStorage.getItem('kisanSaathi_language');
    return (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) ? savedLanguage : 'en-US';
  });
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  function getLanguageDetails(code: string) {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) ?? SUPPORTED_LANGUAGES[0];
  }

  // Always reset chat on language change (fixes welcome message and suggestions)
  useEffect(() => {
    setMessages([{ id: Date.now(), role: "assistant", content: getLanguageDetails(selectedLanguage).welcome }]);
    setUploadedImage(null);
    setError(null);
  }, [selectedLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // GEMINI
  async function handleSendMessage(messageText?: string) {
    const currentInput = (messageText || input).trim();
    if (!currentInput && !uploadedImage) return;
    setIsStreaming(true);
    setError(null);
    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;
    const userImage = uploadedImage;
    setMessages(prev => [
      ...prev,
      { id: userMessageId, role: "user", content: currentInput, imageUrl: userImage },
      { id: assistantMessageId, role: "assistant", content: "" }
    ]);
    setInput("");
    setUploadedImage(null);

    try {
      const languageName = getLanguageDetails(selectedLanguage).name;
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are KisanSaathi, an expert assistant for Indian farmers. Respond in ${languageName}.
- Format your response in the user's language with markdown. 
- Suggest 2-3 short follow-up questions if relevant, each starting with '>> '.`
      });

      let contentParts: Part[] = [{ text: currentInput }];
      if (userImage) {
        contentParts.push({ inlineData: { mimeType: userImage.match(/data:(.*);base64,/)![1], data: userImage.split(',')[1] } });
      }
      const result = await model.generateContentStream(contentParts);
      let fullResponse = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullResponse } : m));
      }
      const suggestions = fullResponse.match(/>> .*/g)?.map(s => s.substring(3).trim()) || [];
      const responseText = fullResponse.split('>>')[0].trim();
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: responseText, suggestions } : m));
    } catch (err: any) {
      setError((err as Error).message || "An unknown error occurred.");
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: "Sorry, I couldn't get a response due to an error." } : m));
    } finally {
      setIsStreaming(false);
    }
  }

  // All UI handlers below are language-independent and don't need change
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSendMessage(suggestion), 0);
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError("Please select a valid image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image file too large (max 10MB)."); return; }
    const reader = new FileReader();
    reader.onloadend = () => setUploadedImage(reader.result as string);
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };
  const handleAttachmentClick = (mode: 'gallery' | 'camera') => {
    if (mode === 'camera') fileInputRef.current?.setAttribute('capture', 'environment');
    else fileInputRef.current?.removeAttribute('capture');
    fileInputRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const handlePlayAudio = async (message: Message) => {
    if (playingAudioId === message.id) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    setGeneratingAudioId(message.id);
    setPlayingAudioId(null);
    setError(null);
    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCP_API_KEY}`, {
        method: 'POST',
        body: JSON.stringify({
          input: { text: message.content },
          voice: { languageCode: selectedLanguage, name: `${selectedLanguage}-Standard-A` },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });
      if (!response.ok) throw new Error(`GCP Error: ${response.statusText}`);
      const data = await response.json();
      const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingAudioId(null);
      setPlayingAudioId(message.id);
    } catch (err: any) {
      setError("Audio playback failed: " + (err as Error).message);
    } finally {
      setGeneratingAudioId(null);
    }
  };

  async function processAudioRecording(audioBlob: Blob) {
    setIsTranscribing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${GCP_API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: selectedLanguage },
            audio: { content: base64Audio },
          }),
        });
        if (!response.ok) throw new Error(`GCP Transcription Error: ${response.statusText}`);
        const data = await response.json();
        const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || "";
        if (transcript) setInput(prev => `${prev} ${transcript}`.trim());
        else setError("Could not detect any speech.");
      };
    } catch (err: any) {
      setError("Transcription failed: " + (err as Error).message);
    } finally {
      setIsTranscribing(false);
    }
  }
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
        processAudioRecording(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError("Microphone access denied. Please enable it in your browser settings.");
    }
  }
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }
  const handleMicClick = () => { isRecording ? stopRecording() : startRecording(); };

  // --- MAIN RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* -- HEADER: NEW LOGIC -- */}
      <header className="relative flex justify-between items-center p-4 text-white bg-gradient-to-r from-green-600 to-green-800 shadow-md z-20">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8" />
          <h1 className="text-xl font-semibold">KisanSaathi</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Backdrop before dropdown, always below */}
            {showLangDropdown && (
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLangDropdown(false)}
              />
            )}
            <Button
              onClick={() => setShowLangDropdown(prev => !prev)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Globe className="w-4 h-4 mr-2" />
              {getLanguageDetails(selectedLanguage).nativeName}
            </Button>
            {showLangDropdown && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-30"
                onClick={e => e.stopPropagation()}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      localStorage.setItem('kisanSaathi_language', lang.code);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      selectedLanguage === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                    }`}
                  >
                    {lang.nativeName} ({lang.name})
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => {
              setMessages([{ id: Date.now(), role: "assistant", content: getLanguageDetails(selectedLanguage).welcome }]);
              setInput("");
              setUploadedImage(null);
              setError(null);
              setPlayingAudioId(null);
            }}
            className="p-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* -- Main Chat -- */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-3 max-w-lg ${message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {message.role === 'assistant' && (
              <Bot className="w-8 h-8 p-1.5 text-green-700 bg-white rounded-full shadow-md border flex-shrink-0 self-start" />
            )}
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0 self-start">
                You
              </div>
            )}
            <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                {message.imageUrl && <img src={message.imageUrl} alt="User upload" className="mb-2 rounded-lg max-h-48" />}
                {isStreaming && message.content === "" && message.role === 'assistant' ? <TypingIndicator /> : <MarkdownMessage content={message.content} />}
              </div>
              {message.suggestions && message.suggestions.length > 0 && !isStreaming && (
                <div className="max-w-xl self-start w-full mt-2">
                  <div className="flex flex-wrap gap-2">
                    {message.suggestions.map((s, i) => (
                      <div key={i} className="text-xs px-3 py-1.5 bg-green-100/70 text-green-800 rounded-full cursor-default">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {message.role === 'assistant' && message.content && !isStreaming && (
              <Button onClick={() => handlePlayAudio(message)} className="p-2.5 bg-white rounded-full shadow-sm border hover:bg-gray-100 transition-colors">
                {generatingAudioId === message.id ? <TypingIndicator /> : (playingAudioId === message.id ? <StopCircle className="w-5 h-5 text-green-600" /> : <PlayCircle className="w-5 h-5 text-gray-600" />)}
              </Button>
            )}
          </motion.div>
        ))}
        {messages.length <= 1 && !isStreaming && (
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center pt-8">
            {(INITIAL_SUGGESTIONS[selectedLanguage] || INITIAL_SUGGESTIONS['en-US']).map((suggestion, i) => (
              <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSuggestionClick(suggestion)} className="text-sm px-4 py-2 bg-white border border-gray-300/80 text-gray-700 rounded-xl hover:bg-gray-200/60 transition-all shadow-sm">
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* -- Footer/Composer -- */}
      <footer className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-10">
        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-2 p-3 text-sm text-red-800 bg-red-100 rounded-xl flex justify-between items-center"><span>{error}</span><button onClick={() => setError(null)}><X size={18} /></button></motion.div>}
        </AnimatePresence>
        {isTranscribing && <div className="flex items-center justify-center text-sm text-gray-600 mb-2"><TypingIndicator /> Transcribing audio... please wait.</div>}
        {uploadedImage && <div className="mb-2 p-2 bg-gray-100 rounded-xl flex items-center gap-2"><img src={uploadedImage} alt="Preview" className="h-10 w-10 rounded-lg object-cover" /><span className="text-sm flex-1">Image will be sent with your message.</span><button onClick={() => setUploadedImage(null)}><X size={18} className="text-red-500" /></button></div>}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button onClick={() => setShowAttachmentMenu(prev => !prev)} className="p-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600"><Paperclip size={20} /></Button>
            <AnimatePresence>
              {showAttachmentMenu && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border p-2 z-10">
                <button onClick={() => handleAttachmentClick('gallery')} className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-gray-100"><ImageUp size={20} /> From Gallery</button>
                <button onClick={() => handleAttachmentClick('camera')} className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-gray-100"><Camera size={20} /> Take Photo</button>
              </motion.div>}
            </AnimatePresence>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={`Ask in ${getLanguageDetails(selectedLanguage).nativeName}...`} disabled={isStreaming || isTranscribing} rows={1} className="w-full p-3 text-sm bg-gray-100 rounded-xl border-transparent focus:outline-none focus:ring-2 focus:ring-green-500" />
          <Button onClick={handleMicClick} disabled={isStreaming} className="p-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600">{isRecording ? <Square size={20} className="text-red-500" /> : <Mic size={20} />}</Button>
          <Button onClick={() => handleSendMessage()} disabled={isStreaming || (!input.trim() && !uploadedImage)} className="p-3 bg-green-600 text-white rounded-xl w-14 h-12 flex items-center justify-center">{isStreaming ? <TypingIndicator /> : <Send size={20} />}</Button>
        </div>
      </footer>
      {showLangDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowLangDropdown(false)} />}
      {showAttachmentMenu && <div className="fixed inset-0 z-0" onClick={() => setShowAttachmentMenu(false)} />}
    </div>
  );
}
