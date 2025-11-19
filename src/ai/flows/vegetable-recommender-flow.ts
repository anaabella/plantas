'use server';
/**
 * @fileOverview Flujo de Genkit para recomendar hortalizas para una huerta.
 *
 * - recommendVegetables: Función para obtener recomendaciones de hortalizas.
 * - VegetableRecommenderInput: El tipo de entrada para la función.
 * - VegetableRecommenderOutput: El tipo de retorno para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Esquema de entrada para la descripción del usuario.
const VegetableRecommenderInputSchema = z.object({
  userQuery: z.string().describe('La descripción del usuario sobre el espacio disponible para la huerta (ej. "balcón soleado", "patio con sombra").'),
});
export type VegetableRecommenderInput = z.infer<typeof VegetableRecommenderInputSchema>;

// Esquema para una recomendación individual de hortaliza.
const VegetableRecommendationSchema = z.object({
  name: z.string().describe('El nombre de la hortaliza recomendada.'),
  timeToHarvest: z.string().describe('El tiempo estimado desde la siembra hasta la cosecha (ej. "60-70 días").'),
  plantingLocation: z.string().describe('Una recomendación de dónde plantarla (ej. "Pleno sol, en maceta grande o directo en tierra").'),
});

// Esquema de salida que contiene una lista de recomendaciones.
const VegetableRecommenderOutputSchema = z.object({
  recommendations: z.array(VegetableRecommendationSchema).describe('Una lista de hortalizas recomendadas para plantar.'),
});
export type VegetableRecommenderOutput = z.infer<typeof VegetableRecommenderOutputSchema>;


/**
 * Función exportada que el cliente llamará para obtener recomendaciones.
 */
export async function recommendVegetables(input: VegetableRecommenderInput): Promise<VegetableRecommenderOutput> {
  return vegetableRecommenderFlow(input);
}

// Definición del prompt de Genkit.
const recommendVegetablesPrompt = ai.definePrompt({
  name: 'recommendVegetablesPrompt',
  input: { schema: VegetableRecommenderInputSchema },
  output: { schema: VegetableRecommenderOutputSchema },
  prompt: `Actúa como un experto en horticultura. Basado en la siguiente descripción del espacio de un usuario, recomienda 3 a 5 hortalizas o verduras adecuadas para plantar.

Para cada hortaliza, proporciona:
1.  El nombre común.
2.  El tiempo aproximado que tardará en estar lista para la cosecha.
3.  Una recomendación clave sobre dónde plantarla (ej: necesita pleno sol, ideal para macetas, prefiere sombra parcial, etc.).

Descripción del usuario: "{{userQuery}}"

Sé claro y conciso en tus recomendaciones. Responde siempre en español.`,
});


// Definición del flujo de Genkit.
const vegetableRecommenderFlow = ai.defineFlow(
  {
    name: 'vegetableRecommenderFlow',
    inputSchema: VegetableRecommenderInputSchema,
    outputSchema: VegetableRecommenderOutputSchema,
  },
  async (input) => {
    const { output } = await recommendVegetablesPrompt(input);
    if (!output) {
      throw new Error("El modelo no pudo generar recomendaciones de hortalizas.");
    }
    return output;
  }
);
