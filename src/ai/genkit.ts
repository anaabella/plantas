/**
 * @fileOverview Centralized Genkit initialization.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit and the Google AI plugin.
// This is the single source of truth for the `ai` instance.
export const ai = genkit({
  plugins: [googleAI()],
});