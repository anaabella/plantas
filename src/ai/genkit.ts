'use server';

import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const googleGenai = googleAI({
  //You may need to provide a GOOGLE_API_KEY env var
});

export const ai = genkit({
  plugins: [googleGenai],
});
