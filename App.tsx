
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_CHARACTERS } from './lore';
import { AppState, CurriculumPhase, NarrativeState } from './types';
import { createDirectorAI, createGraphService, createVisualValidator, createTTSService } from './services';
import { urlToBase64, editVisual } from './services/geminiService'; // Keep some helpers
import { YandereLedgerUI } from './components/YandereLedger';
import { NetworkGraph } from './components/NetworkGraph';
import { AudioManager } from './components/AudioManager';
import { DirectorInsights } from './components/DirectorInsights';
import { triggerUnlock, isAudioUnlocked, startAmbientAfterUnlock } from './components/SafeAudio';
import { Fingerprint, Loader2, Video, Volume2, Expand } from 'lucide-react';

const INITIAL_STATE: AppState = {
  apiKey: null,
  ledger: {
    physicalIntegrity: 100,
    traumaLevel: 0,
    shamePainAbyssLevel: 0,
    hopeLevel: 100,
    complianceScore: 0,
    phase: CurriculumPhase.ALPHA,
    turnCount: 0
  },
  characters: INITIAL_CHARACTERS,
  history: [],
  currentScene: {
    sceneId: "start",
    text: "The ferry engine cuts. Silence. The air smells of salt and wet concrete. You stand before the massive iron gates of The Forge. Magistra Selene watches from the ramparts, a silhouette in crimson velvet against the storm.",
    speaker: "Narrator",
    visualPromptJSON: {
        "style": "grounded dark erotic academia + baroque brutalism + vampire noir + intimate psychological horror + rembrandt caravaggio lighting",
        "technical": {"camera": "intimate 50mm or 85mm close-up", "lighting": "single gaslight, extreme chiaroscuro, shadows in cleavage and slits"},
        "mood": "predatory intimacy, clinical amusement, suffocating dread, weaponized sexuality",
        "characters": [{"id": "selene", "outfit": "Crimson velvet robe plunging to navel", "expression": "cold amused contempt", "pose": "standing on brutalist concrete ramparts"}],
        "environment": "storm clouds, wind blowing",
        "quality": "restrained masterpiece oil painting"
    },
    choices: [
      { id: '1', text: "Look down and wait.", impactPrediction: "Compliance +5" },
      { id: '2', text: "Stare back at her.", impactPrediction: "Defiance -> Trauma Risk" }
    ],
    audio: { bgm: 'tension', narratorMood: 'clinical' }
  },
  graph: {
    nodes: [
      { id: 'selene', label: 'Magistra Selene', group: 'character' }, { id: 'subject', label: 'Subject (You)', group: 'character' },
      { id: 'forge', label: 'The Forge', group: 'concept' }
    ],
    links: [
      { source: 'selene', target: 'forge', label: 'rules', strength: 1 }, { source: 'subject', target: 'forge', label: 'trapped_in', strength: 1 }
    ]
  },
  isThinking: false,
  isGeneratingVisuals: false,
  isGeneratingVideo: false,
  sceneBaseImage: undefined,
};

