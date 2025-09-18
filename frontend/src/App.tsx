import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Mic, Square, Paperclip, PlayCircle, StopCircle,
  Globe, Camera, ImageUp, Trash2, Brain, Search, ChevronUp, ChevronDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// Import new services
import { generateTextResponse } from "./services/aiService";
import { analyzeImage } from "./services/imageAnalysisService";
import { synthesizeSpeech } from "./services/textToSpeechService";
import { transcribeAudio } from "./services/voiceTranscribeService";
import { generatePerplexityResponse, generatePerplexitySearchResponse, convertToPerplexityMessages, type PerplexityResponse } from "./services/perplexityService";
import { generateThinkingResponse, type ThinkingResponse } from "./services/thinkingService";

// NOTE: Add this to your main CSS file (e.g., index.css) to style markdown
/*
.markdown-content strong {
  color: #15803d; // Example: A nice green color for bolded text
}
*/

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  suggestions?: string[];
  searchResults?: Array<{
    title: string;
    url: string;
    date?: string;
    last_updated?: string;
    snippet: string;
  }>;
  thinking?: string;
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
    'kn-IN': ["ಬೇಸಿಗೆಗೆ ಉತ್ತಮ ಬೆಳೆಗಳು?", "ಎಲೆ ಸುರುಳಿ ರೋಗವನ್ನು ಹೇಗೆ ಗುಣಪಡಿಸುವುದು?", "ಸಾವಯವ ಗೊಬ್ಬರದ ಸಲಹೆಗಳು"],
    'ml-IN': ["വേനൽക്കാലത്ത് മികച്ച വിളകൾ?", "ഇല ചുരുളൽ രോഗം എങ്ങനെ ചികിത്സിക്കാം?", "ജൈവ വളപ്രയോഗത്തിനുള്ള നുറുങ്ങുകൾ"],
    'mr-IN': ["उन्हाळ्यासाठी सर्वोत्तम पिके?", "पाने कुरूप होण्याच्या रोगावर उपचार कसे करावे?", "सेंद्रिय खताच्या टिप्स"],
    'gu-IN': ["ઉનાળા માટે શ્રેષ્ઠ પાક?", "પાન વાળવાના રોગનો ઉપચાર કેવી રીતે કરવો?", "ઓર્ગેનિક ખાતર ટિપ્સ"],
};


// --- UI COMPONENTS (Keep as is) ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button ref={ref} className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none rounded-xl active:scale-95 ${className}`} {...props}>
      {children}
    </button>
  )
);
Button.displayName = "Button";

// Add a class for styling
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <div className="markdown-content">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} />
    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} />
  </div>
);


// --- CHAT PERSISTENCE FUNCTIONS ---
const CHAT_STORAGE_KEY = 'kisanSaathi_chat_history';

const saveChatHistory = (messages: Message[]) => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to save chat history:', error);
  }
};

const loadChatHistory = (): Message[] => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn('Failed to load chat history:', error);
    return [];
  }
};

const clearChatHistory = () => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear chat history:', error);
  }
};

