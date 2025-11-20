// services/enhancedTTS.ts
import { GoogleGenAI, Modality } from "@google/genai";
import { ABYSS_NARRATOR_INSTRUCTION, CHARACTER_TTS_INSTRUCTIONS } from '../lore';

interface SpeechParams {
  text: string;
  speakerId?: string;
  mood: string;
  traumaLevel: number;
  intensity: number;
}

interface SpeechResult {
  audioBase64: string;
  ssml: string;
}

export class EnhancedTTSService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async generateSSML(params: SpeechParams): Promise<string> {
    const { text, speakerId, mood } = params;
    let systemInstruction = ABYSS_NARRATOR_INSTRUCTION;
    let promptContext = `Target Mood: ${mood.toUpperCase()}`;

    if (speakerId && CHARACTER_TTS_INSTRUCTIONS[speakerId]) {
      systemInstruction = CHARACTER_TTS_INSTRUCTIONS[speakerId];
      promptContext = `Target Persona: ${speakerId.toUpperCase()}`;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Task: Convert Narrative Text to SSML.
        ${promptContext}
        Input Text: "${text}"
        Instructions: Wrap in <speak> tags. Use <prosody> and <break> creatively to enforce the persona.`,
        config: { systemInstruction }
      });

      let cleanText = response.text || text;
      cleanText = cleanText.replace(/```xml/g, '').replace(/```/g, '').trim();
      if (!cleanText.startsWith('<speak>')) cleanText = `<speak>${cleanText}</speak>`;
      return cleanText;
    } catch (e) {
      console.warn("SSML Gen failed, using raw text", e);
      return `<speak>${text}</speak>`;
    }
  }

  async generateSpeech(params: SpeechParams): Promise<SpeechResult> {
    const ssml = await this.generateSSML(params);
    const voiceId = params.speakerId ? (params.speakerId === 'subject' ? 'Puck' : 'Kore') : 'Puck';

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-pro-preview", // TTS must use 3.0 Pro
        contents: { parts: [{ text: ssml }] }, // Send the generated SSML
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } }
        }
      });
      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
      return { audioBase64, ssml };
    } catch (e) {
      console.error("Enhanced TTS speech generation failed:", e);
      throw e;
    }
  }
}

export const createTTSService = (apiKey: string) => new EnhancedTTSService(apiKey);
