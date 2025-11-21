// Fallback configuration if environment variables are not set
const localFirebaseConfig = {
  "projectId": "studio-1075650699-14e1a",
  "appId": "1:928947562812:web:141d114153ab317dc41639",
  "apiKey": "AIzaSyBwud_Ud3szkLOswF3orf3JkC43abSO5Y4",
  "authDomain": "studio-1075650699-14e1a.firebaseapp.com",
  "storageBucket": "studio-1075650699-14e1a.appspot.com",
  "messagingSenderId": "928947562812",
  "measurementId": "G-5G3W3V2T1L"
};

// In a production environment (like Netlify), we use environment variables.
// In development, we fall back to the local config.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || localFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || localFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || localFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || localFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || localFirebaseConfig.measurementId,
};
