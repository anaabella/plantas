'use server';
/**
 * @fileOverview A plant identification AI flow.
 *
 * - identifyPlant - A function that handles plant identification.
 * - IdentifyPlantInput - The input type for the identifyPlant function.
 * - IdentifyPlantOutput - The return type for the identifyPlant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IdentifyPlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyPlantInput = z.infer<typeof IdentifyPlantInputSchema>;

const IdentifyPlantOutputSchema = z.object({
  isPlant: z.boolean().describe('Whether the image is determined to be a plant or not.'),
  commonName: z.string().describe('The common name of the plant.'),
  latinName: z.string().describe('The latin/scientific name of the plant.'),
});
export type IdentifyPlantOutput = z.infer<typeof IdentifyPlantOutputSchema>;

export async function identifyPlant(input: IdentifyPlantInput): Promise<IdentifyPlantOutput> {
  return identifyPlantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyPlantPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: IdentifyPlantInputSchema },
  output: { schema: IdentifyPlantOutputSchema },
  prompt: `You are an expert botanist. Your task is to identify the plant in the provided image.

First, determine if the image contains a plant. If it does not, set isPlant to false and leave the other fields empty.

If it is a plant, provide its common name and its scientific (Latin) name. Provide only the names, without any additional explanation.

For example, for an image of a Monstera Deliciosa, the output should be:
- commonName: "Monstera Deliciosa" or "Costilla de Adán"
- latinName: "Monstera deliciosa"

Photo: {{media url=photoDataUri}}`,
});

const identifyPlantFlow = ai.defineFlow(
  {
    name: 'identifyPlantFlow',
    inputSchema: IdentifyPlantInputSchema,
    outputSchema: IdentifyPlantOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
