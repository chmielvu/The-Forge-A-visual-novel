import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AppState, NarrativeState } from '../types';
import { LORE_SYSTEM_PROMPT, ABYSS_NARRATOR_INSTRUCTION, CHARACTER_TTS_INSTRUCTIONS, VISUAL_JSON_MANDATE } from '../lore';

export const generateScene = async (
  apiKey: string,
  state: AppState,
  userAction: string
): Promise<NarrativeState> => {
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });

  const historyText = state.history.slice(-5).map(h => 
    `[Speaker: ${h.speaker || 'Narrator'}] ${h.text}`
  ).join('\n');

  const ledgerText = JSON.stringify(state.ledger);
  const characterSummary = Object.values(state.characters).map(c => `
  - ${c.name} (${c.role}):
    ID: ${c.id}
    Base Visual Profile: ${c.visualPromptInfo}
  `).join('');
  
  const previousMood = state.currentScene.audio?.narratorMood || 'clinical';
  const previousSceneId = state.currentScene.sceneId || 'start';

  const prompt = `
    CURRENT STATE:
    Ledger: ${ledgerText}
    Recent History: ${historyText}
    
    CHARACTERS (VISUAL PROFILES - OBEY THESE): ${characterSummary}
    
    PREVIOUS NARRATOR MOOD: ${previousMood}
    PREVIOUS SCENE ID: ${previousSceneId}
    
    (IMPORTANT: Maintain mood unless narrative triggers shift. Determine if this is a NEW scene (change location/major event) or a CONTINUATION (dialogue/reaction). If new, generate new sceneId. If continuation, keep same sceneId.)

    USER ACTION: ${userAction}

    Generate the next narrative beat.
    - Choose a speaker from: ${Object.keys(state.characters).join(', ')} or "Narrator".
    - **VISUAL MANDATE**: You MUST populate the 'visualPromptJSON' field according to the following schema for EVERY scene. This defines the image generation.
    ${VISUAL_JSON_MANDATE}
    - Output strictly valid JSON conforming to the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: LORE_SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneId: { type: Type.STRING, description: "Unique ID for the visual scene. Change ONLY if location/context changes completely." },
            text: { type: Type.STRING },
            speaker: { type: Type.STRING },
            speakerId: { type: Type.STRING, description: "id of character from lore, e.g. 'selene'" },
            backgroundPrompt: { type: Type.STRING, description: "Deprecated. Use visualPromptJSON." },
            visualPromptJSON: { 
              type: Type.OBJECT,
              description: "Mandatory JSON defining the visual scene.",
              properties: {
                style: { type: Type.STRING },
                technical: { type: Type.OBJECT, properties: { camera: { type: Type.STRING }, lighting: { type: Type.STRING } } },
                mood: { type: Type.STRING },
                characters: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, outfit: { type: Type.STRING }, expression: { type: Type.STRING }, pose: { type: Type.STRING } } } },
                environment: { type: Type.STRING },
                quality: { type: Type.STRING }
              }
            },
            characterSpritePrompt: { type: Type.STRING, description: "Deprecated." },
            choices: {
              type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                id: { type: Type.STRING }, text: { type: Type.STRING }, impactPrediction: { type: Type.STRING }
              }}
            },
            ledgerUpdates: {
               type: Type.OBJECT, properties: {
                 physicalIntegrity: { type: Type.NUMBER }, traumaLevel: { type: Type.NUMBER }, shamePainAbyssLevel: { type: Type.NUMBER },
                 hopeLevel: { type: Type.NUMBER }, complianceScore: { type: Type.NUMBER }
               }
            },
            graphUpdates: {
              type: Type.OBJECT, properties: {
                nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                  id: {type: Type.STRING}, label: {type: Type.STRING}, group: {type: Type.STRING}
                }}},
                links: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                  source: {type: Type.STRING}, target: {type: Type.STRING}, label: {type: Type.STRING}, strength: {type: Type.NUMBER}
                }}}
              }
            },
            audio: {
                type: Type.OBJECT, properties: {
                    bgm: { type: Type.STRING, enum: ['theme', 'tension', 'ritual', 'silence', 'heartbeat'] },
                    sfx: { type: Type.STRING, enum: ['scream', 'impact', 'whisper', 'bells', 'wet_sound'] },
                    narratorMood: { type: Type.STRING, enum: ['mocking', 'seductive', 'clinical', 'sympathetic'] }
                }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json as NarrativeState;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateSSML = async (apiKey: string, text: string, mood: string = 'clinical', speakerId?: string): Promise<string> => {
    if (!apiKey) return text;
    const ai = new GoogleGenAI({ apiKey });
    
    let systemInstruction = ABYSS_NARRATOR_INSTRUCTION;
    let promptContext = `Target Mood: ${mood.toUpperCase()}`;

    if (speakerId && CHARACTER_TTS_INSTRUCTIONS[speakerId]) {
        systemInstruction = CHARACTER_TTS_INSTRUCTIONS[speakerId];
        promptContext = `Target Persona: ${speakerId.toUpperCase()}`;
    }
    
    try {
        const response = await ai.models.generateContent({
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
};

export const generateSpeech = async (apiKey: string, text: string, voiceId: string): Promise<string> => {
  if (!apiKey) return "";
  const ai = new GoogleGenAI({ apiKey });

  try {
    const voiceName = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceId) ? voiceId : 'Puck';
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (e) { console.error("TTS Error", e); return ""; }
};

export const generateVisual = async (apiKey: string, prompt: string, visualJSON?: any): Promise<string> => {
  if (!apiKey) return "";
  const ai = new GoogleGenAI({ apiKey });
  
  let finalPrompt = prompt;
  
  if (visualJSON) {
    // Reconstruct the prompt from the JSON mandate to ensure the model gets the exact keywords
    const charStr = visualJSON.characters.map((c: any) => `${c.id} wearing ${c.outfit}, ${c.expression}, ${c.pose}`).join(". ");
    finalPrompt = `
    Style: ${visualJSON.style}.
    Mood: ${visualJSON.mood}.
    Environment: ${visualJSON.environment}.
    Characters: ${charStr}.
    Technical: Camera ${visualJSON.technical?.camera}, Lighting ${visualJSON.technical?.lighting}.
    Quality: ${visualJSON.quality}.
    `;
  } else {
     const MANDATORY_STYLE = `Style: grounded dark erotic academia, baroque brutalism, vampire noir, intimate psychological horror, Rembrandt/Caravaggio lighting. Technical: intimate 50mm/85mm close-up, single gaslight source, extreme chiaroscuro. Mood: predatory intimacy, clinical amusement, suffocating dread. Quality: masterpiece oil painting, high detail on skin texture and fabric strain. NO: anime, cartoon, sketch, fantasy.`;
     finalPrompt = `${prompt}. ${MANDATORY_STYLE}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Reverted to flash-image as requested
      contents: { parts: [{ text: finalPrompt }] },
      config: { responseModalities: [Modality.IMAGE] }
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && 'inlineData' in part && part.inlineData) {
        const base64 = part.inlineData.data;
        return `data:image/png;base64,${base64}`;
    }
    return "";
  } catch (e) { console.error("Image Gen Error:", e); return ""; }
};

