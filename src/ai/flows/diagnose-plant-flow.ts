'use server';
/**
 * @fileOverview Flujo de Genkit para diagnosticar la salud de una planta y obtener información general.
 *
 * - diagnosePlant: Función para diagnosticar la salud de una planta.
 * - getPlantInfo: Función para obtener información general de una planta.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// ----------------- DIAGNOSE PLANT -----------------

const DiagnosePlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una planta, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  description: z.string().describe('Una breve descripción de la planta, incluyendo su nombre y cualquier nota relevante del usuario.'),
});
export type DiagnosePlantInput = z.infer<typeof DiagnosePlantInputSchema>;

const DiagnosePlantOutputSchema = z.object({
  identification: z.object({
    isPlant: z.boolean().describe('Confirma si la imagen contiene una planta o no.'),
    commonName: z.string().describe('El nombre común de la planta identificada.'),
    latinName: z.string().describe('El nombre científico/latino de la planta.'),
  }),
  diagnosis: z.object({
    isHealthy: z.boolean().describe('Un veredicto simple sobre si la planta parece estar sana o no.'),
    diagnosis: z.string().describe("Un análisis detallado de la salud de la planta. Describe cualquier signo de enfermedad, plaga, estrés o deficiencia de nutrientes que observes. Si la planta está sana, simplemente indícalo."),
    recommendation: z.string().describe('Pasos accionables y claros que el usuario puede tomar para mejorar la salud de la planta. Si la planta está sana, sugiere cuidados generales para mantenerla así.')
  }),
});
export type DiagnosePlantOutput = z.infer<typeof DiagnosePlantOutputSchema>;


export async function diagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}

const diagnosePlantFlow = ai.defineFlow(
  {
    name: 'diagnosePlantFlow',
    inputSchema: DiagnosePlantInputSchema,
    outputSchema: DiagnosePlantOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: `Actúa como un botánico experto. Analiza la imagen y la descripción de una planta para diagnosticar su salud.
Responde únicamente con un objeto JSON que siga estrictamente este esquema Zod: ${JSON.stringify(DiagnosePlantOutputSchema.shape)}.
- identification: isPlant (boolean), commonName, latinName.
- diagnosis: isHealthy (boolean), diagnosis (análisis detallado), recommendation (pasos a seguir).
Responde siempre en español. No incluyas \`\`\`json o cualquier otra cosa que no sea el objeto JSON.
Aquí está la información:
Descripción: ${input.description}
Foto: ${input.photoDataUri}`,
    });

    const textResponse = llmResponse.text();
    try {
        return JSON.parse(textResponse);
    } catch (e) {
        console.error("Failed to parse LLM response as JSON:", textResponse);
        throw new Error("El modelo generó un diagnóstico con formato incorrecto.");
    }
  }
);


// ----------------- GET PLANT INFO -----------------

const PlantInfoInputSchema = z.object({
  plantName: z.string().describe('El nombre de la planta sobre la que se busca información.'),
});
export type PlantInfoInput = z.infer<typeof PlantInfoInputSchema>;

const PlantInfoOutputSchema = z.object({
    careInfo: z.object({
        light: z.string().describe('Condiciones de luz ideales para la planta.'),
        water: z.string().describe('Necesidades de riego.'),
        temperature: z.string().describe('Rango de temperatura ideal.'),
    }),
    seasonalCare: z.object({
        fertilize: z.string().describe('La mejor estación o época del año para fertilizar la planta (ej. "Primavera y verano").'),
        prune: z.string().describe('La mejor estación o época del año para podar la planta (ej. "Finales de invierno").'),
        repot: z.string().describe('La mejor estación o época del año para transplantar la planta (ej. "Primavera").'),
    }),
    generalInfo: z.object({
        maxHeight: z.string().describe('Altura máxima que puede alcanzar la planta en condiciones ideales.'),
        bloomSeason: z.string().describe('La estación o época del año en que la planta suele florecer.'),
        flowerColors: z.string().describe('Una lista de los colores de flores que puede tener la planta.'),
    }),
    funFact: z.string().describe('Un dato curioso o interesante sobre la planta.'),
});
export type PlantInfoOutput = z.infer<typeof PlantInfoOutputSchema>;


export async function getPlantInfo(input: PlantInfoInput): Promise<PlantInfoOutput> {
    return getPlantInfoFlow(input);
}

const getPlantInfoFlow = ai.defineFlow(
    {
        name: 'getPlantInfoFlow',
        inputSchema: PlantInfoInputSchema,
        outputSchema: PlantInfoOutputSchema,
    },
    async (input) => {
        const llmResponse = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: `Actúa como un experto en botánica. Proporciona información sobre la planta llamada "${input.plantName}".
Responde únicamente con un objeto JSON que siga estrictamente este esquema Zod: ${JSON.stringify(PlantInfoOutputSchema.shape)}.
- careInfo: luz, agua, temperatura.
- seasonalCare: fertilizar, podar, transplantar (indica la estación).
- generalInfo: altura máxima, época de floración, colores de flores.
- funFact: un dato curioso.
Responde siempre en español. No incluyas \`\`\`json o cualquier otra cosa que no sea el objeto JSON.`,
        });

        const textResponse = llmResponse.text();
        try {
            return JSON.parse(textResponse);
        } catch (e) {
            console.error("Failed to parse LLM response as JSON:", textResponse);
            throw new Error("El modelo generó una respuesta con formato incorrecto.");
        }
    }
);
