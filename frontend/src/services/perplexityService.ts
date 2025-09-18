const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export type PerplexityModel = 'sonar' | 'sonar-pro' | 'sonar-deep-research' | 'sonar-reasoning' | 'sonar-reasoning-pro';

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityOptions {
  model?: PerplexityModel;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  search_mode?: 'academic' | 'web';
  reasoning_effort?: 'low' | 'medium' | 'high';
  stream?: boolean;
  disable_search?: boolean;
  return_images?: boolean;
  return_related_questions?: boolean;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    search_context_size?: string;
    cost?: {
      input_tokens_cost: number;
      output_tokens_cost: number;
      request_cost: number;
      total_cost: number;
    };
  };
  citations: string[];
  search_results: Array<{
    title: string;
    url: string;
    date?: string;
    last_updated?: string;
    snippet: string;
  }>;
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
}

export async function generatePerplexityResponse(
  messages: PerplexityMessage[],
  options: PerplexityOptions = {}
) {
  const {
    model = 'sonar-reasoning',
    temperature = 0.2,
    max_tokens = 2048,
    top_p = 0.9,
    search_mode = 'web',
    reasoning_effort = 'medium',
    stream = true,
    disable_search = false,
    return_images = false,
    return_related_questions = false,
  } = options;

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens,
    top_p,
    search_mode,
    reasoning_effort,
    stream,
    disable_search,
    return_images,
    return_related_questions,
  };

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Perplexity API error: ${errorData.error?.message || response.statusText}`);
    }

    if (stream) {
      return response.body;
    } else {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  } catch (error) {
    console.error('Perplexity API request failed:', error);
    throw error;
  }
}

export async function generatePerplexitySearchResponse(
  messages: PerplexityMessage[],
  options: PerplexityOptions = {}
): Promise<PerplexityResponse> {
  const {
    model = 'sonar',
    temperature = 0.2,
    max_tokens = 2048,
    top_p = 0.9,
    search_mode = 'web',
    stream = false,
    disable_search = false,
    return_images = false,
    return_related_questions = false,
  } = options;

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens,
    top_p,
    search_mode,
    stream,
    disable_search,
    return_images,
    return_related_questions,
    web_search_options: {
      image_search_relevance_enhanced: false,
      search_context_size: "low"
    },
  };

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Perplexity API error: ${errorData.error?.message || response.statusText}`);
    }

    const data: PerplexityResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Perplexity search API request failed:', error);
    throw error;
  }
}

// Helper function to convert our message format to Perplexity format
export function convertToPerplexityMessages(ourMessages: Array<{role: string, content: string}>): PerplexityMessage[] {
  return ourMessages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }));
}