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
  } = {},
  chatHistory?: Array<{sender: string, text: string, timestamp: string}>,
  language?: string
): Promise<ThinkingResponse> {
  const { model = "qwen/qwen3-32b", temperature = 0.6 } = options;

  // Create enhanced prompt with context
  const systemContext = `You are KisanSaathi, an agricultural AI assistant. Focus on agriculture-related topics only. If the query is not related to agriculture, politely decline and redirect to farming topics.

Language: ${language || 'English'}

STRICT LANGUAGE REQUIREMENT: You MUST respond ONLY in ${language || 'English'}. Do not mix languages or respond in any other language. If the user asks in ${language || 'English'}, answer in ${language || 'English'} only.

Conversation History:
${chatHistory && chatHistory.length > 0 ? chatHistory.map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n') : 'No previous conversation.'}

Remember: Only answer agriculture-related questions. For non-agriculture topics, respond: "I'm sorry, but as KisanSaathi, my expertise is dedicated exclusively to agriculture and farming. I'd be happy to help you with any farming-related questions you might have!"

User Query: ${prompt}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: systemContext
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