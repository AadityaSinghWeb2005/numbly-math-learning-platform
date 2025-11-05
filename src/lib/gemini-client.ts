import { GoogleGenAI } from "@google/genai";

if (!process.env.GOOGLE_GENAI_API_KEY) {
  throw new Error('GOOGLE_GENAI_API_KEY is not set in environment variables');
}

const client = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_GENAI_API_KEY 
});

export default client;