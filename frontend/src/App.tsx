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
import { generatePerplexitySearchResponse, convertToPerplexityMessages, type PerplexityResponse } from "./services/perplexityService";
import { generateThinkingResponse, type ThinkingResponse } from "./services/thinkingService";

// NOTE: Add this to your main CSS file (e.g., index.css) to style markdown
/*
.markdown-content strong {
  color: #15803d; // Example: A nice green color for bolded text
}
*/

export type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
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
  'en-US': [
    "When is the best time to sow groundnut this season?",
    "How much urea and DAP should I use for 1 acre of paddy?",
    "How can I apply for PM-Kisan Samman Nidhi?",
  ],
  'hi-IN': [
    "इस मौसम में मूंगफली बोने का सबसे अच्छा समय कब है?",
    "१ एकड़ धान के लिए मुझे कितनी यूरिया और डीएपी चाहिए?",
    "मैं पीएम-किसान सम्मान निधि के लिए आवेदन कैसे कर सकता हूं?",
  ],
  'ta-IN': [
    "இந்த பருவத்தில் நிலக்கடலை விதைக்கும் சிறந்த நேரம் எது?",
    "ஒரு ஏக்கர் பச்சரிசிக்கு எவ்வளவு யூரியா மற்றும் DAP பயன்படுத்த வேண்டும்?",
    "PM-Kisan Samman Nidhi-க்கு நான் எப்படி விண்ணப்பிப்பது?",
  ],
  'te-IN': [
    "ఈ సీజన్‌లో పల్లీ విత్తడానికి ఉత్తమ సమయం ఏది?",
    "ఒక ఎకరంలో వరి కోసం ఎంత యూరియా మరియు DAP ఉపయోగించాలి?",
    "PM-Kisan Samman Nidhi కి ఎలా అప్లై చేయాలి?",
  ],
  'kn-IN': [
    "ಈ ಸೀಸನ್ನಲ್ಲಿ ಕಡಲೆಕಾಯಿ ಬಿತ್ತನೆಗೆ ಸೂಕ್ತ ಸಮಯ ಯಾವುದು?",
    "ಒಂದು ಎಕರೆ ಅಕ್ಕಿಗೆ ಎಷ್ಟು ಯೂರಿಯಾ ಮತ್ತು ಡಿಯ್ಯಾಪಿ ಬೇಕು?",
    "ನಾನು ಹೇಗೆ PM-Kisan Samman Nidhi ಗೆ ಅರ್ಜಿ ಹಾಕಬಹುದು?",
  ],
  'ml-IN': [
    "ഈ സീസണിൽ നാളികേരം തൈവയ്ക്കാൻ എപ്പോൾ ഏറ്റവും നല്ല സമയം?",
    "ഒരു ഏക്കർ നെല്ലിന് എത്രയ്യൂറിയയും DAPഉം ഉപയോഗിക്കണം?",
    "PM-Kisan Samman Nidhiക്കായി എങ്ങനെ അപേക്ഷിക്കാം?",
  ],
  'mr-IN': [
    "या हंगामात शेंगदाणा पेरण्यासाठी सर्वोत्तम वेळ कोणता?",
    "१ एकर भातासाठी किती युरिया आणि डीएपी वापरावे?",
    "पीएम-किसान सन्मान निधीसाठी मी कसा अर्ज करू?",
  ],
  'gu-IN': [
    "આ સીઝનમાં ભૂંગળી વાવવા માટે શ્રેષ્ઠ સમય કયો છે?",
    "એક એકર ભાથ માટે કેટલોક યુરિયા અને DAP જોઈએ?",
    "હું PM-Kisan Samman Nidhi માટે કેવી રીતે અરજી કરી શકું?",
  ],
};



