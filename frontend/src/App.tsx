import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Send,
  Mic,
  Square,
  Paperclip,
  PlayCircle,
  StopCircle,
  Globe,
  Camera,
  ImageUp,
  Trash2,
  Brain,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import ReactMarkdown from "react-markdown"

// Import new services
import { generateTextResponse } from "./services/aiService"
import { analyzeImage } from "./services/imageAnalysisService"
import { synthesizeSpeech } from "./services/textToSpeechService"
import { transcribeAudio } from "./services/voiceTranscribeService"
import {
  generatePerplexitySearchResponse,
  convertToPerplexityMessages,
  type PerplexityResponse,
} from "./services/perplexityService"
import {
  generateThinkingResponse,
  type ThinkingResponse,
} from "./services/thinkingService"

// Import components
import GridBackground from "./components/GridBackground"
import LayoutTextFlip from "./components/LayoutTextFlip"
import PlaceholdersAndVanishInput from "./components/PlaceholdersAndVanishInput"

// NOTE: Add this to your main CSS file (e.g., index.css) to style markdown
/*
.markdown-content strong {
  color: #15803d; // Example: A nice green color for bolded text
}
*/

export type Message = {
  id: number
  role: "user" | "assistant"
  content: string
  imageUrl?: string | null
  suggestions?: string[]
  searchResults?: Array<{
    title: string
    url: string
    date?: string
    last_updated?: string
    snippet: string
  }>
  thinking?: string
}

export type LanguageOption = {
  code: string
  name: string
  nativeName: string
  welcome: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en-US",
    name: "English",
    nativeName: "English",
    welcome: "Welcome! How can I help you with your farming questions today?",
  },
  {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    welcome: "नमस्ते! मैं आज आपकी खेती के सवालों में कैसे मदद कर सकता हूँ?",
  },
  {
    code: "ta-IN",
    name: "Tamil",
    nativeName: "தமிழ்",
    welcome:
      "வணக்கம்! இன்று உங்கள் விவசாய கேள்விகளுக்கு நான் எப்படி உதவ முடியும்?",
  },
  {
    code: "te-IN",
    name: "Telugu",
    nativeName: "తెలుగు",
    welcome: "నమస్కారం! ఈ రోజు మీ వ్యవసాయ ప్రశ్నలతో నేను మీకు ఎలా సహాయపడగలను?",
  },
  {
    code: "kn-IN",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    welcome: "ನಮಸ್ಕಾರ! ಇಂದು ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಗಳಿಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  },
  {
    code: "ml-IN",
    name: "Malayalam",
    nativeName: "മലയാളം",
    welcome:
      "നമസ്കാരം! ഇന്ന് നിങ്ങളുടെ കാർഷിക ചോദ്യങ്ങളിൽ ഞാൻ എങ്ങനെ സഹായിക്കും?",
  },
  {
    code: "mr-IN",
    name: "Marathi",
    nativeName: "मराठी",
    welcome: "नमस्कार! आज मी तुमच्या शेतीच्या प्रश्नांसाठी कशी मदत करू शकेन?",
  },
  {
    code: "gu-IN",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    welcome: "નમસ્તે! આજે હું તમારા ખેતીના પ્રશ્નોમાં કેવી રીતે મદદ કરી શકું?",
  },
]

