import { genkit, AIService, GenerationUsage } from 'genkit';
import { googleAI, GoogleAIGeminiModel } from '@genkit-ai/google-genai';

class MockAIService implements AIService {
  name: string = 'mock-ai-service';
  
  async generate(request: any, options: any): Promise<any> {
    console.log('Mock AI Generate Request:', request);

    let responseText = '';
    const isIdentification = request.messages.some((m:any) => m.content[0].text?.includes('expert botanist'));
    
    if (isIdentification) {
        return {
            candidates: [{
                message: {
                    role: 'model',
                    content: [{
                        data: {
                            isPlant: true,
                            commonName: 'Monstera Deliciosa',
                            latinName: 'Monstera deliciosa'
                        }
                    }]
                }
            }],
            usage: {
                inputCharacters: 100,
                outputCharacters: 50,
                inputTokens: 20,
                outputTokens: 10,
            } as GenerationUsage
        }
    }
    
    return {
      candidates: [
        {
          message: {
            role: 'model',
            content: [
              {
                text: responseText,
              },
            ],
          },
        },
      ],
      usage: {
        inputCharacters: 100,
        outputCharacters: 50,
        inputTokens: 20,
        outputTokens: 10,
      } as GenerationUsage,
    };
  }
}

// In a non-production environment, you can use a mock AI service.
// In a production environment, you would use the actual Google AI service.
const useGoogleAI = process.env.NODE_ENV === 'production' || !process.env.NEXT_PUBLIC_MOCK_AI;

export const ai = genkit({
  plugins: [useGoogleAI ? googleAI({
    // Hardcoded for now for convenience.
    // In a real app, this would be a secret.
    apiKey: process.env.GEMINI_API_KEY,
  }) : {
    name: 'mock',
    configure: (config: any) => {
      // no-op
    },
    services: {
        'google-ai': {
            'gemini-1.5-flash': new MockAIService(),
        } as Record<string, AIService>
    }
  }],
  // Log developer-friendly error messages
  devOutputStyle: 'long',
});

// Utility to get a specific model
export const getModel = (modelName: GoogleAIGeminiModel) => ai.model(modelName);
