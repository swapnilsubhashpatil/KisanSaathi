import { Groq } from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
if (!GROQ_API_KEY) throw new Error("VITE_GROQ_API_KEY is not defined.");

const groq = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface ThinkingResponse {
  answer: string;
  thoughts: string;
}

export async function generateThinkingResponse(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
  } = {}
): Promise<ThinkingResponse> {
  const { model = "qwen/qwen3-32b", temperature = 0.6 } = options;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model,
      temperature,
      max_completion_tokens: 4096,
      top_p: 0.95,
      stream: false,
      reasoning_effort: "default",
      stop: null
    });

    const fullResponse = chatCompletion.choices[0]?.message?.content || '';

    // Parse the response to extract thinking and answer
    const thinkMatch = fullResponse.match(/<think>(.*?)<\/think>/s);
    const thoughts = thinkMatch ? thinkMatch[1].trim() : '';

    // Remove the thinking part from the answer
    const answer = fullResponse.replace(/<think>.*?<\/think>/s, '').trim();

    return {
      answer: answer || fullResponse, // fallback to full response if parsing fails
      thoughts: thoughts,
    };
  } catch (error) {
    console.error("Groq thinking API request failed:", error);
    throw error;
  }
}