
'use server';
/**
 * @fileOverview Flujo de Genkit para diagnosticar la salud de una planta y obtener información general.
 *
 * - diagnosePlant: Función para diagnosticar la salud de una planta.
 * - getPlantInfo: Función para obtener información general de una planta.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Esquema de entrada para el flujo de diagnóstico.
const DiagnosePlantInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Una foto de una planta, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('Una breve descripción de la planta, incluyendo su nombre y cualquier nota relevante del usuario.'),
});
export type DiagnosePlantInput = z.infer<typeof DiagnosePlantInputSchema>;

// Esquema de salida para el flujo de diagnóstico.
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

/**
 * Función exportada que el cliente llamará para diagnosticar.
 * Invoca el flujo de Genkit y devuelve su resultado.
 */
export async function diagnosePlant(input: DiagnosePlantInput): Promise<DiagnosePlantOutput> {
  return diagnosePlantFlow(input);
}


// ----------- Flujo para Información General de la Planta -----------

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

const getPlantInfoPrompt = ai.definePrompt({
    name: 'getPlantInfoPrompt',
    input: { schema: PlantInfoInputSchema },
    output: { schema: PlantInfoOutputSchema },
    prompt: `Actúa como un experto en botánica. Proporciona información concisa y útil sobre la planta llamada "{{plantName}}".
- Resume los cuidados básicos en términos de luz, agua y temperatura.
- Indica la mejor estación del año para fertilizar, podar y transplantar. Sé breve y directo (ej. "Primavera", "Verano y otoño").
- Proporciona detalles generales: altura máxima, época de floración y colores de las flores.
- Añade un dato curioso sobre la planta.
Responde siempre en español.`,
});


const getPlantInfoFlow = ai.defineFlow(
    {
        name: 'getPlantInfoFlow',
        inputSchema: PlantInfoInputSchema,
        outputSchema: PlantInfoOutputSchema,
    },
    async (input) => {
        const { output } = await getPlantInfoPrompt(input);
        if (!output) {
            throw new Error("El modelo no pudo generar la información de la planta.");
        }
        return output;
    }
);

const diagnosePlantPrompt = ai.definePrompt({
    name: 'diagnosePlantPrompt',
    input: { schema: DiagnosePlantInputSchema },
    output: { schema: DiagnosePlantOutputSchema },
    prompt: `Actúa como un botánico experto y amigable. Tu tarea es analizar la imagen y la descripción de una planta proporcionada por un usuario para diagnosticar su estado de salud.

Primero, identifica la planta en la foto. Si no es una planta, indícalo claramente.

Luego, evalúa su salud. Busca signos de enfermedades, plagas, estrés hídrico, quemaduras de sol, o deficiencias nutricionales. Basado en tu análisis, determina si la planta está 'sana' o 'necesita atención'.

Finalmente, proporciona un diagnóstico claro y una recomendación práctica. El diagnóstico debe explicar lo que observas, y la recomendación debe ser una guía paso a paso que el usuario pueda seguir para cuidar mejor de su planta. Responde siempre en español.

Aquí está la información proporcionada por el usuario:
Descripción: {{description}}
Foto: {{media url=photoDataUri}}`,
});

// Definición del flujo de Genkit para diagnóstico.
const diagnosePlantFlow = ai.defineFlow(
  {
    name: 'diagnosePlantFlow',
    inputSchema: DiagnosePlantInputSchema,
    outputSchema: DiagnosePlantOutputSchema,
  },
  async input => {
    const { output } = await diagnosePlantPrompt(input);
    if (!output) {
      throw new Error("El modelo no pudo generar un diagnóstico.");
    }
    return output;
  }
);
