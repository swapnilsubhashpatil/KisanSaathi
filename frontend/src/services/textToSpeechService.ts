const GCP_API_KEY = import.meta.env.VITE_GCP_API_KEY;
if (!GCP_API_KEY) throw new Error("VITE_GCP_API_KEY is not defined.");

const API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCP_API_KEY}`;

/**
 * Removes markdown formatting from a string to make it suitable for text-to-speech.
 * @param text - The input string with markdown.
 * @returns The cleaned, plain text string.
 */
function cleanMarkdownForSpeech(text: string): string {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2')   // Italic
    .replace(/#{1,6}\s/g, '')          // Headers
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Code
    .replace(/!\[.*?\]\(.*?\)/g, '')    // Images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Links
    .replace(/>> .*/g, '')             // Remove follow-up suggestions
    .trim();
}

/**
 * Synthesizes speech from text using Google Cloud TTS.
 * @param text - The text to be converted to speech.
 * @param languageCode - The language code (e.g., 'en-US', 'hi-IN').
 * @returns A promise that resolves to an HTMLAudioElement.
 */
export async function synthesizeSpeech(text: string, languageCode: string): Promise<HTMLAudioElement> {
  const cleanText = cleanMarkdownForSpeech(text);
  if (!cleanText) {
    throw new Error("No text to synthesize after cleaning.");
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      input: { text: cleanText },
      voice: { languageCode: languageCode, ssmlGender: 'FEMALE' }, // Using a standard female voice
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`GCP TTS Error: ${response.statusText} - ${errorBody.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  return new Audio(audioUrl);
}