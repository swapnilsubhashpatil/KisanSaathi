import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not defined.");
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// This powerful prompt is adapted directly from your excellent example.
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
    * **Language**: Respond in the language requested by the user.

3.  **Non-Agricultural or Unclear Image:**
    * If the image is not related to farming (e.g., a car, a building) or is too blurry to analyze, you MUST return only this exact phrase:
        "Please provide a clear, farm-related image (soil, plant, animal, or agricultural product) for analysis."

4.  **Inappropriate or Malicious Content:**
    * If the image is spam, inappropriate, or harmful, you MUST return only this exact phrase:
        "Unable to process this request. Please provide an appropriate farm-related image."
`;

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: IMAGE_ANALYSIS_SYSTEM_INSTRUCTION,
});


/**
 * Analyzes a farm-related image and generates a streamed response.
 * @param prompt - The user's text accompanying the image.
 * @param imagePart - The image data formatted as a Gemini API Part.
 * @returns An async iterator for the streamed response chunks.
 */
export async function analyzeImage(prompt: string, imagePart: Part) {
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