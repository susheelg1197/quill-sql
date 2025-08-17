// src/lib/ai.ts
import OpenAI from "openai";
import { env } from "./env";

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY || undefined, // undefined → you can return a fallback
});