function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [bgImage, setBgImage] = useState<string>("/placeholder.webp");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [audioActive, setAudioActive] = useState(false); 
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(false);
  const [thinkingStage, setThinkingStage] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize Services
  useEffect(() => {
    if (state.apiKey && !state.directorAI) {
      const directorAI = createDirectorAI(state.apiKey!);
      const graphService = createGraphService(state.apiKey!);
      const visualValidator = createVisualValidator(state.apiKey!);
      const ttsService = createTTSService(state.apiKey!);
      
      setState(prev => ({ ...prev, directorAI, graphService, visualValidator, ttsService }));
      
      const savedGraph = localStorage.getItem('forge_graph');
      graphService.initializeGraph(state).then(() => {
          if(savedGraph && graphService) {
              // Re-initialize graph with saved data - simplistic for now
              console.log("Graph state loaded from previous session.");
          }
      });
    }
  }, [state.apiKey]);

  // Main visual effect hook
  useEffect(() => {
    if (state.apiKey) {
      generateValidatedVisuals(state.currentScene, null);
    }
  }, [state.currentScene.sceneId]); // Reruns only when sceneId changes
  
  // Cache graph state
  useEffect(() => {
    if (state.graphService) {
        // Debounced save
        const timer = setTimeout(() => {
            const graphData = state.graphService.getGraphStateForUI();
            if(graphData.nodes.length > INITIAL_STATE.graph.nodes.length) {
                localStorage.setItem('forge_graph', JSON.stringify(graphData));
            }
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [state.graph]);

  // TTS hook
  useEffect(() => {
    if (audioActive && state.currentScene.text && state.apiKey) {
        const timer = setTimeout(() => playTTS(), 500);
        return () => clearTimeout(timer);
    }
  }, [state.currentScene.text, audioActive, state.apiKey]);


  const handleUnlockAudio = () => {
      triggerUnlock();
      setAudioActive(true);
      setShowUnlockOverlay(false);
      startAmbientAfterUnlock();
      if (state.currentScene.text) playTTS();
  };

  const handleApiKeySubmit = (key: string) => {
    setState(prev => ({ ...prev, apiKey: key }));
    setShowApiKeyModal(false);
  };
  
  const generateValidatedVisuals = async (scene: NarrativeState, previousState: AppState | null) => {
    if (!scene.visualPromptJSON || !state.visualValidator) return;
    setState(prev => ({ ...prev, isGeneratingVisuals: true }));
    try {
      const isSameScene = scene.sceneId && previousState?.currentScene?.sceneId && scene.sceneId === previousState.currentScene.sceneId;
      let finalImage = "";
      if (isSameScene && previousState?.sceneBaseImage) {
        console.log("🎨 Editing existing scene:", scene.sceneId);
        const editPrompt = `Update: ${scene.visualPromptJSON.characters.map((c: any) => `${c.id} now ${c.expression}, ${c.pose}`).join(', ')}`;
        const { base64, mimeType } = await urlToBase64(previousState.sceneBaseImage);
        if (base64) {
          finalImage = await editVisual(state.apiKey!, base64, mimeType, editPrompt);
        }
      } else {
        console.log("🎨 Generating new validated scene:", scene.sceneId);
        finalImage = await state.visualValidator.generateValidatedImage(scene.visualPromptJSON, 2);
      }
      if (finalImage) {
        setBgImage(finalImage);
        setState(prev => ({ ...prev, sceneBaseImage: finalImage }));
      }
    } catch (error) {
      console.error("Visual generation error:", error);
      if (state.visualValidator) {
        const fallback = await state.visualValidator.generateFallbackImage(scene.text);
        if (fallback) setBgImage(fallback);
      }
    }
    setState(prev => ({ ...prev, isGeneratingVisuals: false }));
  };

  const playTTS = async () => {
    if (!state.apiKey || !state.currentScene.text || !state.ttsService) return;
    const { text, speakerId, audio } = state.currentScene;
    const mood = audio?.narratorMood || 'clinical';
    const traumaLevel = state.ledger.traumaLevel;
    try {
      const { audioBase64, ssml } = await state.ttsService.generateSpeech({ text, speakerId, mood, traumaLevel, intensity: traumaLevel > 50 ? 0.8 : 0.5 });
      if (audioBase64) {
        const url = `data:audio/mp3;base64,${audioBase64}`;
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(e => console.warn("Audio play failed:", e));
        }
        console.log('🎤 SSML Performance:', ssml.slice(0, 200) + '...');
      }
    } catch (error) {
      console.error("Enhanced TTS failed:", error);
    }
  };
  
  const handleChoice = async (choiceText: string) => {
    if (!state.apiKey || state.isThinking || !state.directorAI) return;
    setState(prev => ({ ...prev, isThinking: true }));
    const previousState = { ...state };
    try {
      const nextScene = await state.directorAI.orchestrate(state, choiceText, setThinkingStage);
      if (nextScene.graphUpdates && state.graphService) {
        for (const link of nextScene.graphUpdates.links) {
          await state.graphService.addEdge(link.source, link.target, link.label, link.strength);
        }
        const graphAnalysis = await state.graphService.analyzeGraph(state);
        console.log('📊 Graph Analysis:', graphAnalysis);
        setState(prev => ({
          ...prev,
          directorInsights: {
            ...prev.directorInsights,
            tropeEntropy: graphAnalysis.tropeEntropy,
            hiddenPlots: nextScene.directorNotes?.hiddenPlots,
            futureHooks: nextScene.directorNotes?.futureHooks
          }
        }));
      }
      const newLedger = { ...state.ledger, ...nextScene.ledgerUpdates, turnCount: state.ledger.turnCount + 1 };
      const newHistory = [...state.history, state.currentScene];
      const newGraphState = state.graphService ? state.graphService.getGraphStateForUI() : state.graph;
      
      const newState: AppState = { ...state, ledger: newLedger, history: newHistory, currentScene: nextScene, graph: newGraphState, isThinking: false };
      setState(newState);
      await generateValidatedVisuals(nextScene, previousState);
    } catch (e) {
      console.error("Enhanced Game Loop Error", e);
      setState(prev => ({ ...prev, isThinking: false }));
    }
  };

  const getAtmosphereClass = () => ({
      'seductive': 'vignette-overlay', 'clinical': 'clinical-overlay',
      'mocking': 'mocking-overlay', 'sympathetic': 'sympathetic-overlay'
  })[state.currentScene.audio?.narratorMood || ''] || '';
  
  const getTensionClass = () => (state.currentScene.audio?.bgm === 'tension' || state.currentScene.audio?.bgm === 'heartbeat') ? 'animate-pulse-slow bg-red-900/10' : '';

  return (
    <div className="relative w-screen h-screen overflow-hidden flex bg-black">
      <AudioManager audioState={state.currentScene.audio} masterVolume={0.4} isActive={audioActive} />
      {showApiKeyModal && (
        <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#4a0404] p-8 max-w-md w-full shadow-[0_0_50px_rgba(74,4,4,0.5)]">
            <h2 className="text-2xl text-[#d4af37] mb-4 font-header text-center tracking-widest">THE FORGE'S LOOM</h2>
            <input type="password" placeholder="PASTE GOOGLE GEMINI API KEY"
              className="w-full bg-black border border-gray-700 p-3 text-white mb-4 focus:border-[#d4af37] outline-none font-mono-code text-center"
              onKeyDown={(e) => { if (e.key === 'Enter') handleApiKeySubmit(e.currentTarget.value); }} />
            <button onClick={() => handleApiKeySubmit((document.querySelector('input[type="password"]') as HTMLInputElement).value)}
              className="w-full bg-[#4a0404] hover:bg-[#600505] text-white p-3 transition-all font-header border border-[#d4af37]/20 tracking-widest">INITIALIZE</button>
          </div>
        </div>
      )}
      {state.isThinking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Loader2 className="animate-spin text-[#d4af37] mx-auto mb-4" size={48} />
            <p className="text-gray-400 font-mono-code">{thinkingStage}</p>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }}>
           <div className="absolute inset-0 bg-black/20 weeping-wall mix-blend-overlay" />
        </div>
        <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${getAtmosphereClass()}`} />
        <div className={`absolute inset-0 pointer-events-none ${getTensionClass()}`} />
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/95 to-transparent pt-32 z-20">
           <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-3">
                  <span className="text-[#d4af37] text-2xl font-header font-bold tracking-widest">{state.currentScene.speaker || "???"}</span>
                  <button onClick={playTTS} className="text-gray-500 hover:text-[#d4af37] flex items-center gap-2 font-mono-code text-[10px] uppercase border border-gray-800 hover:border-[#d4af37] px-3 py-1 bg-black/50"><Volume2 size={12}/> REPLAY</button>
              </div>
              <div className="bg-black/70 border-l-2 border-[#d4af37] p-6 backdrop-blur-md mb-8 relative"><p className="text-xl leading-relaxed">{state.currentScene.text}</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state.currentScene.choices.map(choice => (
                      <button key={choice.id} onClick={() => handleChoice(choice.text)} disabled={state.isThinking} className="bg-[#0f0f0f] border border-gray-800 p-5 text-left hover:bg-[#1a1a1a] hover:border-[#d4af37] transition-all group disabled:opacity-50">
                          <span className="block text-gray-300 group-hover:text-[#d4af37]">{choice.text}</span>
                          {choice.impactPrediction && (<span className="block text-xs text-red-900/70 font-mono-code mt-2 group-hover:text-red-500">&gt; {choice.impactPrediction}</span>)}
                      </button>
                  ))}
              </div>
           </div>
        </div>
      </div>
      <div className="w-80 h-full flex flex-col bg-[#050505] border-l border-[#222] z-30">
        <div className="h-1/3 border-b border-[#222]">
            <YandereLedgerUI ledger={state.ledger} />
        </div>
        <div className="h-1/3 border-b border-[#222]">
            <DirectorInsights insights={state.directorInsights} />
        </div>
        <div className="h-1/3 relative bg-[#0a0a0a]">
            <NetworkGraph nodes={state.graph.nodes} links={state.graph.links} />
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

export default App;
