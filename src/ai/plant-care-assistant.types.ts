import { z } from 'zod';

// Define the output schema for the plant care guide
export const PlantCareGuideSchema = z.object({
  watering: z.string().describe('Instructions on how and when to water the plant.'),
  light: z.string().describe('Recommendations for light exposure (direct sun, indirect light, shade).'),
  pruning: z.string().describe('Advice on if, when, and how to prune the plant.'),
  fertilizing: z.string().describe('Guidelines on fertilizing the plant, including type and frequency.'),
  flowering: z.string().describe('Information about the plant\'s flowering season and care during that period.'),
});

// Export the inferred type
export type PlantCareGuide = z.infer<typeof PlantCareGuideSchema>;
