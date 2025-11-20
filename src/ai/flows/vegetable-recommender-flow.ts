'use server';
/**
 * @fileOverview Flujo de Genkit para recomendar hortalizas y frutas para una huerta.
 *
 * - recommendCrops: Función para obtener recomendaciones de hortalizas y frutas.
 * - CropRecommenderInput: El tipo de entrada para la función.
 * - CropRecommenderOutput: El tipo de retorno para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Esquema de entrada para la descripción del usuario.
const CropRecommenderInputSchema = z.object({
  userQuery: z.string().describe('La descripción del usuario sobre el espacio disponible para la huerta (ej. "balcón soleado", "patio con sombra").'),
});
export type CropRecommenderInput = z.infer<typeof CropRecommenderInputSchema>;

// Esquema para una recomendación individual.
const CropRecommendationSchema = z.object({
  name: z.string().describe('El nombre de la hortaliza o fruta recomendada.'),
  timeToHarvest: z.string().describe('El tiempo estimado desde la siembra hasta la cosecha (ej. "60-70 días", "2-3 años").'),
  plantingLocation: z.string().describe('Una recomendación de dónde plantarla (ej. "Pleno sol, en maceta grande o directo en tierra").'),
});

// Esquema de salida que contiene una lista de recomendaciones.
const CropRecommenderOutputSchema = z.object({
  recommendations: z.array(CropRecommendationSchema).describe('Una lista de hortalizas o frutas recomendadas para plantar.'),
});
export type CropRecommenderOutput = z.infer<typeof CropRecommenderOutputSchema>;


/**
 * Función exportada que el cliente llamará para obtener recomendaciones.
 */
export async function recommendCrops(input: CropRecommenderInput): Promise<CropRecommenderOutput> {
  return cropRecommenderFlow(input);
}

// Definición del flujo de Genkit.
const cropRecommenderFlow = ai.defineFlow(
  {
    name: 'cropRecommenderFlow',
    inputSchema: CropRecommenderInputSchema,
    outputSchema: CropRecommenderOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: `Actúa como un experto en horticultura. Basado en la siguiente descripción del espacio de un usuario, recomienda de 3 a 5 hortalizas o frutas adecuadas para plantar.

Para cada recomendación, proporciona:
1.  El nombre común.
2.  El tiempo aproximado que tardará en estar lista para la cosecha.
3.  Una recomendación clave sobre dónde plantarla (ej: necesita pleno sol, ideal para macetas, prefiere sombra parcial, etc.).

Descripción del usuario: "${input.userQuery}"

Sé claro y conciso en tus recomendaciones. Responde siempre en español.`,
      model: googleAI.model('gemini-pro'),
      output: { schema: CropRecommenderOutputSchema, format: 'json' }
    });
    const output = llmResponse.output();
    if (!output) {
      throw new Error("El modelo no pudo generar recomendaciones.");
    }
    return output;
  }
);
