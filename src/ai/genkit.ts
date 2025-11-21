'use server';
// src/ai/genkit.ts -- HARDCODE TEMPORAL
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// -----------------------------------------------------------------------------
// TEMPORARY FIX: Hard-coded API Key
// As per the debugging steps, we are hard-coding the API key to rule out
// environment variable issues.
//
// ACTION REQUIRED:
// 1. Go to https://aistudio.google.com/app/apikey and create a new, valid API key.
// 2. Paste your new key directly below, replacing the placeholder.
// -----------------------------------------------------------------------------
const apiKey = "AIzaSy_REPLACE_WITH_YOUR_VALID_API_KEY";

if (!apiKey || apiKey === "AIzaSy_REPLACE_WITH_YOUR_VALID_API_KEY") {
  throw new Error("CRITICAL ERROR: GOOGLE_GENAI_API_KEY is missing or is still the placeholder. Please add your valid API key to src/ai/genkit.ts");
}


export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
