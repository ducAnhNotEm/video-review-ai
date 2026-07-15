import { GenerateScriptRequest, GenerateScriptResponse } from 'shared';

export class LlmService {
  public async generateScript(req: GenerateScriptRequest): Promise<GenerateScriptResponse> {
    const systemPrompt = `You are an AI Video Agent. Your goal is to write a script and visual scene B-roll instructions for a short video based on the user request.
Respond ONLY with a valid JSON object matching this structure:
{
  "script": "The spoken words/narrative script content",
  "visualSuggestions": [
    "Sentence 1 scene visual details (e.g., Closeup of hands typing on keyboad, cinematic lighting)",
    "Sentence 2 scene visual details..."
  ]
}
Do not return any markdown formatting outside the JSON block. Do not include prefix comments.`;

    const userPrompt = `Create a short video script about: ${req.prompt}`;

    switch (req.provider) {
      case 'gemini':
        return this.callGemini(req.modelName, systemPrompt, userPrompt);
      case 'openai':
        return this.callOpenAi(req.modelName, systemPrompt, userPrompt);
      case 'ollama':
        return this.callOllama(req.modelName, systemPrompt, userPrompt);
      default:
        throw new Error(`Unsupported LLM provider: ${req.provider}`);
    }
  }

  private async callGemini(modelName: string, systemPrompt: string, userPrompt: string): Promise<GenerateScriptResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }

    // Default to a sensible gemini model if none provided
    const model = modelName || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as any;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Invalid empty candidate returned from Gemini API');
    }

    return JSON.parse(text) as GenerateScriptResponse;
  }

  private async callOpenAi(modelName: string, systemPrompt: string, userPrompt: string): Promise<GenerateScriptResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not defined.');
    }

    const model = modelName || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as any;
    const text = result.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Invalid empty choice returned from OpenAI API');
    }

    return JSON.parse(text) as GenerateScriptResponse;
  }

  private async callOllama(modelName: string, systemPrompt: string, userPrompt: string): Promise<GenerateScriptResponse> {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = modelName || 'llama3';

    const response = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API Error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as any;
    const text = result.message?.content;
    if (!text) {
      throw new Error('Invalid empty message content from Ollama');
    }

    return JSON.parse(text) as GenerateScriptResponse;
  }
}

export const llmService = new LlmService();
