
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
        model: 'googleai/gemini-pro',
        prompt: `Actúa como un experto en horticultura. Basado en la descripción del espacio de un usuario ("${input.userQuery}"), recomienda de 3 a 5 hortalizas o frutas. Responde únicamente con un objeto JSON que siga este esquema: ${JSON.stringify(CropRecommenderOutputSchema.shape)}.
Para cada recomendación en el array 'recommendations', proporciona: name, timeToHarvest, y plantingLocation.
Sé claro y conciso. Responde siempre en español. No incluyas "\`\`\`json" o cualquier otra cosa que no sea el objeto JSON.`,
    });

    try {
        const output = JSON.parse(llmResponse.text);
        return CropRecommenderOutputSchema.parse(output);
    } catch (e) {
        console.error("Failed to parse LLM response as JSON", llmResponse.text);
        throw new Error("El modelo no pudo generar recomendaciones en el formato esperado.");
    }
  }
);
