'use server';
/**
 * @fileOverview Flujo de Genkit para identificar una planta a partir de una foto.
 *
 * - identifyPlant: Identifica una planta y devuelve su nombre.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const IdentifyPlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una planta, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyPlantInput = z.infer<typeof IdentifyPlantInputSchema>;

const IdentifyPlantOutputSchema = z.object({
  isPlant: z.boolean().describe('Confirma si la imagen contiene una planta.'),
  commonName: z.string().describe('El nombre común de la planta identificada.'),
  latinName: z.string().describe('El nombre científico/latino de la planta.'),
});
export type IdentifyPlantOutput = z.infer<typeof IdentifyPlantOutputSchema>;

export async function identifyPlant(input: IdentifyPlantInput): Promise<IdentifyPlantOutput> {
  return identifyPlantFlow(input);
}

const identifyPlantPrompt = ai.definePrompt({
    name: 'identifyPlantPrompt',
    input: { schema: IdentifyPlantInputSchema },
    output: { schema: IdentifyPlantOutputSchema },
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `Analiza la siguiente imagen de una planta. Tu única tarea es identificarla. Responde siempre en español.
Foto: {{media url=photoDataUri}}`,
});

const identifyPlantFlow = ai.defineFlow(
  {
    name: 'identifyPlantFlow',
    inputSchema: IdentifyPlantInputSchema,
    outputSchema: IdentifyPlantOutputSchema,
  },
  async (input) => {
    const { output } = await identifyPlantPrompt(input);
    if (!output) {
        throw new Error("El modelo no pudo identificar la planta.");
    }
    return output;
  }
);