export const INITIAL_SUGGESTIONS: { [key: string]: string[] } = {
  "en-US": [
    "Best crops for summer?",
    "Organic fertilizer tips",
    "How to treat leaf curl disease?",
  ],
  "hi-IN": [
    "गर्मी के लिए सबसे अच्छी फसलें?",
    "जैविक खाद के टिप्स",
    "पत्ती मोड़क रोग का इलाज कैसे करें?",
  ],
  "ta-IN": [
    "கோடைக்கு சிறந்த பயிர்கள்?",
    "இயற்கை உரக் குறிப்புகள்",
    "இலை சுருட்டு நோயை எவ்வாறு குணப்படுத்துவது?",
  ],
  "te-IN": [
    "వేసవికి ఉత్తమ పంటలు?",
    "సేంద్రీయ ఎరువుల చిట్కాలు",
    "ఆకు ముడత వ్యాధిని ఎలా నయం చేయాలి?",
  ],
  "kn-IN": [
    "ಬೇಸಿಗೆಗೆ ಉತ್ತಮ ಬೆಳೆಗಳು?",
    "ಸಾವಯವ ಗೊಬ್ಬರದ ಸಲಹೆಗಳು",
    "ಎಲೆ ಸುರುಳಿ ರೋಗವನ್ನು ಹೇಗೆ ಗುಣಪಡಿಸುವುದು?",
  ],
  "ml-IN": [
    "വേനൽക്കാലത്ത് മികച്ച വിളകൾ?",
    "ജൈവ വളപ്രയോഗത്തിനുള്ള നുറുങ്ങുകൾ",
    "ഇല ചുരുളൽ രോഗം എങ്ങനെ ചികിത്സിക്കാം?",
  ],
  "mr-IN": [
    "उन्हाळ्यासाठी सर्वोत्तम पिके?",
    "सेंद्रिय खताच्या टिप्स",
    "पाने कुरूप होण्याच्या रोगावर उपचार कसे करावे?",
  ],
  "gu-IN": [
    "ઉનાળા માટે શ્રેષ્ઠ પાક?",
    "ઓર્ગેનિક ખાતર ટિપ્સ",
    "પાન વાળવાના રોગનો ઉપચાર કેવી રીતે કરવો?",
  ],
}