// Function to clean markdown formatting for text-to-speech
const cleanMarkdownForSpeech = (text: string): string => {
  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic *text*
    .replace(/```.*?```/gs, '')      // Remove code blocks
    .replace(/`(.*?)`/g, '$1')       // Remove inline code
    .replace(/#{1,6}\s*/g, '')       // Remove headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
    .replace(/^\s*[-*+]\s+/gm, '')   // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '')   // Remove numbered list markers
    .replace(/\n\s*\n/g, '\n')       // Clean up extra newlines
    .trim();

  // Check byte length and truncate if necessary (GCP TTS limit is 5000 bytes)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(cleaned);

  if (bytes.length > 5000) {
    // Find a safe truncation point (roughly 80% of limit to account for multi-byte chars)
    const maxChars = Math.floor(4000 / 4); // Conservative estimate for UTF-8
    cleaned = cleaned.substring(0, maxChars);

    // Try to end at a sentence or word boundary
    const lastSentence = cleaned.lastIndexOf('.');
    const lastWord = cleaned.lastIndexOf(' ');

    if (lastSentence > cleaned.length * 0.7) {
      cleaned = cleaned.substring(0, lastSentence + 1);
    } else if (lastWord > cleaned.length * 0.7) {
      cleaned = cleaned.substring(0, lastWord);
    }

    cleaned += '...';
  }

  return cleaned;
};

// --- MAIN COMPONENT ---
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => loadChatHistory());
  const [input, setInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => localStorage.getItem('kisanSaathi_language') || 'en-US');
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [useSearch, setUseSearch] = useState<boolean>(false); // Toggle search on/off
  const [useThinking, setUseThinking] = useState<boolean>(false); // Toggle thinking on/off
  const [showThinkingDrawer, setShowThinkingDrawer] = useState<boolean>(false); // Show/hide thinking drawer

  function getLanguageDetails(code: string) {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) ?? SUPPORTED_LANGUAGES[0];
  }

  useEffect(() => {
    // Only set welcome message if there are no messages or only one welcome message
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === "assistant")) {
      setMessages([{ id: Date.now(), role: "assistant", content: getLanguageDetails(selectedLanguage).welcome }]);
    }
    setUploadedImage(null);
    setError(null);
  }, [selectedLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save chat history whenever messages change (but skip initial load)
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Handle page refresh - clear chat history
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearChatHistory();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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
      // **IMPROVEMENT: CONTEXT MANAGEMENT**
      let history: any[] = messages
        .filter(m => m.content && m.id !== assistantMessageId) // Ensure content exists and exclude current assistant message
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Ensure history starts with user message (Google AI requirement)
      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }
      
      const stream = userImage
        ? await analyzeImage(
            currentInput,
            { inlineData: { mimeType: userImage.match(/data:(.*);base64,/)![1], data: userImage.split(',')[1] } }
          )
        : useThinking
        ? await generateThinkingResponse(
            `You are a helpful assistant specializing in agriculture. Provide accurate, practical information for farmers.\n\nUser question: ${currentInput}`,
            {
              model: 'qwen/qwen3-32b',
              temperature: 0.6,
            }
          )
        : useSearch
        ? await generatePerplexitySearchResponse(
            convertToPerplexityMessages([
              { role: 'system', content: 'You are a helpful assistant specializing in agriculture. Provide accurate, practical information for farmers.' },
              { role: 'user', content: currentInput }
            ]),
            {
              model: 'sonar',
              temperature: 0.2,
              max_tokens: 2048,
              stream: false,
            }
          )
        : await generateTextResponse(
            currentInput,
            history,
            getLanguageDetails(selectedLanguage).name
          );

      let fullResponse = "";
      
      if (useThinking && !userImage) {
        // Handle Thinking response
        const thinkingResponse = stream as ThinkingResponse;
        fullResponse = thinkingResponse.answer;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
          ...m, 
          content: fullResponse,
          thinking: thinkingResponse.thoughts
        } : m));
      } else if (useSearch && !userImage) {
        // Handle Perplexity search response (non-streaming)
        const responseData = stream as PerplexityResponse;
        fullResponse = responseData.choices[0].message.content;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
          ...m, 
          content: fullResponse,
          searchResults: responseData.search_results
        } : m));
      } else {
        // Handle Google AI streaming response
        const streamingResponse = stream as AsyncGenerator<any, any, any>;
        for await (const chunk of streamingResponse) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: fullResponse } : m));
        }
      }

      // Extract suggestions (only for Google AI responses)
      const suggestions = !useSearch && !userImage ? fullResponse.match(/>> .*/g)?.map(s => s.substring(3).trim()) || [] : [];
      const responseText = !useSearch && !userImage ? fullResponse.split('>>')[0].trim() : fullResponse;
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: responseText, suggestions } : m));

    } catch (err: any) {
      setError((err as Error).message || "An unknown error occurred.");
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: "Sorry, I couldn't get a response due to an error." } : m));
    } finally {
      setIsStreaming(false);
    }
  }

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
      // **IMPROVEMENT: Using the TTS service with cleaned text**
      const cleanedContent = cleanMarkdownForSpeech(message.content);
      const audioElement = await synthesizeSpeech(cleanedContent, selectedLanguage);
      audioRef.current = audioElement;
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
        // **IMPROVEMENT: Using the transcription service**
        const transcript = await transcribeAudio(audioBlob, selectedLanguage);
        if (transcript) {
            setInput(prev => `${prev} ${transcript}`.trim());
        } else {
            setError("Could not detect any speech.");
        }
    } catch (err: any) {
        setError("Transcription failed: " + (err as Error).message);
    } finally {
        setIsTranscribing(false);
    }
  }

  // --- Other handlers (startRecording, stopRecording, handleImageUpload etc. remain largely the same) ---
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
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
      {/* Header remains the same */}
      <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 text-white bg-gradient-to-r from-green-600 to-green-800 shadow-md z-20">
        <div className="flex items-center gap-3">
          <img src="/KisanSaathi.png" alt="KisanSaathi" className="h-12 object-contain" />
          <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <span className="text-yellow-300">Kisan</span>
            <span className="text-white">Saathi</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setShowLangDropdown(prev => !prev)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Globe className="w-5 h-5 mr-2" />
              {getLanguageDetails(selectedLanguage).nativeName}
            </Button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-30">
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
              clearChatHistory();
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

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pt-28 pb-24 md:pb-6">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 max-w-2xl ${message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`flex flex-col w-full ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative px-4 py-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}`}>
                {message.imageUrl && <img src={message.imageUrl} alt="User upload" className="mb-2 rounded-lg max-h-48" />}
                
                {/* Show thinking drawer above the answer for assistant messages */}
                {message.role === 'assistant' && message.thinking && message.thinking.trim() && !isStreaming && (
                  <div className="mb-3">
                    <button
                      onClick={() => setShowThinkingDrawer(!showThinkingDrawer)}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium transition-colors w-full justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Thinking Process
                      </div>
                      {showThinkingDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showThinkingDrawer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400 max-h-60 overflow-y-auto"
                      >
                        <div className="text-sm text-indigo-700 whitespace-pre-line">
                          {message.thinking}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                {isStreaming && message.content === "" && message.role === 'assistant' ? <TypingIndicator /> : <MarkdownMessage content={message.content} />}
                
                {/* **IMPROVEMENT: SPEAK BUTTON PLACEMENT** */}
                {message.role === 'assistant' && message.content && !isStreaming && (
                  <Button onClick={() => handlePlayAudio(message)} className="absolute -bottom-3 -right-3 p-1.5 bg-white rounded-full shadow border hover:bg-gray-100 transition-colors">
                    {generatingAudioId === message.id ? <TypingIndicator /> : (playingAudioId === message.id ? <StopCircle className="w-5 h-5 text-red-500" /> : <PlayCircle className="w-5 h-5 text-green-600" />)}
                  </Button>
                )}
              </div>
              
              {message.suggestions && message.suggestions.length > 0 && !isStreaming && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <div className="text-sm font-medium text-green-800 mb-2">💡 Follow-up questions:</div>
                  <ul className="space-y-1">
                    {message.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-green-700 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Display search results for Perplexity responses */}
              {message.searchResults && message.searchResults.length > 0 && !isStreaming && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                  <div className="text-sm font-medium text-purple-800 mb-2">📚 Search Results:</div>
                  <ul className="space-y-2">
                    {message.searchResults.map((result, i) => (
                      <li key={i} className="text-sm">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline font-medium">
                          {result.title}
                        </a>
                        <p className="text-gray-600 mt-1">{result.snippet}</p>
                        {result.date && <p className="text-xs text-gray-500 mt-1">Date: {result.date}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {/* Initial Suggestions remain the same */}
        {messages.length <= 1 && !isStreaming && (
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center pt-8">
            {(INITIAL_SUGGESTIONS[selectedLanguage] || INITIAL_SUGGESTIONS['en-US']).map((suggestion, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-sm px-4 py-2 bg-white border border-gray-300/80 text-gray-700 rounded-xl hover:bg-gray-200/60 transition-all shadow-sm"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer remains the same */}
      <footer className="fixed bottom-0 left-0 right-0 md:relative md:flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-10">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-2 p-3 text-sm text-red-800 bg-red-100 rounded-xl flex justify-between items-center"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {isTranscribing && (
          <div className="flex items-center justify-center text-sm text-gray-600 mb-2">
            <TypingIndicator /> Transcribing audio... please wait.
          </div>
        )}
        {uploadedImage && (
          <div className="mb-2 p-2 bg-gray-100 rounded-xl flex items-center gap-2">
            <img src={uploadedImage} alt="Preview" className="h-10 w-10 rounded-lg object-cover" />
            <span className="text-sm flex-1">Image will be sent with your message.</span>
            <button onClick={() => setUploadedImage(null)}>
              <X size={18} className="text-red-500" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              onClick={() => setShowAttachmentMenu(prev => !prev)}
              className="p-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600"
            >
              <Paperclip size={20} />
            </Button>
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border p-2 z-10"
                >
                  <button
                    onClick={() => handleAttachmentClick('gallery')}
                    className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ImageUp size={20} /> From Gallery
                  </button>
                  <button
                    onClick={() => handleAttachmentClick('camera')}
                    className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-gray-100"
                  >
                    <Camera size={20} /> Take Photo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={() => {
              setUseSearch(!useSearch);
              if (!useSearch) setUseThinking(false); // Disable thinking when enabling search
            }}
            className={`p-3 rounded-xl text-sm font-medium transition-all ${useSearch ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            title={useSearch ? 'Search enabled - using web search' : 'Search disabled - using basic AI'}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => {
              setUseThinking(!useThinking);
              if (!useThinking) setUseSearch(false); // Disable search when enabling thinking
            }}
            className={`p-3 rounded-xl text-sm font-medium transition-all ${useThinking ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            title={useThinking ? 'Thinking enabled - shows reasoning process' : 'Thinking disabled - direct answers'}
          >
            <Brain className="w-5 h-5" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask in ${getLanguageDetails(selectedLanguage).nativeName}...`}
            disabled={isStreaming || isTranscribing}
            rows={1}
            className="w-full p-3 text-sm bg-gray-100 rounded-xl border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button
            onClick={handleMicClick}
            disabled={isStreaming}
            className="p-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600"
          >
            {isRecording ? <Square size={20} className="text-red-500" /> : <Mic size={20} />}
          </Button>
          <Button
            onClick={() => handleSendMessage()}
            disabled={isStreaming || (!input.trim() && !uploadedImage)}
            className="p-3 bg-green-600 text-white rounded-xl w-14 h-12 flex items-center justify-center"
          >
            {isStreaming ? <TypingIndicator /> : <Send size={20} />}
          </Button>
        </div>
      </footer>
    </div>
  );
}