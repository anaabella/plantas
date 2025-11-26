'use server';
/**
 * @fileOverview A plant care AI assistant.
 *
 * This file defines a Genkit flow that provides care instructions for a given plant.
 *
 * - getCareTips - A function that takes a plant's name and type and returns care tips.
 */

import { ai } from './genkit'; // Import the centralized ai instance
import { z } from 'zod';
import { PlantCareGuide, PlantCareGuideSchema } from './plant-care-assistant.types';


// 1. Define the input schema
const PlantCareInputSchema = z.object({
  plantName: z.string().describe('The common name of the plant.'),
  plantType: z.string().optional().describe('The specific species or variety of the plant (e.g., Monstera Deliciosa).'),
});

// 2. Define the prompt
const carePrompt = ai.definePrompt({
  name: 'plantCarePrompt',
  input: { schema: PlantCareInputSchema },
  output: { schema: PlantCareGuideSchema },
  prompt: `
    You are an expert botanist. A user has asked for care information for their plant.
    Based on the provided plant name and type, provide a concise guide for the following aspects.
    
    Plant Name: {{{plantName}}}
    {{#if plantType}}Plant Type: {{{plantType}}}{{/if}}
    
    Provide practical and clear advice for a home gardener.
    The response must be in Spanish.
  `,
});

// 3. Define the flow
const careTipsFlow = ai.defineFlow(
  {
    name: 'careTipsFlow',
    inputSchema: PlantCareInputSchema,
    outputSchema: PlantCareGuideSchema,
  },
  async (input) => {
    const { output } = await carePrompt(input);
    return output!;
  }
);

// 4. Export a wrapper function to be called from the client
export async function getCareTips(
  input: z.infer<typeof PlantCareInputSchema>
): Promise<PlantCareGuide> {
  return careTipsFlow(input);
}
