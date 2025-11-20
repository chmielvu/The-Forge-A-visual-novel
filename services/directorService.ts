// services/directorService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, NarrativeState } from '../types';
import { LORE_SYSTEM_PROMPT } from '../lore';

/**
 * DIRECTOR AI: Implements the "Loom of Thought" multi-agent chain
 * This is the missing cognitive architecture from the blueprint
 */

interface DirectorPlan {
  analysis: string;
  critique: string;
  actionPlan: string[];
  narrativeGoals: {
    tensionTarget: number;
    noveltyBoost: boolean;
    characterFocus: string[];
  };
}

interface AgentThought {
  characterId: string;
  privateGoal: string;
  proposedAction: string;
  hiddenKnowledge: string[];
  emotionalState: { contempt: number; arousal: number; tenderness: number };
}

export class DirectorAI {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Phase 1: ANALYZE - Deep Think planning before generating content
   */
  async analyzeContext(state: AppState, userAction: string): Promise<DirectorPlan> {
    const prompt = `
[ANALYST AGENT]
You are the strategic planner for The Forge's Loom narrative engine.

CURRENT STATE:
- Ledger: ${JSON.stringify(state.ledger)}
- Graph Nodes: ${state.graph.nodes.length}
- Recent History: ${state.history.slice(-3).map(h => h.text.slice(0, 100)).join(' → ')}
- User Action: "${userAction}"

TASKS:
1. ANALYZE: What are the narrative tensions at play? What is the player's emotional state?
2. CRITIQUE: Is the story becoming stagnant? Check trope entropy (are we repeating patterns?)
3. PLAN: What should happen next to maximize psychological impact AND narrative novelty?
4. CHARACTER FOCUS: Which characters should be involved? Why?

Output your strategic plan.
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: LORE_SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 16384 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            critique: { type: Type.STRING },
            actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            narrativeGoals: {
              type: Type.OBJECT,
              properties: {
                tensionTarget: { type: Type.NUMBER },
                noveltyBoost: { type: Type.BOOLEAN },
                characterFocus: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  }

  /**
   * Phase 2: AGENT THINK - Let characters think privately (Blueprint requirement)
   */
  async runAgentThinking(
    state: AppState, 
    plan: DirectorPlan
  ): Promise<AgentThought[]> {
    const agentPromises = plan.narrativeGoals.characterFocus.map(async (charId) => {
      const character = state.characters[charId];
      if (!character) return null;

      const connections = state.graph.links
        .filter(l => l.source === charId || l.target === charId)
        .map(l => `${l.source} → ${l.target}: ${l.label} (${l.strength})`)
        .join('\n');

      const prompt = `
[AGENT THINK - PRIVATE REASONING]
You are ${character.name}, operating in your private cognitive space.
Nobody can see this reasoning - not the player, not the Director.

YOUR IDENTITY:
- Role: ${character.role}
- Archetype: ${character.archetype}
- Traits: ${character.traits.join(', ')}
- Dominance: ${character.dominance}

YOUR KNOWLEDGE (Private Graph):
${connections}

CURRENT SCENE CONTEXT:
${state.currentScene.text}

QUESTION: Given your goals and personality, what do you REALLY want to do next?
What are you hiding? What's your secret agenda?

Think step by step:
1. What do I feel about the Subject right now?
2. What do I want from them?
3. What action serves my goals while maintaining my public persona?
4. What am I NOT saying out loud?
`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: `You are an autonomous agent. Think selfishly. You can lie, manipulate, and plot.`,
          thinkingConfig: { thinkingBudget: 8192 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              characterId: { type: Type.STRING },
              privateGoal: { type: Type.STRING },
              proposedAction: { type: Type.STRING },
              hiddenKnowledge: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotionalState: {
                type: Type.OBJECT,
                properties: {
                  contempt: { type: Type.NUMBER },
                  arousal: { type: Type.NUMBER },
                  tenderness: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      });

      return JSON.parse(response.text || "{}");
    });

    const results = await Promise.all(agentPromises);
    return results.filter(Boolean) as AgentThought[];
  }

  /**
   * Phase 3: SYNTHESIZE - Director combines agent thoughts into coherent scene
   */
  async synthesizeScene(
    state: AppState,
    plan: DirectorPlan,
    agentThoughts: AgentThought[],
    userAction: string
  ): Promise<NarrativeState> {
    const agentSummary = agentThoughts.map(a => 
      `[${a.characterId}] Secret Goal: "${a.privateGoal}" | Proposed: "${a.proposedAction}"`
    ).join('\n');

    const prompt = `
[DIRECTOR - FINAL SYNTHESIS]

STRATEGIC PLAN:
${JSON.stringify(plan, null, 2)}

AGENT PRIVATE THOUGHTS (Hidden from player):
${agentSummary}

CURRENT STATE:
Ledger: ${JSON.stringify(state.ledger)}

USER ACTION: "${userAction}"

YOUR TASK:
Weave the agent thoughts into a cohesive narrative beat.
- Choose which character speaks/acts
- Determine if their public action matches their private goal (or if they're hiding something)
- Generate the visualPromptJSON that captures the EXACT scene described
- Update ledger based on narrative impact
- Add graph edges for new relationships/tensions

CRITICAL: The visual prompt MUST be a cinematic snapshot of THIS EXACT MOMENT.
If Selene leans over the desk, the image shows Selene leaning over the desk.
If there's blood, the image shows blood.
Synchronize text and image perfectly.
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: LORE_SYSTEM_PROMPT + `\n\nYou are the omniscient Director. Balance character agency with narrative coherence.`,
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneId: { type: Type.STRING },
            text: { type: Type.STRING },
            speaker: { type: Type.STRING },
            speakerId: { type: Type.STRING },
            visualPromptJSON: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                technical: {
                  type: Type.OBJECT,
                  properties: {
                    camera: { type: Type.STRING },
                    lighting: { type: Type.STRING }
                  }
                },
                mood: { type: Type.STRING },
                characters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      outfit: { type: Type.STRING },
                      expression: { type: Type.STRING },
                      pose: { type: Type.STRING }
                    }
                  }
                },
                environment: { type: Type.STRING },
                quality: { type: Type.STRING }
              }
            },
            choices: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  impactPrediction: { type: Type.STRING }
                }
              }
            },
            ledgerUpdates: {
              type: Type.OBJECT,
              properties: {
                physicalIntegrity: { type: Type.NUMBER },
                traumaLevel: { type: Type.NUMBER },
                shamePainAbyssLevel: { type: Type.NUMBER },
                hopeLevel: { type: Type.NUMBER },
                complianceScore: { type: Type.NUMBER }
              }
            },
            graphUpdates: {
              type: Type.OBJECT,
              properties: {
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      group: { type: Type.STRING }
                    }
                  }
                },
                links: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.STRING },
                      target: { type: Type.STRING },
                      label: { type: Type.STRING },
                      strength: { type: Type.NUMBER }
                    }
                  }
                }
              }
            },
            audio: {
              type: Type.OBJECT,
              properties: {
                bgm: {
                  type: Type.STRING,
                  enum: ['theme', 'tension', 'ritual', 'silence', 'heartbeat']
                },
                sfx: {
                  type: Type.STRING,
                  enum: ['scream', 'impact', 'whisper', 'bells', 'wet_sound']
                },
                narratorMood: {
                  type: Type.STRING,
                  enum: ['mocking', 'seductive', 'clinical', 'sympathetic']
                }
              }
            },
            directorNotes: {
              type: Type.OBJECT,
              properties: {
                hiddenPlots: { type: Type.ARRAY, items: { type: Type.STRING } },
                futureHooks: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  }

  /**
   * MASTER ORCHESTRATION: Run the full Director AI pipeline
   */
  async orchestrate(state: AppState, userAction: string, setThinkingStage: (stage: string) => void): Promise<NarrativeState> {
    console.log("🎬 Director AI: Starting orchestration...");

    setThinkingStage("Analyzing context...");
    const plan = await this.analyzeContext(state, userAction);
    console.log("✓ Analysis complete:", plan.narrativeGoals);

    setThinkingStage("Running character cognition...");
    const agentThoughts = await this.runAgentThinking(state, plan);
    console.log(`✓ ${agentThoughts.length} agents thought privately`);

    setThinkingStage("Synthesizing scene...");
    const scene = await this.synthesizeScene(state, plan, agentThoughts, userAction);
    console.log("✓ Scene generated:", scene.sceneId);
    
    setThinkingStage("");
    return scene;
  }
}

// Export factory function
export const createDirectorAI = (apiKey: string) => new DirectorAI(apiKey);