// --- UI COMPONENTS (Keep as is) ---
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className = "", children, ...props }, ref) => (
  <button
    ref={ref}
    className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none rounded-xl active:scale-95 ${className}`}
    {...props}
  >
    {children}
  </button>
))
Button.displayName = "Button"

// Add a class for styling
const MarkdownMessage: React.FC<{
  content: string
  role?: "user" | "assistant"
}> = ({ content, role = "assistant" }) => (
  <div
    className={`markdown-content w-full text-sm sm:text-base md:text-lg ${
      role === "assistant" ? "text-white font-normal" : "text-white"
    }`}
  >
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
)

const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2">
    <motion.div
      className="h-1.5 w-1.5 bg-white rounded-full"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="h-1.5 w-1.5 bg-white rounded-full"
      animate={{ y: [0, -3, 0] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.2,
      }}
    />
    <motion.div
      className="h-1.5 w-1.5 bg-white rounded-full"
      animate={{ y: [0, -3, 0] }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.4,
      }}
    />
  </div>
)

// --- CHAT PERSISTENCE FUNCTIONS ---
const CHAT_STORAGE_KEY = "kisanSaathi_chat_history"

const saveChatHistory = (messages: Message[]) => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  } catch (error) {
    console.warn("Failed to save chat history:", error)
  }
}

const loadChatHistory = (): Message[] => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (error) {
    console.warn("Failed to load chat history:", error)
    return []
  }
}

const clearChatHistory = () => {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
  } catch (error) {
    console.warn("Failed to clear chat history:", error)
  }
}

// Function to clean markdown formatting for text-to-speech
const cleanMarkdownForSpeech = (text: string): string => {
  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold **text**
    .replace(/\*(.*?)\*/g, "$1") // Remove italic *text*
    .replace(/```.*?```/gs, "") // Remove code blocks
    .replace(/`(.*?)`/g, "$1") // Remove inline code
    .replace(/#{1,6}\s*/g, "") // Remove headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove links, keep text
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/\n\s*\n/g, "\n") // Clean up extra newlines
    .trim()

  // Check byte length and truncate if necessary (GCP TTS limit is 5000 bytes)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(cleaned)

  if (bytes.length > 5000) {
    // Find a safe truncation point (roughly 80% of limit to account for multi-byte chars)
    const maxChars = Math.floor(4000 / 4) // Conservative estimate for UTF-8
    cleaned = cleaned.substring(0, maxChars)

    // Try to end at a sentence or word boundary
    const lastSentence = cleaned.lastIndexOf(".")
    const lastWord = cleaned.lastIndexOf(" ")

    if (lastSentence > cleaned.length * 0.7) {
      cleaned = cleaned.substring(0, lastSentence + 1)
    } else if (lastWord > cleaned.length * 0.7) {
      cleaned = cleaned.substring(0, lastWord)
    }

    cleaned += "..."
  }

  return cleaned
}

// --- MAIN COMPONENT ---
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(() => loadChatHistory())
  const [input, setInput] = useState<string>("")
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null)
  const [generatingAudioId, setGeneratingAudioId] = useState<number | null>(
    null
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    () => localStorage.getItem("kisanSaathi_language") || "en-US"
  )
  const [showLangDropdown, setShowLangDropdown] = useState<boolean>(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [useSearch, setUseSearch] = useState<boolean>(false) // Toggle search on/off
  const [useThinking, setUseThinking] = useState<boolean>(false) // Toggle thinking on/off
  const [showThinkingDrawer, setShowThinkingDrawer] = useState<boolean>(false) // Show/hide thinking drawer
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false) // Show/hide scroll button

  // Use useCallback for input handlers to prevent recreating the function on each render
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value)
    },
    []
  )

  function getLanguageDetails(code: string) {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]
    )
  }

  useEffect(() => {
    // Only set welcome message if there are no messages or only one welcome message
    if (
      messages.length === 0 ||
      (messages.length === 1 && messages[0].role === "assistant")
    ) {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: getLanguageDetails(selectedLanguage).welcome,
        },
      ])
    }
    setUploadedImage(null)
    setError(null)
  }, [selectedLanguage])

  useEffect(() => {
    // Check if user is already scrolled up (viewing history)
    const chatContainer = document.getElementById("chat-container")
    if (chatContainer) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150

      // Only auto-scroll if user is already near the bottom
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      } else if (messages.length > 0) {
        // Show scroll button if not at bottom and we have messages
        setShowScrollButton(true)
      }
    }
  }, [messages])

  // Save chat history whenever messages change (but skip initial load)
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages)
    }
  }, [messages])

  // Handle page refresh - clear chat history
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearChatHistory()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  // Wrap handleSendMessage with useCallback to create a stable reference
  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const currentInput = (messageText || input).trim()
      if (!currentInput && !uploadedImage) return

      setIsStreaming(true)
      setError(null)
      const userMessageId = Date.now()
      const assistantMessageId = userMessageId + 1
      const userImage = uploadedImage

      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: currentInput,
          imageUrl: userImage,
        },
        { id: assistantMessageId, role: "assistant", content: "" },
      ])
      setInput("")
      setUploadedImage(null)

      try {
        // **IMPROVEMENT: CONTEXT MANAGEMENT**
        let history: any[] = messages
          .filter((m) => m.content && m.id !== assistantMessageId) // Ensure content exists and exclude current assistant message
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }))

        // Ensure history starts with user message (Google AI requirement)
        if (history.length > 0 && history[0].role === "model") {
          history = history.slice(1)
        }

        const stream = userImage
          ? await analyzeImage(currentInput, {
              inlineData: {
                mimeType: userImage.match(/data:(.*);base64,/)![1],
                data: userImage.split(",")[1],
              },
            })
          : useThinking
          ? await generateThinkingResponse(
              `You are a helpful assistant specializing in agriculture. Provide accurate, practical information for farmers.\n\nUser question: ${currentInput}`,
              {
                model: "qwen/qwen3-32b",
                temperature: 0.6,
              }
            )
          : useSearch
          ? await generatePerplexitySearchResponse(
              convertToPerplexityMessages([
                {
                  role: "system",
                  content:
                    "You are a helpful assistant specializing in agriculture. Provide accurate, practical information for farmers.",
                },
                { role: "user", content: currentInput },
              ]),
              {
                model: "sonar",
                temperature: 0.2,
                max_tokens: 2048,
                stream: false,
              }
            )
          : await generateTextResponse(
              currentInput,
              history,
              getLanguageDetails(selectedLanguage).name
            )

        let fullResponse = ""

        if (useThinking && !userImage) {
          // Handle Thinking response
          const thinkingResponse = stream as ThinkingResponse
          fullResponse = thinkingResponse.answer
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullResponse,
                    thinking: thinkingResponse.thoughts,
                  }
                : m
            )
          )
        } else if (useSearch && !userImage) {
          // Handle Perplexity search response (non-streaming)
          const responseData = stream as PerplexityResponse
          fullResponse = responseData.choices[0].message.content
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullResponse,
                    searchResults: responseData.search_results,
                  }
                : m
            )
          )
        } else {
          // Handle Google AI streaming response
          const streamingResponse = stream as AsyncGenerator<any, any, any>
          for await (const chunk of streamingResponse) {
            const chunkText = chunk.text()
            fullResponse += chunkText
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: fullResponse }
                  : m
              )
            )
          }
        }

        // Extract suggestions (only for Google AI responses)
        const suggestions =
          !useSearch && !userImage
            ? fullResponse.match(/>> .*/g)?.map((s) => s.substring(3).trim()) ||
              []
            : []
        const responseText =
          !useSearch && !userImage
            ? fullResponse.split(">>")[0].trim()
            : fullResponse
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: responseText, suggestions }
              : m
          )
        )
      } catch (err: any) {
        setError((err as Error).message || "An unknown error occurred.")
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: "Sorry, I couldn't get a response due to an error.",
                }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [input, uploadedImage, messages, useSearch, useThinking, selectedLanguage]
  )

  // Create stable reference to the form submit handler with proper dependencies
  const handleSubmitForm = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      handleSendMessage()
    },
    [handleSendMessage]
  )

  const handlePlayAudio = async (message: Message) => {
    if (playingAudioId === message.id) {
      audioRef.current?.pause()
      setPlayingAudioId(null)
      return
    }

    if (audioRef.current) audioRef.current.pause()
    setGeneratingAudioId(message.id)
    setPlayingAudioId(null)
    setError(null)

    try {
      // **IMPROVEMENT: Using the TTS service with cleaned text**
      const cleanedContent = cleanMarkdownForSpeech(message.content)
      const audioElement = await synthesizeSpeech(
        cleanedContent,
        selectedLanguage
      )
      audioRef.current = audioElement
      audioRef.current.play()
      audioRef.current.onended = () => setPlayingAudioId(null)
      setPlayingAudioId(message.id)
    } catch (err: any) {
      setError("Audio playback failed: " + (err as Error).message)
    } finally {
      setGeneratingAudioId(null)
    }
  }

  async function processAudioRecording(audioBlob: Blob) {
    setIsTranscribing(true)
    setError(null)
    try {
      // **IMPROVEMENT: Using the transcription service**
      const transcript = await transcribeAudio(audioBlob, selectedLanguage)
      if (transcript && transcript.trim()) {
        setInput((prev) => `${prev} ${transcript}`.trim())
      } else {
        setError("Could not detect any speech")
        // Continue anyway to reset state properly
      }
    } catch (err: any) {
      setError("Transcription failed: " + (err as Error).message)
    } finally {
      setIsTranscribing(false)
    }
  }

  // --- Other handlers (startRecording, stopRecording, handleImageUpload etc. remain largely the same) ---
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image file too large (max 10MB).")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => setUploadedImage(reader.result as string)
    reader.onerror = () => setError("Failed to read image file.")
    reader.readAsDataURL(file)
  }
  const handleAttachmentClick = (mode: "gallery" | "camera") => {
    if (mode === "camera")
      fileInputRef.current?.setAttribute("capture", "environment")
    else fileInputRef.current?.removeAttribute("capture")
    fileInputRef.current?.click()
    setShowAttachmentMenu(false)
  }
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm; codecs=opus",
      })
      audioChunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (event) =>
        audioChunksRef.current.push(event.data)
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm; codecs=opus",
        })
        processAudioRecording(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setError(null)
    } catch (err) {
      setError(
        "Microphone access denied. Please enable it in your browser settings."
      )
    }
  }
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }
  const handleMicClick = () => {
    isRecording ? stopRecording() : startRecording()
  }

  // Add scrolling detection for the chat container
  useEffect(() => {
    const chatContainer = document.getElementById("chat-container")
    let scrollTimeout: number | null = null

    const handleScroll = () => {
      chatContainer?.classList.add("scrolling")

      // Check if we're near the bottom
      if (chatContainer) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainer
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
        setShowScrollButton(!isNearBottom)
      }

      // Remove the class after 1.5s of no scrolling
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout)
      }

      scrollTimeout = window.setTimeout(() => {
        chatContainer?.classList.remove("scrolling")
      }, 1500)
    }

    chatContainer?.addEventListener("scroll", handleScroll)
    return () => {
      chatContainer?.removeEventListener("scroll", handleScroll)
      if (scrollTimeout) window.clearTimeout(scrollTimeout)
    }
  }, [])

  // Auto-clear error messages after a few seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 4000) // Auto-dismiss error after 4 seconds
      return () => clearTimeout(timer)
    }
  }, [error])

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setShowScrollButton(false)
  }

  // --- MAIN RENDER ---
  return (
    <GridBackground
      className="h-screen w-full bg-black"
      height="100vh"
      gridSize="60px"
      gridColor="#e5e7eb"
      darkGridColor="#333333"
      fadeIntensity="40%"
    >
      <div className="flex flex-col h-screen font-sans relative z-10 max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 safe-area-inset">
        {/* Updated Header with transparent background and consistent item styling - made compatible with macOS resolution */}
        <header className="fixed top-0 left-0 right-0 flex justify-between items-center p-2 sm:p-4 text-white backdrop-blur-md bg-black/30 border-b border-white/10 shadow-md z-20">
          <div className="max-w-screen-xl w-full mx-auto flex justify-between items-center">
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="p-1 sm:p-2 rounded-xl overflow-hidden">
                <img
                  src="/KisanSaathi.png"
                  alt="KisanSaathi"
                  className="h-10 sm:h-12 object-contain"
                />
              </div>
              <h1
                className="text-xl sm:text-2xl font-bold tracking-wide"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                <span className="text-yellow-300">Kisan</span>
                <span className="text-white">Saathi</span>
              </h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <div className="relative">
                <Button
                  onClick={() => setShowLangDropdown((prev) => !prev)}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 hover:bg-green-800/30 text-white border border-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm text-xs sm:text-sm"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">
                    {getLanguageDetails(selectedLanguage).nativeName}
                  </span>
                </Button>
                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-white/10 max-h-60 overflow-y-auto z-30">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang.code)
                          localStorage.setItem(
                            "kisanSaathi_language",
                            lang.code
                          )
                          setShowLangDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-green-800/40 transition-colors rounded-lg mx-1 my-1 ${
                          selectedLanguage === lang.code
                            ? "bg-green-800/50 text-white"
                            : "text-gray-200"
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
                  clearChatHistory()
                  setMessages([
                    {
                      id: Date.now(),
                      role: "assistant",
                      content: getLanguageDetails(selectedLanguage).welcome,
                    },
                  ])
                  setInput("")
                  setUploadedImage(null)
                  setError(null)
                  setPlayingAudioId(null)
                }}
                className="p-2 sm:p-3 bg-white/10 hover:bg-green-800/30 text-white border border-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </header>

        <main
          className={`flex-1 p-3 sm:p-6 pl-2 sm:pl-3 space-y-4 sm:space-y-6 pt-24 sm:pt-28 pb-36 md:pb-6 overflow-x-hidden max-w-screen-xl mx-auto w-full ${
            messages.length <= 1 ? "overflow-y-hidden" : "overflow-y-auto"
          }`}
          id="chat-container"
          style={{ minHeight: "calc(100vh - 150px)" }}
        >
          {/* Enhanced LayoutTextFlip with better centering and welcome message */}
          {messages.length <= 1 && !isStreaming && (
            <div className="flex flex-col justify-center items-center h-[35vh] mt-0 py-2 sm:py-3">
              <div className="mb-1 sm:mb-2">
                <LayoutTextFlip
                  text="KisanSaathi"
                  words={[
                    "helps farmers",
                    "answers questions",
                    "provides guidance",
                    "shares knowledge",
                  ]}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl flex items-center"
                  wordClassName="bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 bg-clip-text text-transparent font-medium whitespace-nowrap"
                  textClassName="text-white font-bold"
                  duration={2500}
                />
              </div>
              <div className="text-sm sm:text-base md:text-lg lg:text-xl text-center text-gray-300 max-w-lg px-3 sm:px-4 mb-3 sm:mb-4">
                {getLanguageDetails(selectedLanguage).welcome}
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            // Skip the welcome message when displaying intro screen
            if (messages.length <= 1 && index === 0 && !isStreaming) {
              return null
            }

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-4 max-w-4xl ${
                  message.role === "user"
                    ? "ml-auto mr-2 flex-row-reverse"
                    : "mr-auto ml-2"
                }`}
              >
                <div
                  className={`flex flex-col w-full ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`relative px-2 sm:px-3 md:px-5 py-2 sm:py-3 md:py-4 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gray-800/60 text-white rounded-br-none border border-gray-700/30 ml-auto inline-block max-w-[92%] sm:max-w-[90%] md:max-w-[85%]"
                        : "bg-transparent text-white mr-auto w-full max-w-[92%] sm:max-w-[90%] md:max-w-[85%] break-words"
                    }`}
                  >
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="User upload"
                        className="mb-2 rounded-lg max-h-48"
                      />
                    )}

                    {/* Show thinking drawer above the answer for assistant messages */}
                    {message.role === "assistant" &&
                      message.thinking &&
                      message.thinking.trim() &&
                      !isStreaming && (
                        <div className="mb-3">
                          <button
                            onClick={() =>
                              setShowThinkingDrawer(!showThinkingDrawer)
                            }
                            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-indigo-900/40 hover:bg-indigo-900/50 rounded-lg border border-indigo-700/30 text-indigo-200 text-sm sm:text-base font-medium transition-colors w-full justify-between"
                          >
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              Thinking Process
                            </div>
                            {showThinkingDrawer ? (
                              <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            )}
                          </button>
                          {showThinkingDrawer && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 p-2 sm:p-3 bg-indigo-900/30 rounded-lg border-l-4 border-indigo-700/40 thinking-drawer"
                              style={{ maxHeight: "250px", overflowY: "auto" }}
                            >
                              <div className="text-xs sm:text-sm md:text-base text-indigo-200 whitespace-pre-line break-words">
                                {message.thinking}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                    {isStreaming &&
                    message.content === "" &&
                    message.role === "assistant" ? (
                      <TypingIndicator />
                    ) : (
                      <MarkdownMessage
                        content={message.content}
                        role={message.role}
                      />
                    )}

                    {/* Audio Button - Aligned with text start */}
                    {message.role === "assistant" &&
                      message.content &&
                      !isStreaming && (
                        <div className="mt-1 sm:mt-2 flex items-start">
                          <Button
                            onClick={() => handlePlayAudio(message)}
                            className={`p-1 sm:p-1.5 ${
                              playingAudioId === message.id
                                ? "bg-green-600/50 backdrop-blur-sm border border-green-500/40"
                                : "bg-transparent backdrop-blur-sm border border-white/30 hover:bg-green-600/20"
                            } rounded-full shadow-md transition-all duration-200`}
                          >
                            {generatingAudioId === message.id ? (
                              <TypingIndicator />
                            ) : playingAudioId === message.id ? (
                              <StopCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-white" />
                            )}
                          </Button>
                        </div>
                      )}
                  </div>

                  {message.suggestions &&
                    message.suggestions.length > 0 &&
                    !isStreaming && (
                      <div className="mt-3 p-3 bg-green-900/30 backdrop-blur-sm rounded-lg border border-green-700/20">
                        <div className="text-base font-medium text-green-300 mb-2">
                          💡 Follow-up questions:
                        </div>
                        <ul className="space-y-1">
                          {message.suggestions.map((s, i) => (
                            <li
                              key={i}
                              className="text-base text-green-200 flex items-start"
                            >
                              <span className="text-green-400 mr-2">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Display search results for Perplexity responses */}
                  {message.searchResults &&
                    message.searchResults.length > 0 &&
                    !isStreaming && (
                      <div className="mt-3 p-3 bg-purple-900/30 backdrop-blur-sm rounded-lg border border-purple-700/20">
                        <div className="text-base font-medium text-purple-300 mb-2">
                          📚 Search Results:
                        </div>
                        <ul className="space-y-2">
                          {message.searchResults.map((result, i) => (
                            <li key={i} className="text-base">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-200 hover:underline font-medium"
                              >
                                {result.title}
                              </a>
                              <p className="text-gray-300 mt-1 break-words">
                                {result.snippet}
                              </p>
                              {result.date && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Date: {result.date}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </motion.div>
            )
          })}
          {/* Initial Suggestions with updated positioning */}
          {messages.length <= 1 && !isStreaming && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 justify-center items-center mt-3 sm:mt-4">
              {(
                INITIAL_SUGGESTIONS[selectedLanguage] ||
                INITIAL_SUGGESTIONS["en-US"]
              ).map((suggestion, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-5 py-2 sm:py-3 bg-green-900/50 backdrop-blur-sm border border-green-700/30 text-green-200 rounded-xl hover:bg-green-800/60 transition-all shadow-sm"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Scroll to bottom button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={scrollToBottom}
                className="fixed bottom-24 sm:bottom-32 left-2 sm:left-3 p-1.5 sm:p-2 rounded-full bg-white/30 text-white shadow-lg backdrop-blur-sm border border-white/20 z-20 hover:bg-white/40 transition-all"
              >
                <ChevronDown size={14} className="sm:w-4 sm:h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </main>

        {/* Redesigned glassmorphic footer - optimized for macOS */}
        <footer
          className="fixed bottom-2 sm:bottom-5 left-0 right-0 md:relative md:flex-shrink-0 p-3 sm:p-4 md:p-6 bg-white/40 backdrop-blur-md border border-white/30 rounded-3xl shadow-lg z-10 max-w-screen-xl mx-auto w-full mb-2 sm:mb-5"
          style={{
            transform: "translateZ(0)",
            WebkitBackdropFilter: "blur(12px)",
            backdropFilter: "blur(12px)",
          }}
        >
          {" "}
          {/* Added for better rendering */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Changed gap-3 to gap-2 on smaller screens */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />{" "}
              {/* Replace textarea with PlaceholdersAndVanishInput */}
              <div className="w-full">
                <PlaceholdersAndVanishInput
                  value={input}
                  onChange={handleInputChange}
                  onSubmit={handleSubmitForm}
                  disabled={isStreaming || isTranscribing}
                  placeholders={[
                    `Ask in ${
                      getLanguageDetails(selectedLanguage).nativeName
                    }...`,
                    "How do I increase crop yield?",
                    "Best practices for organic farming?",
                    "How to deal with plant diseases?",
                    "Weather forecast for planting season?",
                  ]}
                  className="w-full max-w-none"
                  inputClassName="text-white py-2 sm:py-3 h-full text-sm sm:text-base"
                  placeholderClassName="text-green-300/70"
                />
              </div>
              <Button
                onClick={handleMicClick}
                disabled={isStreaming}
                className="p-2 sm:p-3 md:p-4 bg-green-900/60 backdrop-blur-sm hover:bg-green-800/70 rounded-xl text-green-200 border border-green-700/40 shadow-sm transition-colors flex-shrink-0"
                title={
                  isTranscribing
                    ? "Transcribing audio..."
                    : isRecording
                    ? "Stop recording"
                    : "Start voice input"
                }
              >
                {isRecording ? (
                  <Square size={18} className="text-red-500" />
                ) : isTranscribing ? (
                  <TypingIndicator />
                ) : (
                  <Mic size={18} />
                )}
              </Button>
              <Button
                onClick={() => handleSendMessage()}
                disabled={isStreaming || (!input.trim() && !uploadedImage)}
                className="p-2 sm:p-3 md:p-4 bg-green-900/80 text-green-100 rounded-xl h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 flex items-center justify-center border border-green-700/50 shadow-md hover:bg-green-800/90 backdrop-blur-sm transition-colors flex-shrink-0"
              >
                {isStreaming ? (
                  <TypingIndicator />
                ) : (
                  <Send
                    size={18}
                    className="sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]"
                  />
                )}
              </Button>
            </div>

            {/* Search, Thinking, and Upload buttons moved below in a row */}
            <div className="flex gap-1 sm:gap-2 justify-start mt-1 flex-wrap">
              <div className="relative">
                <Button
                  onClick={() => setShowAttachmentMenu((prev) => !prev)}
                  className="px-1.5 sm:px-2 py-1 rounded-lg bg-green-900/60 backdrop-blur-sm hover:bg-green-800/70 text-green-200 border border-green-700/40 shadow-sm transition-colors"
                >
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <Paperclip size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="text-xs">Upload</span>
                  </div>
                </Button>
                <AnimatePresence>
                  {showAttachmentMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-10"
                    >
                      <button
                        onClick={() => handleAttachmentClick("gallery")}
                        className="w-full flex items-center gap-2 sm:gap-3 text-left p-1.5 sm:p-2 rounded-lg text-gray-700 hover:bg-green-50 text-xs sm:text-sm"
                      >
                        <ImageUp
                          size={16}
                          className="text-green-600 sm:w-5 sm:h-5"
                        />{" "}
                        From Gallery
                      </button>
                      <button
                        onClick={() => handleAttachmentClick("camera")}
                        className="w-full flex items-center gap-2 sm:gap-3 text-left p-1.5 sm:p-2 rounded-lg text-gray-700 hover:bg-green-50 text-xs sm:text-sm"
                      >
                        <Camera
                          size={16}
                          className="text-green-600 sm:w-5 sm:h-5"
                        />{" "}
                        Take Photo
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onClick={() => {
                  setUseSearch(!useSearch)
                  if (!useSearch) setUseThinking(false) // Disable thinking when enabling search
                }}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  useSearch
                    ? "bg-green-700/90 text-white border border-green-500/30 shadow-md"
                    : "bg-white/60 backdrop-blur-sm text-gray-600 border border-white/40 shadow-sm"
                }`}
                title={
                  useSearch
                    ? "Search enabled - using web search"
                    : "Search disabled - using basic AI"
                }
              >
                <div className="flex items-center justify-center gap-1">
                  <Search className="w-3 h-3" />
                  <span className="text-xs">Search</span>
                </div>
              </Button>
              <Button
                onClick={() => {
                  setUseThinking(!useThinking)
                  if (!useThinking) setUseSearch(false) // Disable search when enabling thinking
                }}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  useThinking
                    ? "bg-green-700/90 text-white border border-green-500/30 shadow-md"
                    : "bg-white/60 backdrop-blur-sm text-gray-600 border border-white/40 shadow-sm"
                }`}
                title={
                  useThinking
                    ? "Thinking enabled - shows reasoning process"
                    : "Thinking disabled - direct answers"
                }
              >
                <div className="flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3" />
                  <span className="text-xs">Thinking</span>
                </div>
              </Button>

              {/* Notifications area for both error and image upload */}
              <div className="flex flex-wrap gap-2">
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="px-2 py-1 text-xs text-red-800 bg-red-100/90 rounded-lg flex items-center gap-1 backdrop-blur-sm border border-red-200/30 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      <span className="truncate">{error}</span>
                      <button
                        onClick={() => setError(null)}
                        className="flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Image upload notification */}
                <AnimatePresence>
                  {uploadedImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="px-2 py-1 text-xs text-green-800 bg-green-100/90 rounded-lg flex items-center gap-2 backdrop-blur-sm border border-green-200/30 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      <img
                        src={uploadedImage}
                        alt="Preview"
                        className="h-4 w-4 rounded-sm object-cover"
                      />
                      <span className="truncate">Image will be sent</span>
                      <button
                        onClick={() => setUploadedImage(null)}
                        className="flex-shrink-0"
                      >
                        <X size={12} className="text-green-700" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </GridBackground>
  )
}
