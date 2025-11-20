
import React, { useEffect, useRef } from 'react';
import { AudioState } from '../types';
import { safePlay } from './SafeAudio';

interface Props {
    audioState?: AudioState;
    masterVolume: number;
    isActive: boolean;
}

// Validated public domain/CC0 sources or robust fallbacks
const TRACKS: Record<string, string> = {
    'theme': 'https://cdn.pixabay.com/download/audio/2022/10/05/audio_6865308041.mp3?filename=dark-mystery-trailer-116346.mp3', 
    'tension': 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=tension-17998.mp3', 
    'ritual': 'https://cdn.pixabay.com/download/audio/2023/09/06/audio_3573680032.mp3?filename=monk-chanting-164579.mp3',
    'heartbeat': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=heartbeat-123.mp3',
    'silence': ''
};

const SFX: Record<string, string> = {
    'scream': 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_6a87002014.mp3',
    'impact': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_ad24544d56.mp3',
    'whisper': 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d295803812.mp3',
    'bells': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_1130016069.mp3',
    'wet_sound': 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8448915789.mp3'
};

export const AudioManager: React.FC<Props> = ({ audioState, masterVolume, isActive }) => {
    const bgmRef = useRef<HTMLAudioElement | null>(null);
    const currentTrack = useRef<string>('silence');

    useEffect(() => {
        return () => {
            if (bgmRef.current) {
                bgmRef.current.pause();
            }
        }
    }, []);

    // Handle BGM
    useEffect(() => {
        if (!audioState || !isActive) return;
        
        const targetTrack = audioState.bgm || 'silence';
        
        // Only change track if it's different
        if (currentTrack.current !== targetTrack) {
            // Fade out logic
            const fadeOut = setInterval(() => {
                if (bgmRef.current && bgmRef.current.volume > 0.05) {
                    bgmRef.current.volume -= 0.05;
                } else {
                    clearInterval(fadeOut);
                    // Switch track
                    if (targetTrack !== 'silence' && TRACKS[targetTrack]) {
                        if (bgmRef.current) bgmRef.current.pause();
                        
                        // Use safePlay instead of new Audio
                        bgmRef.current = safePlay(TRACKS[targetTrack], 0, true);
                        
                        // Fade in
                        const fadeIn = setInterval(() => {
                            if (bgmRef.current && bgmRef.current.volume < masterVolume) {
                                bgmRef.current.volume = Math.min(bgmRef.current.volume + 0.05, masterVolume);
                            } else {
                                clearInterval(fadeIn);
                            }
                        }, 100);
                    } else {
                        if (bgmRef.current) bgmRef.current.pause();
                    }
                    currentTrack.current = targetTrack;
                }
            }, 100);
        } else {
            // Update volume if track hasn't changed
            if(bgmRef.current) bgmRef.current.volume = masterVolume;
        }

    }, [audioState?.bgm, masterVolume, isActive]);

    // Handle SFX
    useEffect(() => {
        if (!audioState?.sfx || !isActive) return;
        
        const sfxUrl = SFX[audioState.sfx];
        if (sfxUrl) {
            // Use safePlay for one-shot SFX
            safePlay(sfxUrl, Math.min(masterVolume + 0.2, 1), false);
        }
    }, [audioState?.sfx, isActive]);

    return null;
};
