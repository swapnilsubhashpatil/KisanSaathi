// services/voiceTranscribeService.ts

interface TranscriptionResult {
  text: string;
}

/**
 * Transcribes an audio blob to text.
 * This function communicates with a backend API route (/api/transcribe)
 * which should be set up to use the Groq SDK with the 'whisper-large-v3' model.
 * It sends the audio file as multipart/form-data.
 */
export async function transcribeAudio(audioBlob: Blob, language: string = 'en'): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm'); // Filename is important
  formData.append('language', language); // Added for multilingual

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription API Error: ${response.status} ${errorText}`);
    }

    const result: TranscriptionResult = await response.json();
    return result;
    
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio. Please try again.');
  }
}