// --- UI COMPONENTS (Keep as is) ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => (
    <button ref={ref} className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none rounded-xl border-b-2 border-transparent hover:border-gray-300 active:scale-95 ${className}`} {...props}>
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

// Function to generate unique message ID
const generateMessageId = (): string => {
  return crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

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
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Migrate old format to new format
    return parsed.map((msg: any) => {
      if (msg.role && msg.content) {
        // Old format
        return {
          id: msg.id ? msg.id.toString() : generateMessageId(),
          sender: msg.role,
          text: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          imageUrl: msg.imageUrl,
          suggestions: msg.suggestions,
          searchResults: msg.searchResults,
          thinking: msg.thinking,
        };
      }
      return msg; // Already new format
    });
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
    .replace(/```.*?```/gs, '')       // Remove code blocks
    .replace(/`(.*?)`/g, '$1')       // Remove inline code
    .replace(/#{1,6}\s*/g, '')        // Remove headers
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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);
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
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const [useSearch, setUseSearch] = useState<boolean>(false); // Toggle search on/off
  const [useThinking, setUseThinking] = useState<boolean>(false); // Toggle thinking on/off
  const [showThinkingDrawer, setShowThinkingDrawer] = useState<boolean>(false); // Show/hide thinking drawer

  function getLanguageDetails(code: string) {
    return SUPPORTED_LANGUAGES.find(l => l.code === code) ?? SUPPORTED_LANGUAGES[0];
  }

  useEffect(() => {
    // Only set welcome message if there are no messages
    if (messages.length === 0) {
      setMessages([]);
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

  // Handle click outside for language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };

    if (showLangDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLangDropdown]);

  // Handle click outside for attachment menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  async function handleSendMessage(messageText?: string) {
    const currentInput = (messageText || input).trim();
    if (!currentInput && !uploadedImage) return;

    setIsStreaming(true);
    setError(null);
    const userMessageId = generateMessageId();
    const assistantMessageId = generateMessageId();
    const userImage = uploadedImage;

    setMessages(prev => [
      ...prev,
      { id: userMessageId, sender: "user", text: currentInput, timestamp: new Date().toISOString(), imageUrl: userImage },
      { id: assistantMessageId, sender: "assistant", text: "", timestamp: new Date().toISOString() }
    ]);
    setInput("");
    setUploadedImage(null);

    try {
      // **IMPROVEMENT: CONTEXT MANAGEMENT**
      let history: any[] = messages
        .filter(m => m.text && m.id !== assistantMessageId) // Ensure text exists and exclude current assistant message
        .map(m => ({
          role: m.sender === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }));

      // Ensure history starts with user message (Google AI requirement)
      if (history.length > 0 && history[0].role === 'model') {
        history = history.slice(1);
      }
      
      const stream = userImage
        ? await analyzeImage(
            currentInput,
            { inlineData: { mimeType: userImage.match(/data:(.*);base64,/)![1], data: userImage.split(',')[1] } },
            selectedLanguage
          )
        : useThinking
        ? await generateThinkingResponse(
            currentInput,
            {
              model: 'qwen/qwen3-32b',
              temperature: 0.6,
            },
            messages.map(m => ({ sender: m.sender, text: m.text, timestamp: m.timestamp })),
            selectedLanguage
          )
        : useSearch
        ? await generatePerplexitySearchResponse(
            convertToPerplexityMessages([
              { role: 'user', content: currentInput }
            ]),
            {
              model: 'sonar',
              temperature: 0.2,
              max_tokens: 2048,
              stream: false,
            },
            messages.map(m => ({ sender: m.sender, text: m.text, timestamp: m.timestamp })),
            selectedLanguage
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
          text: fullResponse,
          thinking: thinkingResponse.thoughts
        } : m));
      } else if (useSearch && !userImage) {
        // Handle Perplexity search response (non-streaming)
        const responseData = stream as PerplexityResponse;
        fullResponse = responseData.choices[0].message.content;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { 
          ...m, 
          text: fullResponse,
          searchResults: responseData.search_results
        } : m));
      } else {
        // Handle Google AI streaming response
        const streamingResponse = stream as AsyncGenerator<any, any, any>;
        for await (const chunk of streamingResponse) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, text: fullResponse } : m));
        }
      }

      // Extract suggestions (only for Google AI responses)
      const suggestions = !useSearch && !userImage ? fullResponse.match(/>> .*/g)?.map(s => s.substring(3).trim()) || [] : [];
      const responseText = !useSearch && !userImage ? fullResponse.split('>>')[0].trim() : fullResponse;
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, text: responseText, suggestions } : m));

    } catch (err: any) {
      setError((err as Error).message || "An unknown error occurred.");
      setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, text: "Sorry, I couldn't get a response due to an error." } : m));
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
      const cleanedContent = cleanMarkdownForSpeech(message.text);
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
    <div className="flex flex-col h-screen bg-white font-sans relative overflow-hidden">
      {/* Agriculture Doodle Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'url("/doodle.svg")',
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto'
        }}
      />

      {/* --- FLOATING HEADER CONTAINER --- */}
      {/* FIX 1: Increased opacity and blur to hide text behind */}
      <div className="fixed top-0 left-0 right-0 p-2 md:p-4 z-20 pointer-events-none bg-white/95 backdrop-blur-xl">
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-screen-2xl mx-auto flex justify-between items-center p-3 md:p-4 bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <img src="/KisanSaathi.png" alt="KisanSaathi" className="h-12 object-contain" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-gray-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <span className="text-green-600">Kisan</span>
              <span>Saathi</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={langDropdownRef}>
              <Button
                onClick={() => setShowLangDropdown(prev => !prev)}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
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
                setMessages([]);
                setInput("");
                setUploadedImage(null);
                setError(null);
                setPlayingAudioId(null);
              }}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </motion.header>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-6 pt-32 pb-48 md:pb-52 relative z-10">
        {/* Chat Background Overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] pointer-events-none rounded-2xl mx-2 my-4"></div>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 max-w-2xl ${message.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`flex flex-col w-full ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${message.sender === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none border border-blue-400/30' : 'bg-white/95 text-gray-800 rounded-bl-none border border-white/40'}`}>
                {message.imageUrl && <img src={message.imageUrl} alt="User upload" className="mb-2 rounded-lg max-h-48" />}
                
                {/* Show thinking drawer above the answer for assistant messages */}
                {message.sender === 'assistant' && message.thinking && message.thinking.trim() && !isStreaming && (
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
                
                {isStreaming && message.text === "" && message.sender === 'assistant' ? <TypingIndicator /> : <MarkdownMessage content={message.text} />}
                
                {/* **IMPROVEMENT: SPEAK BUTTON PLACEMENT** */}
                {message.sender === 'assistant' && message.text && !isStreaming && (
                  <Button onClick={() => handlePlayAudio(message)} className="absolute -bottom-3 -right-3 p-1.5 bg-white rounded-full shadow border hover:bg-gray-100 transition-colors">
                    {generatingAudioId === message.id ? <TypingIndicator /> : (playingAudioId === message.id ? <StopCircle className="w-5 h-5 text-red-500" /> : <PlayCircle className="w-5 h-5 text-green-600" />)}
                  </Button>
                )}
              </div>
              
              {message.suggestions && message.suggestions.length > 0 && !isStreaming && (
                <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50 shadow-sm backdrop-blur-sm">
                  <div className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    {selectedLanguage === 'en-US' ? 'Follow-up questions:' : 'अनुवर्ती प्रश्न:'}
                  </div>
                  <ul className="space-y-2">
                    {message.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Display search results for Perplexity responses */}
              {message.searchResults && message.searchResults.length > 0 && !isStreaming && (
                <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50 shadow-sm backdrop-blur-sm">
                  <div className="text-sm font-medium text-purple-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">📚</span>
                    {selectedLanguage === 'en-US' ? 'Search Results:' : 'खोज परिणाम:'}
                  </div>
                  <ul className="space-y-3">
                    {message.searchResults.map((result, i) => (
                      <li key={i} className="text-sm">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:text-purple-800 font-medium hover:underline transition-colors">
                          {result.title}
                        </a>
                        <p className="text-gray-600 mt-1 leading-relaxed">{result.snippet}</p>
                        {result.date && <p className="text-xs text-gray-500 mt-2">📅 {result.date}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {/* Apple-inspired Welcome Interface */}
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] max-h-screen space-y-6 relative z-10 px-4 md:px-6">
            {/* Clean Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center space-y-4 max-w-lg"
            >
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl">
                  <img src="/KisanSaathi.png" alt="KisanSaathi" className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                  {selectedLanguage === 'en-US' ? 'KisanSaathi' : 'किसान साथी'}
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed font-light">
                  {selectedLanguage === 'en-US' ? 'Your AI farming companion' : 'आपका AI कृषि साथी'}
                </p>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="w-full max-w-md space-y-3"
            >
              <div className="text-center mb-2">
                <p className="text-gray-500 text-sm font-medium">
                  {selectedLanguage === 'en-US' ? 'Get started with these questions' : 'इन प्रश्नों के साथ शुरू करें'}
                </p>
              </div>
              <div className="space-y-2">
                {(INITIAL_SUGGESTIONS[selectedLanguage] || INITIAL_SUGGESTIONS['en-US']).slice(0, 3).map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + (i * 0.1) }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-3 sm:p-4 bg-white/80 backdrop-blur-xl border border-gray-200/50 text-gray-700 rounded-xl hover:bg-white hover:shadow-lg hover:border-gray-300 transition-all duration-300 shadow-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <span className="text-green-600 font-semibold text-base">{i + 1}</span>
                      </div>
                      <span className="text-sm leading-relaxed font-medium line-clamp-2">{suggestion}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Subtle Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-center mt-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50/80 backdrop-blur-sm rounded-full border border-gray-200/50">
                <span className="text-xs text-gray-500 font-medium">
                  {selectedLanguage === 'en-US' ? 'Powered by advanced AI' : 'उन्नत AI द्वारा संचालित'}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-medium">
                  {selectedLanguage === 'en-US' ? '8 languages supported' : '8 भाषाओं का समर्थन'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* --- RESTRUCTURED FOOTER --- */}
      {/* FIX 2: Full-width bar with centered content inside */}
      <div className="fixed bottom-0 left-0 right-0 p-2 md:p-4 z-20 pointer-events-none bg-white/95 backdrop-blur-xl">
        <motion.footer
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-screen-2xl mx-auto p-3 md:p-4 bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 pointer-events-auto"
        >
          <div className="w-full px-2 sm:px-4">
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
            <div className="flex flex-col gap-2">
              {/* Tools row - appears above input on mobile, inline on desktop */}
              <div className="flex items-center gap-2 sm:hidden">
                <div className="relative" ref={attachmentMenuRef}>
                  <Button
                    onClick={() => setShowAttachmentMenu(prev => !prev)}
                    className="p-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600"
                  >
                    <Paperclip size={18} />
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
                  className={`p-2.5 rounded-xl text-sm font-medium transition-all ${useSearch ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                  title={useSearch ? 'Search enabled - using web search' : 'Search disabled - using basic AI'}
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => {
                    setUseThinking(!useThinking);
                    if (!useThinking) setUseSearch(false); // Disable search when enabling thinking
                  }}
                  className={`p-2.5 rounded-xl text-sm font-medium transition-all ${useThinking ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                  title={useThinking ? 'Thinking enabled - shows reasoning process' : 'Thinking disabled - direct answers'}
                >
                  <Brain className="w-4 h-4" />
                </Button>
              </div>

              {/* Input row */}
              <div className="flex items-center gap-2">
                {/* Desktop tools - hidden on mobile */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="relative" ref={attachmentMenuRef}>
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
                </div>

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
                  className="flex-1 p-3 text-sm bg-gray-100 rounded-xl border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 resize-none min-h-[44px] max-h-32"
                />
                <Button
                  onClick={handleMicClick}
                  disabled={isStreaming}
                  className="p-2.5 sm:p-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-gray-600 flex-shrink-0"
                >
                  {isRecording ? <Square size={18} className="sm:w-5 text-red-500" /> : <Mic size={18} className="sm:w-5" />}
                </Button>
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming || (!input.trim() && !uploadedImage)}
                  className="p-2.5 sm:p-3 bg-green-600 text-white rounded-xl w-12 h-10 sm:w-14 sm:h-12 flex-shrink-0 flex items-center justify-center"
                >
                  {isStreaming ? <TypingIndicator /> : <Send size={18} className="sm:w-5" />}
                </Button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}