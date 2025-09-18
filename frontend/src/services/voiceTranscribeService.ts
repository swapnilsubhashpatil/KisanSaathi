const GCP_API_KEY = import.meta.env.VITE_GCP_API_KEY;
if (!GCP_API_KEY) throw new Error("VITE_GCP_API_KEY is not defined.");

const API_URL = `https://speech.googleapis.com/v1/speech:recognize?key=${GCP_API_KEY}`;

/**
 * Transcribes an audio blob to text using Google Cloud Speech-to-Text.
 * @param audioBlob - The audio data as a Blob.
 * @param languageCode - The language of the audio (e.g., 'en-US', 'hi-IN').
 * @returns A promise that resolves to the transcribed text.
 */
export async function transcribeAudio(audioBlob: Blob, languageCode: string): Promise<string> {
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        // Use a more robust encoding if available from your recorder
        encoding: 'WEBM_OPUS', 
        sampleRateHertz: 48000,
        languageCode: languageCode,
        model: 'default', // Use 'latest_long' for more accuracy if needed
      },
      audio: { content: base64Audio },
    }),
  });

  if (!response.ok) {
     const errorBody = await response.json();
    throw new Error(`GCP Transcription Error: ${response.statusText} - ${errorBody.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.results?.[0]?.alternatives?.[0]?.transcript || "";
}