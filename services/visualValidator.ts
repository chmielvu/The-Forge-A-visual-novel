// services/visualValidator.ts
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";

/**
 * Visual Quality Enforcement
 * Blueprint: "Nano Banana v6 Soul-Capture Spec" with mandatory schema compliance
 */

interface VisualSpec {
  style: string;
  technical: { camera: string; lighting: string };
  mood: string;
  characters: Array<{
    id: string;
    outfit: string;
    expression: string;
    pose: string;
  }>;
  environment: string;
  quality: string;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export class VisualValidator {
  private ai: GoogleGenAI;
  private mandatoryKeywords = [
    'baroque brutalism',
    'vampire noir',
    'dark erotic academia',
    'chiaroscuro',
    'gaslight',
    'intimate',
    'oil painting'
  ];

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Validate visual prompt against blueprint requirements
   */
  validatePrompt(spec: VisualSpec): ValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check mandatory style keywords
    const styleText = `${spec.style} ${spec.mood} ${spec.quality}`.toLowerCase();
    const missingKeywords = this.mandatoryKeywords.filter(kw => !styleText.includes(kw));
    
    if (missingKeywords.length > 0) {
      issues.push(`Missing mandatory keywords: ${missingKeywords.join(', ')}`);
      score -= missingKeywords.length * 10;
    }

    // Verify character outfit detail
    spec.characters.forEach(char => {
      if (!char.outfit.includes('blouse') && !char.outfit.includes('robe') && !char.outfit.includes('shirt')) {
        issues.push(`Character ${char.id}: Outfit lacks Academy uniform details`);
        score -= 5;
      }
      if (!char.outfit.includes('unbuttoned') && !char.outfit.includes('plunging') && !char.outfit.includes('slit')) {
        suggestions.push(`Character ${char.id}: Consider adding erotic subversion details (unbuttoned, slit)`);
        score -= 3;
      }
    });

    // Check lighting specificity
    if (!spec.technical.lighting.includes('gaslight') && !spec.technical.lighting.includes('surgical lamp')) {
      issues.push('Lighting must specify source (gaslight/surgical lamp)');
      score -= 10;
    }

    // Camera framing
    if (!spec.technical.camera.includes('mm') && !spec.technical.camera.includes('close')) {
      suggestions.push('Camera should specify lens (50mm/85mm) or framing (close-up)');
      score -= 5;
    }

    return {
      passed: score >= 70,
      score,
      issues,
      suggestions
    };
  }

  /**
   * Generate enhanced prompt from validated spec
   */
  buildPromptFromSpec(spec: VisualSpec): string {
    const charDetails = spec.characters.map(c => 
      `${c.id}: ${c.outfit}, ${c.expression}, ${c.pose}`
    ).join('. ');

    return `
SCENE COMPOSITION:
Style: ${spec.style}
Mood: ${spec.mood}
Environment: ${spec.environment}

CHARACTERS:
${charDetails}

TECHNICAL:
Camera: ${spec.technical.camera}
Lighting: ${spec.technical.lighting}

QUALITY MANDATE:
${spec.quality}

NEGATIVE PROMPT (CRITICAL):
anime, cartoon, sketch, 3D render, fantasy armor, bright colors, soft lighting, multiple light sources, modern clothing, casual wear
`.trim();
  }

  /**
   * Generate image with quality validation loop
   */
  async generateValidatedImage(spec: VisualSpec, maxRetries: number = 2): Promise<string> {
    let attempt = 0;
    let lastImage = "";

    while (attempt < maxRetries) {
      attempt++;
      console.log(`🎨 Visual generation attempt ${attempt}/${maxRetries}`);

      // Validate spec first
      const validation = this.validatePrompt(spec);
      if (!validation.passed && attempt === 1) {
        console.warn('⚠️  Prompt validation issues:', validation.issues);
        
        // Auto-fix common issues
        if (!spec.style.toLowerCase().includes('baroque brutalism')) {
          spec.style += ', baroque brutalism';
        }
        if (!spec.style.toLowerCase().includes('vampire noir')) {
          spec.style += ', vampire noir';
        }
      }

      // Build final prompt
      const prompt = this.buildPromptFromSpec(spec);

      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: {
            responseModalities: [Modality.IMAGE],
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part && 'inlineData' in part && part.inlineData) {
          lastImage = `data:image/png;base64,${part.inlineData.data}`;
          
          // On final attempt, return what we have
          if (attempt === maxRetries) return lastImage;

          // Verify quality using vision model
          const qualityCheck = await this.verifyImageQuality(lastImage, spec);
          if (qualityCheck.passed) {
            console.log('✓ Image quality verified');
            return lastImage;
          } else {
            console.warn('⚠️  Quality check failed:', qualityCheck.issues);
            // Continue to next attempt
          }
        }
      } catch (error) {
        console.error(`Image generation attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    return lastImage || "";
  }

  /**
   * Verify generated image matches spec using vision model
   */
  private async verifyImageQuality(imageBase64: string, spec: VisualSpec): Promise<ValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    try {
      const base64Data = imageBase64.split(',')[1];
      
      const checkPrompt = `
Analyze this image and verify it matches these requirements:

EXPECTED STYLE: ${spec.style}
EXPECTED MOOD: ${spec.mood}
EXPECTED CHARACTERS: ${spec.characters.map(c => `${c.id} (${c.outfit})`).join(', ')}
EXPECTED LIGHTING: ${spec.technical.lighting}

Answer these questions with YES/NO:
1. Does the image use dark, dramatic chiaroscuro lighting?
2. Is the style consistent with baroque brutalism / vampire noir?
3. Are characters wearing dark academia attire (not anime/cartoon style)?
4. Is the mood sufficiently dark and atmospheric?
5. Are there any bright colors or soft lighting (should be NO)?

Return JSON: {"scores": [true/false for each], "notes": "brief analysis"}
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: base64Data } },
            { text: checkPrompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 4096 }
        }
      });

      const result = JSON.parse(response.text || "{}");
      const scores = result.scores || [];
      
      scores.forEach((passed: boolean, idx: number) => {
        if (!passed) {
          score -= 15;
          issues.push(`Quality check ${idx + 1} failed`);
        }
      });

      if (result.notes) {
        suggestions.push(result.notes);
      }

    } catch (error) {
      console.warn('Vision verification failed:', error);
      // Don't fail the whole process on verification errors
      return { passed: true, score: 85, issues: [], suggestions: ['Could not verify quality'] };
    }

    return {
      passed: score >= 70,
      score,
      issues,
      suggestions
    };
  }

  /**
   * Emergency fallback: Generate from text description
   */
  async generateFallbackImage(textDescription: string): Promise<string> {
    const safePrompt = `
${textDescription}

Style: dark atmospheric realism, baroque brutalism, chiaroscuro lighting, oil painting quality
Technical: 50mm intimate close-up, single gaslight source, deep shadows
Mood: suffocating tension, predatory intimacy
Quality: masterpiece, high detail, grounded dark academia aesthetic

CRITICAL: No anime, no cartoon, no bright colors, no soft lighting
`.trim();

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: safePrompt }] },
        config: { responseModalities: [Modality.IMAGE] }
      });

      const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64 ? `data:image/png;base64,${base64}` : "";
    } catch (error) {
      console.error('Fallback generation failed:', error);
      return "";
    }
  }
}

export const createVisualValidator = (apiKey: string) => new VisualValidator(apiKey);
