import { GoogleGenAI, Modality } from "@google/genai";

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
      model: 'gemini-2.5-flash-image',
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
      model: 'gemini-2.5-flash-image',
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
    await window.aistudio.hasSelectedApiKey(); // Required for Veo
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt + ", subtle cinematic movement, slow pan, atmospheric lighting, 4k, keeping the oil painting style",
            image: { imageBytes: imageBase64.split(',')[1], mimeType: 'image/png' },
            config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const videoRes = await fetch(`${videoUri}&key=${apiKey}`);
            const blob = await videoRes.blob();
            return URL.createObjectURL(blob);
        }
        return "";
    } catch (e) { 
        console.error("Video Gen Error:", e); 
        if (e.message.includes("Requested entity was not found.")) {
          // This indicates an API key issue, prompt user to re-select
          await window.aistudio.openSelectKey();
        }
        return ""; 
    }
};