export const urlToBase64 = async (url: string): Promise<{base64: string, mimeType: string}> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ base64: (reader.result as string).split(',')[1], mimeType: blob.type });
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { console.error("URL to Base64 Error", e); return {base64: "", mimeType: ""}; }
};

export const editVisual = async (apiKey: string, baseImageBase64: string, mimeType: string, changePrompt: string): Promise<string> => {
  if (!apiKey || !baseImageBase64) return "";
  const ai = new GoogleGenAI({ apiKey });

  // Surgical inpainting rule
  const fullPrompt = `Inpaint ONLY "${changePrompt}". Keep everything else 100% identical pixel-perfect.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using flash-image for editing
      contents: { parts: [
          { inlineData: { mimeType, data: baseImageBase64 } },
          { text: fullPrompt }
      ]},
      config: { responseModalities: [Modality.IMAGE] }
    });
    
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64 ? `data:image/png;base64,${base64}` : "";
  } catch (e) { console.error("Edit Visual Error:", e); return ""; }
};

export const outpaintVisual = async (apiKey: string, baseImageBase64: string, mimeType: string): Promise<string> => {
  if (!apiKey || !baseImageBase64) return "";
  const ai = new GoogleGenAI({ apiKey });

  const fullPrompt = `Outpaint this image, expanding the view outwards on all sides. Maintain the exact style: grounded dark erotic academia, baroque brutalism, vampire noir. The new areas must be a logical, seamless continuation of the existing scene. Preserve all original details perfectly.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using flash-image for outpainting
      contents: { parts: [
          { inlineData: { mimeType, data: baseImageBase64 } },
          { text: fullPrompt }
      ]},
      config: { responseModalities: [Modality.IMAGE] }
    });
    
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64 ? `data:image/png;base64,${base64}` : "";
  } catch (e) { console.error("Outpaint Visual Error:", e); return ""; }
};

export const generateVideo = async (apiKey: string, imageBase64: string, prompt: string): Promise<string> => {
    if (!apiKey) return "";
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const operation = await ai.models.generateVideos({
            model: 'gemini-3-pro-preview', // Video must use 3.0 Pro or Veo
            prompt: prompt + ", subtle cinematic movement, slow pan, atmospheric lighting, 4k, keeping the oil painting style",
            image: { imageBytes: imageBase64.split(',')[1], mimeType: 'image/png' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        // No polling as per directive
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const videoRes = await fetch(`${videoUri}&key=${apiKey}`);
            const blob = await videoRes.blob();
            return URL.createObjectURL(blob);
        }
        return "";
    } catch (e) { console.error("Video Gen Error:", e); return ""; }
};
