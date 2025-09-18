// services/aiService.ts
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

let abortController = new AbortController();
export function cancelActiveRequest() {
  abortController.abort();
  // Re-create the controller for future requests
  abortController = new AbortController();
}

interface AIResponsePayload {
  prompt: string;
  history: { role: string; content: string }[];
  language?: string; // Added for multilingual
}

interface AIUpdate {
  text?: string;
  thinking?: string;
  done?: boolean;
}

/**
 * Gets a streaming AI response for a text prompt.
 * This function communicates with a backend API route (/api/chat)
 * which should be set up to use the Groq SDK with the 'llama3-70b-8192' model (fixed from invalid model).
 */
export async function getAIResponse(
  payload: AIResponsePayload,
  onUpdate: (update: AIUpdate) => void
): Promise<void> {
  // Reset the abort controller for this new request
  if (abortController.signal.aborted) {
    abortController = new AbortController();
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${errorText}`);
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
      
      // Process server-sent events (SSE)
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || ""; // Keep the last, possibly incomplete, part

      for (const part of parts) {
        if (part.startsWith('data: ')) {
          const jsonString = part.substring(6);
          if (jsonString === '[DONE]') {
             onUpdate({ done: true });
             return;
          }
          try {
            const chunk = JSON.parse(jsonString) as AIUpdate;
            onUpdate(chunk);
          } catch (e) {
            console.error("Failed to parse stream chunk:", jsonString, e);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('AI request was cancelled.');
      onUpdate({ done: true }); // Signal completion on cancellation
    } else {
      console.error('Error fetching AI response:', error);
      throw error; // Re-throw to be caught by the component
    }
  }
}

// Message types
export interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string; // Optional URL for image messages
  audioUrl?: string; // Optional URL for audio messages
  thinking?: string; // Optional thinking process text
}

// Import the necessary types for the chat completion
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';

// Interface for streaming callbacks
interface StreamCallbacks {
  text?: string;
  thinking?: string;
  done: boolean;
}

// Type for context options
interface ContextOptions {
  userLanguage?: string;
  userLocation?: string;
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
}

// Type for streaming callbacks
type ProgressCallback = (update: StreamCallbacks) => void;

// AI Service for text-based queries
export async function getAIResponseDirect(
  userInput: string,
  contextOptions?: ContextOptions,
  onProgress?: ProgressCallback
) {
  // Format previous messages for the API with correct typing
  const previousMessages = contextOptions?.previousMessages || [];
  
  // System prompt for agriculture focus with multilingual
  const systemPrompt = `
    You are KisanSaathi, a helpful and knowledgeable assistant for Indian farmers.
    Your goal is to provide clear, practical, and actionable advice.
    Use simple language. Keep responses concise and to the point.
    If asked about non-farming topics, gently steer the conversation back to agriculture.
    ${contextOptions?.userLanguage ? `Respond in ${contextOptions.userLanguage}.` : 'Respond in English.'}
    ${contextOptions?.userLocation ? `Consider farming practices relevant to ${contextOptions.userLocation}.` : ''}
  `;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...previousMessages as ChatCompletionMessageParam[],
    { role: "user", content: userInput },
  ];

  if (onProgress) {
    // For streaming responses with callbacks
    return await streamAIResponse(messages, onProgress);
  }
  
  // For regular non-streaming responses
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-70b-8192", // Fixed to valid model
      temperature: 0.6,
      max_tokens: 4096, // Fixed from max_completion_tokens
      top_p: 0.95,
      stream: false,
    });

    return chatCompletion.choices[0]?.message?.content || "Sorry, I could not get a response.";
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new Error("There was an error connecting to the AI service. Please check your API key and try again.");
  }
}

// Stream response handler for real-time UI updates (fixed to accumulate full response)
async function streamAIResponse(
  messages: ChatCompletionMessageParam[],
  onProgress?: (update: StreamCallbacks) => void
) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true });
    const stream = await groq.chat.completions.create({
      messages,
      model: "llama3-70b-8192", // Fixed
      temperature: 0.6,
      max_tokens: 4096,
      top_p: 0.95,
      stream: true,
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      if (onProgress) {
        onProgress({
          text: fullResponse, // Set full to avoid duplication
          done: false
        });
      }
    }
    
    // Signal that we're done streaming
    if (onProgress) {
      onProgress({ done: true });
    }
    
    return fullResponse || "Sorry, I could not get a streaming response.";
  } catch (error) {
    console.error("Streaming Error:", error);
    
    // Signal error through callback
    if (onProgress) {
      onProgress({
        text: "There was an error with the streaming response.",
        done: true
      });
    }
    
    return "There was an error with the streaming response.";
  }
}

// Image analysis service using Gemini (since Groq doesn't support vision natively, changed to Gemini)
export async function analyzeImage(
  imageUrl: string,
  prompt: string = "Analyze this farming image and describe what you see",
  language: string = "English",
  onProgress?: ProgressCallback
) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `Respond in ${language}.` 
    });

    const imageParts = [{
      inlineData: {
        data: imageUrl.split(',')[1], // Assume base64
        mimeType: 'image/jpeg' // Assume
      }
    }];

    // Handle streaming vs non-streaming
    if (onProgress) {
      try {
        // Use non-streaming API for simplicity, but simulate streaming for UI
        const response = await model.generateContent([prompt, ...imageParts]);
        const fullText = response.response.text() || "Sorry, I couldn't analyze this image.";
        
        // Simulate streaming by sending chunks of text with small delays
        const chunks = fullText.match(/.{1,20}/g) || [];
        let processedText = '';
        
        for (const chunk of chunks) {
          processedText += chunk;
          onProgress({
            text: processedText,
            done: false
          });
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        onProgress({ done: true });
        return fullText;
      } catch (streamError) {
        console.error("Image analysis error:", streamError);
        onProgress({
          text: "Error analyzing the image.",
          done: true
        });
        return "Error analyzing the image.";
      }
    } else {
      // Non-streaming response
      const response = await model.generateContent([prompt, ...imageParts]);
      return response.response.text() || "Sorry, I couldn't analyze this image.";
    }
  } catch (error) {
    console.error("Image Analysis Error:", error);
    
    if (onProgress) {
      onProgress({
        text: "There was an error analyzing the image.",
        done: true
      });
    }
    
    throw new Error("There was an error analyzing the image. Please try again.");
  }
}