'use server';
/**
 * @fileOverview Flujo de Genkit para identificar una planta a partir de una foto.
 *
 * - identifyPlant: Identifica una planta y devuelve su nombre.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Esquema de entrada
const IdentifyPlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una planta, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyPlantInput = z.infer<typeof IdentifyPlantInputSchema>;

// Esquema de salida
const IdentifyPlantOutputSchema = z.object({
  isPlant: z.boolean().describe('Confirma si la imagen contiene una planta.'),
  commonName: z.string().describe('El nombre común de la planta identificada.'),
  latinName: z.string().describe('El nombre científico/latino de la planta.'),
});
export type IdentifyPlantOutput = z.infer<typeof IdentifyPlantOutputSchema>;

/**
 * Identifica una planta a partir de una imagen.
 */
export async function identifyPlant(input: IdentifyPlantInput): Promise<IdentifyPlantOutput> {
  return identifyPlantFlow(input);
}

const identifyPlantFlow = ai.defineFlow(
  {
    name: 'identifyPlantFlow',
    inputSchema: IdentifyPlantInputSchema,
    outputSchema: IdentifyPlantOutputSchema,
  },
  async input => {
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-pro-vision',
        prompt: `Analiza la siguiente imagen de una planta. Tu única tarea es identificarla.
Responde únicamente con un objeto JSON que siga estrictamente este esquema Zod: ${JSON.stringify(IdentifyPlantOutputSchema.shape)}.
- isPlant: boolean que confirma si es una planta.
- commonName: El nombre común más conocido.
- latinName: El nombre científico/latino.
Responde de forma concisa y directa. Responde siempre en español. No incluyas \`\`\`json o cualquier otra cosa que no sea el objeto JSON.
Foto: ${input.photoDataUri}`,
    });
    
    const textResponse = llmResponse.text();
    try {
        return JSON.parse(textResponse);
    } catch (e) {
        console.error("Failed to parse LLM response as JSON:", textResponse);
        throw new Error("El modelo no pudo identificar la planta.");
    }
  }
);
