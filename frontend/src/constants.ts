export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  suggestions?: string[];
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  welcome: string;
}

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