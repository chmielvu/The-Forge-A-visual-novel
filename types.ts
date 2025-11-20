
import type { DirectorAI } from './services/directorService';
import type { NetworkXGraphService } from './services/graphService';
import type { VisualValidator } from './services/visualValidator';
import type { EnhancedTTSService } from './services/enhancedTTS';


export enum Role {
  PROVOST = 'Provost',
  LOGICIAN = 'Logician',
  INQUISITOR = 'Inquisitor',
  CONFESSOR = 'Confessor',
  NURSE = 'Nurse',
  PREFECT = 'Prefect',
  SUBJECT = 'Subject'
}

export enum CurriculumPhase {
  ALPHA = 'Alpha (Stripping)',
  BETA = 'Beta (Re-Conditioning)',
  GAMMA = 'Gamma (Anchoring)'
}

export interface Character {
  id: string;
  name: string;
  role: Role;
  archetype: string;
  voiceId: string; // Mapped to Gemini TTS voices
  traits: string[];
  dominance: number; // 0-100
  visualPromptInfo: string;
}

export interface YandereLedger {
  physicalIntegrity: number; // 0-100
  traumaLevel: number; // 0-100
  shamePainAbyssLevel: number; // 0-100
  hopeLevel: number; // 0-100
  complianceScore: number; // 0-100
  phase: CurriculumPhase;
  turnCount: number;
}

export interface GraphNode {
  id: string;
  label: string;
  group: 'character' | 'concept' | 'event' | 'item';
  value?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface AudioState {
  bgm: 'theme' | 'tension' | 'ritual' | 'silence' | 'heartbeat';
  sfx?: 'scream' | 'impact' | 'whisper' | 'bells' | 'wet_sound';
  narratorMood?: 'mocking' | 'seductive' | 'clinical' | 'sympathetic';
}

export interface NarrativeState {
  sceneId?: string; // Unique ID to track if the scene is new or a continuation
  text: string;
  speaker?: string;
  speakerId?: string; // ID of the character speaking
  backgroundPrompt?: string; // Deprecated but kept for compatibility
  visualPromptJSON?: any; // Structured JSON for image generation
  backgroundImageUrl?: string; // Generated or cached
  characterSpritePrompt?: string;
  characterSpriteUrl?: string; // Generated or cached
  videoUrl?: string; // Veo generated video
  choices: {
    id: string;
    text: string;
    impactPrediction?: string; // "Deep Think" preview
  }[];
  ledgerUpdates?: Partial<YandereLedger>;
  graphUpdates?: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  audio?: AudioState;
  directorNotes?: {
    hiddenPlots: string[];
    futureHooks: string[];
  }
}

export interface AppState {
  ledger: YandereLedger;
  characters: Record<string, Character>;
  history: NarrativeState[];
  currentScene: NarrativeState;
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  isThinking: boolean;
  isGeneratingVisuals: boolean;
  isGeneratingVideo: boolean;
  apiKey: string | null;
  sceneBaseImage?: string; // Cache for image editing

  // NEW: Enhanced services
  directorAI?: DirectorAI;
  graphService?: NetworkXGraphService;
  visualValidator?: VisualValidator;
  ttsService?: EnhancedTTSService;
  
  // NEW: Director insights
  directorInsights?: {
    hiddenPlots?: string[];
    futureHooks?: string[];
    tropeEntropy?: number;
  };
}