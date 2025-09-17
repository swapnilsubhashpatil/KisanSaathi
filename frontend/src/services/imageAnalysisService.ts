// services/imageAnalysisService.ts

// Re-use the cancellation logic from the AI service
import { cancelActiveRequest } from './aiService';

interface ImageResponsePayload {
  prompt: string;
  image: string; // Base64 encoded image
  history: { role: string; content: string }[];
  language?: string; // Added for multilingual
}

interface ImageUpdate {
  text?: string;
  done?: boolean;
}

/**
 * Gets a streaming response for an image and a text prompt.
 * This function communicates with a backend API route (/api/vision)
 * which should be set up to use a vision model like 'gemini-1.5-flash' via the Google SDK (since Groq no vision).
 */
export async function getImageResponse(
  payload: ImageResponsePayload,
  onUpdate: (update: ImageUpdate) => void
): Promise<void> {
  // The streaming and error handling logic is very similar to getAIResponse
  try {
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Use a shared AbortController or a separate one if needed
      // signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API Error: ${response.status} ${errorText}`);
    }
    
    if (!response.body) {
        throw new Error("Response body is empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        onUpdate({ done: true });
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (part.startsWith('data: ')) {
          const jsonString = part.substring(6);
          if (jsonString === '[DONE]') {
             onUpdate({ done: true });
             return;
          }
          try {
            const chunk = JSON.parse(jsonString) as ImageUpdate;
            onUpdate(chunk);
          } catch (e) {
            console.error("Failed to parse vision stream chunk:", jsonString, e);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Vision request was cancelled.');
      onUpdate({ done: true });
    } else {
      console.error('Error fetching vision response:', error);
      throw error;
    }
  }
}

export { cancelActiveRequest };