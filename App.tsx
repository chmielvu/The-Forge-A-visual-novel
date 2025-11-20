

import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_CHARACTERS } from './lore';
import { AppState, CurriculumPhase, NarrativeState } from './types';
import { generateScene, generateVisual, editVisual, generateSpeech, generateSSML, generateVideo, urlToBase64 } from './services/geminiService';
import { YandereLedgerUI } from './components/YandereLedger';
import { NetworkGraph } from './components/NetworkGraph';
import { AudioManager } from './components/AudioManager';
import { triggerUnlock, isAudioUnlocked, startAmbientAfterUnlock } from './components/SafeAudio';
import { Fingerprint, Loader2, Video, Volume2 } from 'lucide-react';

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
    backgroundPrompt: "Magistra Selene standing on brutalist concrete ramparts, storm clouds, crimson velvet robe plunging to navel, wind blowing hair, arrogant power pose, wide shot, masterpiece oil painting",
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
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (process.env.API_KEY) handleApiKeySubmit(process.env.API_KEY);
  }, []);

  useEffect(() => {
      if (!showApiKeyModal && !isAudioUnlocked()) setShowUnlockOverlay(true);
  }, [showApiKeyModal]);

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
    refreshVisuals(key, state.currentScene, null); 
  };

  const refreshVisuals = async (key: string, scene: NarrativeState, previousState: AppState | null) => {
    if (!scene.backgroundPrompt) return;

    setState(prev => ({...prev, isGeneratingVisuals: true}));
    
    let finalImage = "";
    // FIX: Add null check for previousState to prevent runtime errors on initial load.
    const isSameScene = scene.sceneId && previousState && previousState.currentScene.sceneId && scene.sceneId === previousState.currentScene.sceneId;

    if (isSameScene && previousState.sceneBaseImage) {
        console.log("Editing existing scene:", scene.sceneId);
        const changePrompt = scene.characterSpritePrompt || scene.backgroundPrompt;
        const { base64, mimeType } = await urlToBase64(previousState.sceneBaseImage);
        if (base64) {
            finalImage = await editVisual(key, base64, mimeType, changePrompt);
        }
        if (!finalImage) finalImage = previousState.sceneBaseImage;
    } else {
        console.log("Generating new scene:", scene.sceneId);
        finalImage = await generateVisual(key, scene.backgroundPrompt);
    }

    if (finalImage) {
        setBgImage(finalImage);
        setState(prev => ({ ...prev, sceneBaseImage: finalImage }));
    }

    setState(prev => ({...prev, isGeneratingVisuals: false}));
  };

  const handleGenerateVideo = async () => {
      if (!state.apiKey || !state.sceneBaseImage || state.isGeneratingVideo) return;
      setState(prev => ({...prev, isGeneratingVideo: true}));
      const { base64 } = await urlToBase64(state.sceneBaseImage);
      const videoUrl = await generateVideo(state.apiKey, `data:image/png;base64,${base64}`, state.currentScene.backgroundPrompt || "Atmospheric scene");
      if (videoUrl) setState(prev => ({ ...prev, currentScene: { ...prev.currentScene, videoUrl } }));
      setState(prev => ({...prev, isGeneratingVideo: false}));
  };

  const playTTS = async () => {
     if (!state.apiKey || !state.currentScene.text) return;
     const { text, speakerId, audio } = state.currentScene;
     const voiceId = state.characters[speakerId || '']?.voiceId || 'Puck';
     const mood = audio?.narratorMood || 'clinical';
     
     const ssmlText = await generateSSML(state.apiKey, text, mood, speakerId);
     // FIX: Missing third argument 'voiceId' for generateSpeech function call.
     const audioData = await generateSpeech(state.apiKey, ssmlText, voiceId);
     if (audioData) {
        const url = `data:audio/mp3;base64,${audioData}`;
        setAudioUrl(url);
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play().catch(e => console.warn("Audio play failed:", e));
        }
     }
  };

  const handleChoice = async (choiceText: string) => {
    if (!state.apiKey || state.isThinking) return;

    setState(prev => ({ ...prev, isThinking: true }));
    const previousState = { ...state };

    try {
      const nextScene = await generateScene(state.apiKey, state, choiceText);
      
      const newLedger = { ...state.ledger, ...nextScene.ledgerUpdates, turnCount: state.ledger.turnCount + 1 };
      const newHistory = [...state.history, state.currentScene];
      
      const newGraph = { ...state.graph };
      if (nextScene.graphUpdates) {
          nextScene.graphUpdates.nodes.forEach(n => { if (!newGraph.nodes.find(ex => ex.id === n.id)) newGraph.nodes.push(n); });
          nextScene.graphUpdates.links.forEach(l => newGraph.links.push(l));
      }
      
      const newState = {
        ...state, ledger: newLedger, history: newHistory, currentScene: nextScene,
        graph: newGraph, isThinking: false
      };
      
      setState(newState);
      refreshVisuals(state.apiKey, nextScene, previousState);

    } catch (e) {
      console.error("Game Loop Error", e);
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
      {!showApiKeyModal && showUnlockOverlay && (
          <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center cursor-pointer" onClick={handleUnlockAudio}>
              <div className="text-center animate-pulse"><Fingerprint size={64} className="mx-auto text-[#d4af37] mb-4" />
                  <h2 className="text-3xl text-gray-200 font-header tracking-[0.2em]">TAP TO ENTER</h2>
              </div>
          </div>
      )}
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000" style={{ backgroundImage: `url(${bgImage})` }}>
            {state.currentScene.videoUrl ? (<video src={state.currentScene.videoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover"/>) : (<div className="absolute inset-0 bg-black/20 weeping-wall mix-blend-overlay" />)}
        </div>
        <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${getAtmosphereClass()}`} />
        <div className={`absolute inset-0 pointer-events-none ${getTensionClass()}`} />
        <div className="absolute top-4 right-4 z-20"><button onClick={handleGenerateVideo} disabled={state.isGeneratingVideo || !!state.currentScene.videoUrl} className="bg-black/50 hover:bg-[#d4af37]/20 text-white p-2 rounded border border-white/10 disabled:opacity-30 backdrop-blur-md">
                {state.isGeneratingVideo ? <Loader2 className="animate-spin text-[#d4af37]" size={20} /> : <Video size={20} />}
        </button></div>
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
         <div className="h-1/2 border-b border-[#222]"><YandereLedgerUI ledger={state.ledger} /></div>
         <div className="h-1/2 relative bg-[#0a0a0a]"><NetworkGraph nodes={state.graph.nodes} links={state.graph.links} /></div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

export default App;