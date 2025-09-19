import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not defined.");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Language and error message mappings
const LANGUAGE_NAMES: Record<string, { name: string; nativeName: string }> = {
  'en-US': { name: 'English', nativeName: 'English' },
  'hi-IN': { name: 'Hindi', nativeName: 'हिन्दी' },
  'ta-IN': { name: 'Tamil', nativeName: 'தமிழ்' },
  'te-IN': { name: 'Telugu', nativeName: 'తెలుగు' },
  'kn-IN': { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  'ml-IN': { name: 'Malayalam', nativeName: 'മലയാളം' },
  'mr-IN': { name: 'Marathi', nativeName: 'मराठी' },
  'gu-IN': { name: 'Gujarati', nativeName: 'ગુજરાતી' },
};

const ERROR_MESSAGES: Record<string, { invalid_image: string; inappropriate_content: string }> = {
  'en-US': {
    invalid_image: "Please provide a clear, farm-related image (soil, plant, animal, or agricultural product) for analysis.",
    inappropriate_content: "Unable to process this request. Please provide an appropriate farm-related image."
  },
  'hi-IN': {
    invalid_image: "कृपया विश्लेषण के लिए एक स्पष्ट, कृषि-संबंधित छवि (मिट्टी, पौधा, जानवर या कृषि उत्पाद) प्रदान करें।",
    inappropriate_content: "इस अनुरोध को संसाधित करने में असमर्थ। कृपया एक उपयुक्त कृषि-संबंधित छवि प्रदान करें।"
  },
  'ta-IN': {
    invalid_image: "பகுப்பாய்வுக்கு தெளிவான, விவசாயம் தொடர்பான படத்தை (மண், தாவரம், விலங்கு அல்லது விவசாய தயாரிப்பு) வழங்கவும்.",
    inappropriate_content: "இந்த கோரிக்கையை செயலாக்க இயலவில்லை. தயவுசெய்து ஒரு பொருத்தமான விவசாயம் தொடர்பான படத்தை வழங்கவும்."
  },
  'te-IN': {
    invalid_image: "విశ్లేషణ కోసం స్పష్టమైన, వ్యవసాయ సంబంధిత చిత్రాన్ని (మట్టి, మొక్క, జంతువు లేదా వ్యవసాయ ఉత్పత్తి) అందించండి.",
    inappropriate_content: "ఈ అభ్యర్థనను ప్రాసెస్ చేయలేకపోయాము. దయచేసి సరైన వ్యవసాయ సంబంధిత చిత్రాన్ని అందించండి."
  },
  'kn-IN': {
    invalid_image: "ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಸ್ಪಷ್ಟವಾದ, ಕೃಷಿ ಸಂಬಂಧಿತ ಚಿತ್ರವನ್ನು (ಮಣ್ಣು, ಸಸ್ಯ, ಪ್ರಾಣಿ ಅಥವಾ ಕೃಷಿ ಉತ್ಪನ್ನ) ನೀಡಿ.",
    inappropriate_content: "ಈ ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಸೂಕ್ತವಾದ ಕೃಷಿ ಸಂಬಂಧಿತ ಚಿತ್ರವನ್ನು ನೀಡಿ."
  },
  'ml-IN': {
    invalid_image: "വിശകലനത്തിനായി വ്യക്തമായ ഒരു കൃഷി-ബന്ധിത ചിത്രം (മണ്ണ്, സസ്യം, മൃഗം അല്ലെങ്കിൽ കൃഷി ഉത്പന്നം) നൽകുക.",
    inappropriate_content: "ഈ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യാൻ കഴിയില്ല. ദയവായി ഒരു ഉചിതമായ കൃഷി-ബന്ധിത ചിത്രം നൽകുക."
  },
  'mr-IN': {
    invalid_image: "विश्लेषणासाठी स्पष्ट, शेती-संबंधित प्रतिमा (माती, रोप, प्राणी किंवा कृषी उत्पादन) प्रदान करा.",
    inappropriate_content: "या विनंतीवर प्रक्रिया करणे शक्य नाही. कृपया योग्य शेती-संबंधित प्रतिमा प्रदान करा."
  },
  'gu-IN': {
    invalid_image: "વિશ્લેષણ માટે સ્પષ્ટ, ખેતી-સંબંધિત છબી (માટી, છોડ, પ્રાણી અથવા કૃષિ ઉત્પાદન) પ્રદાન કરો.",
    inappropriate_content: "આ વિનંતી પર પ્રક્રિયા કરવામાં અસમર્થ. કૃપા કરીને યોગ્ય ખેતી-સંબંધિત છબી પ્રદાન કરો."
  },
};

function getLanguageDetails(code: string) {
  return LANGUAGE_NAMES[code] || LANGUAGE_NAMES['en-US'];
}

function getErrorMessage(language: string, type: 'invalid_image' | 'inappropriate_content') {
  return ERROR_MESSAGES[language]?.[type] || ERROR_MESSAGES['en-US'][type];
}

/**
 * Analyzes a farm-related image and generates a streamed response.
 * @param prompt - The user's text accompanying the image.
 * @param imagePart - The image data formatted as a Gemini API Part.
 * @param language - The language code for the response (e.g., 'en-US', 'hi-IN').
 * @returns An async iterator for the streamed response chunks.
 */
export async function analyzeImage(prompt: string, imagePart: Part, language: string = 'en-US') {
  // Get language details for the system instruction
  const languageDetails = getLanguageDetails(language);

  const IMAGE_ANALYSIS_SYSTEM_INSTRUCTION = `
You are an Expert Agricultural Consultant for KisanSaathi, specializing in the visual analysis of farm-related images from India. Farmers will upload images for your expert opinion.

**Your Role & Analysis Rules:**

1.  **Analyze the Image First**: Your primary task is to analyze the provided image. The user's text is secondary context.

2.  **Valid Agricultural Image (Soil, Plant, Animal, Dairy, Farm Product):**
    * **Identify & Describe**: Clearly state what you see in the image (e.g., "This image shows a tomato plant leaf with yellow spots.").
    * **Diagnose the Issue**: Identify the problem with high confidence. State the most likely issue (e.g., disease, pest, deficiency).
    * **Provide Solutions**: Give clear, step-by-step solutions. Prioritize organic and Integrated Pest Management (IPM) methods first, then suggest chemical solutions if necessary, including specific chemical names and dosages (e.g., "Spray Mancozeb at 2 grams per litre of water").
    * **Give Prevention Tips**: Offer practical advice to prevent the issue from recurring.
    * **Formatting**: Use markdown (**bolding**, lists) to make the advice easy to read.
    * **Language**: Respond in ${languageDetails.nativeName} (${languageDetails.name}).
    * **STRICT LANGUAGE REQUIREMENT**: You MUST respond ONLY in ${languageDetails.nativeName}. Do not mix languages or respond in any other language.

3.  **Non-Agricultural or Unclear Image:**
    * If the image is not related to farming (e.g., a car, a building) or is too blurry to analyze, you MUST return only this exact phrase:
        "${getErrorMessage(language, 'invalid_image')}"

4.  **Inappropriate or Malicious Content:**
    * If the image is spam, inappropriate, or harmful, you MUST return only this exact phrase:
        "${getErrorMessage(language, 'inappropriate_content')}"
`;

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: IMAGE_ANALYSIS_SYSTEM_INSTRUCTION,
  });

  const contentParts: Part[] = [imagePart];
  // Add the text prompt only if it's not empty
  if (prompt.trim()) {
    contentParts.unshift({ text: prompt });
  } else {
    // If no text is provided, give a default instruction.
    contentParts.unshift({ text: "Please analyze this agricultural image and provide a detailed report with solutions." });
  }

  const result = await model.generateContentStream(contentParts);
  return result.stream;
}