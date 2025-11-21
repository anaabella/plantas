'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

/* ---------- Diagnose (con imagen) ---------- */
const DiagnoseInputSchema = z.object({
  photoDataUri: z.string(),
  description: z.string(),
});
export type DiagnoseInput = z.infer<typeof DiagnoseInputSchema>;

const DiagnoseOutputSchema = z.object({
  identification: z.object({
    isPlant: z.boolean(),
    commonName: z.string(),
    latinName: z.string(),
  }),
  diagnosis: z.object({
    isHealthy: z.boolean(),
    diagnosis: z.string(),
    recommendation: z.string(),
  }),
});
export type DiagnoseOutput = z.infer<typeof DiagnoseOutputSchema>;

export const diagnosePlant = ai.defineFlow(
  { name: 'diagnosePlant', inputSchema: DiagnoseInputSchema, outputSchema: DiagnoseOutputSchema },
  async ({ photoDataUri, description }) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-pro-vision', // ✅ modelo con visión
      prompt: `Actúa como botánico experto. Analiza la imagen y la descripción. Responde SIEMPRE en español.\nDescripción: ${description}`,
      media: [{ contentType: photoDataUri.split(';')[0].split(':')[1], data: photoDataUri.split(',')[1] }],
      output: { schema: DiagnoseOutputSchema },
    });
    if (!output) {
      throw new Error("El modelo no generó una respuesta válida.");
    }
    return output;
  }
);

/* ---------- Info general (solo texto) ---------- */
const InfoInputSchema = z.object({ plantName: z.string() });
export type InfoInput = z.infer<typeof InfoInputSchema>;

const InfoOutputSchema = z.object({
  careInfo: z.object({
    light: z.string(),
    water: z.string(),
    temperature: z.string(),
  }),
  seasonalCare: z.object({
    fertilize: z.string(),
    prune: z.string(),
    repot: z.string(),
  }),
  generalInfo: z.object({
    maxHeight: z.string(),
    bloomSeason: z.string(),
    flowerColors: z.string(),
  }),
  funFact: z.string(),
});
export type InfoOutput = z.infer<typeof InfoOutputSchema>;

export const getPlantInfo = ai.defineFlow(
  { name: 'getPlantInfo', inputSchema: InfoInputSchema, outputSchema: InfoOutputSchema },
  async ({ plantName }) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-pro-latest', // ✅ modelo texto
      prompt: `Actúa como experto en botánica. Proporciona información de la planta "${plantName}". Responde SIEMPRE en español.`,
      output: { schema: InfoOutputSchema },
    });
    if (!output) {
      throw new Error("El modelo no generó una respuesta válida.");
    }
    return output;
  }
);

/* ---------- Identificar planta (con imagen) ---------- */
const IdentifyPlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una planta, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type IdentifyPlantInput = z.infer<typeof IdentifyPlantInputSchema>;

const IdentifyPlantOutputSchema = z.object({
  isPlant: z.boolean().describe('Confirma si la imagen contiene una planta.'),
  commonName: z.string().describe('El nombre común de la planta identificada.'),
  latinName: z.string().describe('El nombre científico/latino de la planta.'),
});
export type IdentifyPlantOutput = z.infer<typeof IdentifyPlantOutputSchema>;

export const identifyPlant = ai.defineFlow(
  {
    name: 'identifyPlantFlow',
    inputSchema: IdentifyPlantInputSchema,
    outputSchema: IdentifyPlantOutputSchema,
  },
  async ({ photoDataUri }) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-pro-vision',
      prompt: `Analiza la siguiente imagen de una planta. Tu única tarea es identificarla. Responde siempre en español.`,
      media: [{ contentType: photoDataUri.split(';')[0].split(':')[1], data: photoDataUri.split(',')[1] }],
      output: { schema: IdentifyPlantOutputSchema },
    });
    if (!output) {
        throw new Error("El modelo no pudo identificar la planta.");
    }
    return output;
  }
);


/* ---------- Recomendar Hortalizas (solo texto) ---------- */
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

export const recommendCrops = ai.defineFlow(
  {
    name: 'cropRecommenderFlow',
    inputSchema: CropRecommenderInputSchema,
    outputSchema: CropRecommenderOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-pro-latest',
        prompt: `Actúa como un experto en horticultura. Basado en la descripción del espacio de un usuario ("${input.userQuery}"), recomienda de 3 a 5 hortalizas o frutas. Sé claro y conciso. Responde siempre en español.`,
        output: { schema: CropRecommenderOutputSchema },
    });
    if (!output) {
      throw new Error("El modelo no pudo generar recomendaciones.");
    }
    return output;
  }
);
