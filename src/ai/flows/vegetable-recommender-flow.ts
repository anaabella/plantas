'use server';
/**
 * @fileOverview Flujo de Genkit para recomendar hortalizas y frutas para una huerta.
 *
 * - recommendCrops: Función para obtener recomendaciones de hortalizas y frutas.
 * - CropRecommenderInput: El tipo de entrada para la función.
 * - CropRecommenderOutput: El tipo de retorno para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CropRecommenderInputSchema = z.object({
  userQuery: z.string().describe('La descripción del usuario sobre el espacio disponible para la huerta (ej. "balcón soleado", "patio con sombra").'),
});
export type CropRecommenderInput = z.infer<typeof CropRecommenderInputSchema>;

const CropRecommendationSchema = z.object({
  name: z.string().describe('El nombre de la hortaliza o fruta recomendada.'),
  timeToHarvest: z.string().describe('El tiempo estimado desde la siembra hasta la cosecha (ej. "60-70 días", "2-3 años").'),
  plantingLocation: z.string().describe('Una recomendación de dónde plantarla (ej. "Pleno sol, en maceta grande o directo en tierra").'),
});

const CropRecommenderOutputSchema = z.object({
  recommendations: z.array(CropRecommendationSchema).describe('Una lista de hortalizas o frutas recomendadas para plantar.'),
});
export type CropRecommenderOutput = z.infer<typeof CropRecommenderOutputSchema>;

export async function recommendCrops(input: CropRecommenderInput): Promise<CropRecommenderOutput> {
  return cropRecommenderFlow(input);
}

const cropRecommenderPrompt = ai.definePrompt({
    name: 'cropRecommenderPrompt',
    input: { schema: CropRecommenderInputSchema },
    output: { schema: CropRecommenderOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `Actúa como un experto en horticultura. Basado en la descripción del espacio de un usuario ("{{{userQuery}}}"), recomienda de 3 a 5 hortalizas o frutas. Sé claro y conciso. Responde siempre en español.`,
});

const cropRecommenderFlow = ai.defineFlow(
  {
    name: 'cropRecommenderFlow',
    inputSchema: CropRecommenderInputSchema,
    outputSchema: CropRecommenderOutputSchema,
  },
  async (input) => {
    const { output } = await cropRecommenderPrompt(input);
    if (!output) {
      throw new Error("El modelo no pudo generar recomendaciones.");
    }
    return output;
  }
);
