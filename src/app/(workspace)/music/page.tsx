'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import { useToast } from '@/components/Toast';
import './music.css';

/* ── Types ── */
interface GeneratedTrack {
    id: string;
    prompt: string;
    model: string;
    genre: string;
    vocal: boolean;
    duration: number;
    waveform: number[];
    timestamp: number;
    audioBuffer?: AudioBuffer;
    audioUrl?: string; // Real Suno audio URL
    lyrics?: string;
    imageUrl?: string;
}

const MUSIC_MODELS = [
    { id: 'suno', name: 'Suno', color: '#ff4081', description: 'Full songs with vocals · studio quality ✅', creditsPerSec: 3.34 },
    { id: 'udio', name: 'Udio', color: '#00bcd4', description: 'Hi-fi quality · great for cinematic tracks', creditsPerSec: 1.67 },
    { id: 'aiva', name: 'AIVA', color: '#7c4dff', description: 'Orchestra & movie music · downloadable files', creditsPerSec: 1.0 },
];

const GENRES = ['Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'R&B', 'Ambient', 'Cinematic', 'Lo-fi', 'Country', 'Metal'];

/* ── Genre configs: chord progressions, scales, tempo, mix levels ── */
interface GenreConfig {
    baseFreq: number;
    scale: number[];
    chords: number[][]; // arrays of semitone offsets from root
    tempo: number;
    padWave: OscillatorType;
    leadWave: OscillatorType;
    drumLevel: number;  // 0-1
    bassLevel: number;
    padLevel: number;
    leadLevel: number;
    swing: number; // 0-0.3
}

const GENRE_CONFIGS: Record<string, GenreConfig> = {
    'Pop': { baseFreq: 220, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]], tempo: 120, padWave: 'sine', leadWave: 'triangle', drumLevel: 0.7, bassLevel: 0.6, padLevel: 0.4, leadLevel: 0.3, swing: 0 },
    'Rock': { baseFreq: 165, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]], tempo: 130, padWave: 'sawtooth', leadWave: 'sawtooth', drumLevel: 0.9, bassLevel: 0.8, padLevel: 0.3, leadLevel: 0.25, swing: 0 },
    'Jazz': { baseFreq: 196, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 4, 7, 10], [5, 9, 12, 15], [2, 5, 9, 12], [7, 11, 14, 17]], tempo: 100, padWave: 'triangle', leadWave: 'sine', drumLevel: 0.35, bassLevel: 0.55, padLevel: 0.5, leadLevel: 0.35, swing: 0.2 },
    'Classical': { baseFreq: 262, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 3, 7]], tempo: 76, padWave: 'sine', leadWave: 'sine', drumLevel: 0, bassLevel: 0.4, padLevel: 0.7, leadLevel: 0.4, swing: 0 },
    'Electronic': { baseFreq: 131, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12], [5, 12, 17], [7, 12, 19], [3, 10, 15]], tempo: 128, padWave: 'sawtooth', leadWave: 'square', drumLevel: 0.85, bassLevel: 0.9, padLevel: 0.35, leadLevel: 0.2, swing: 0 },
    'Hip-Hop': { baseFreq: 147, scale: [0, 3, 5, 7, 10], chords: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]], tempo: 88, padWave: 'triangle', leadWave: 'sine', drumLevel: 0.9, bassLevel: 0.85, padLevel: 0.3, leadLevel: 0.2, swing: 0.15 },
    'R&B': { baseFreq: 196, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], tempo: 82, padWave: 'sine', leadWave: 'triangle', drumLevel: 0.5, bassLevel: 0.6, padLevel: 0.55, leadLevel: 0.3, swing: 0.1 },
    'Ambient': { baseFreq: 175, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 12, 16], [5, 12, 16, 19], [7, 14, 19, 24], [2, 9, 14, 16]], tempo: 60, padWave: 'sine', leadWave: 'sine', drumLevel: 0, bassLevel: 0.25, padLevel: 0.8, leadLevel: 0.15, swing: 0 },
    'Cinematic': { baseFreq: 147, scale: [0, 2, 3, 5, 7, 8, 11], chords: [[0, 3, 7, 12], [5, 8, 12, 15], [7, 11, 14, 19], [3, 7, 10, 15]], tempo: 68, padWave: 'sine', leadWave: 'triangle', drumLevel: 0.3, bassLevel: 0.5, padLevel: 0.75, leadLevel: 0.25, swing: 0 },
    'Lo-fi': { baseFreq: 196, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [5, 9, 12, 16], [7, 11, 14, 17], [2, 5, 9, 14]], tempo: 72, padWave: 'triangle', leadWave: 'sine', drumLevel: 0.45, bassLevel: 0.5, padLevel: 0.5, leadLevel: 0.3, swing: 0.1 },
    'Country': { baseFreq: 220, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], tempo: 110, padWave: 'triangle', leadWave: 'triangle', drumLevel: 0.5, bassLevel: 0.55, padLevel: 0.35, leadLevel: 0.35, swing: 0.05 },
    'Metal': { baseFreq: 110, scale: [0, 1, 3, 5, 6, 8, 10], chords: [[0, 7, 12], [5, 12, 17], [7, 14, 19], [3, 10, 15]], tempo: 160, padWave: 'sawtooth', leadWave: 'sawtooth', drumLevel: 0.95, bassLevel: 0.9, padLevel: 0.25, leadLevel: 0.2, swing: 0 },
};

function generateWaveform(bars: number): number[] {
    return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
}

/* ── Helper: seeded pseudo-random for deterministic melodies ── */
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/* ── Synthesize a premium multi-layer music track ── */
function synthesizeTrack(ctx: AudioContext, genre: string, durationSec: number): AudioBuffer {
    const sr = ctx.sampleRate;
    const N = Math.floor(sr * durationSec);
    const buffer = ctx.createBuffer(2, N, sr);
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);

    const cfg = GENRE_CONFIGS[genre] || GENRE_CONFIGS['Pop'];
    const beatSec = 60 / cfg.tempo;
    const barSec = beatSec * 4;
    const rng = seededRandom(42 + genre.length * 7);

    // ─── Song structure: define sections ───
    type Section = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
    const totalBars = Math.ceil(durationSec / barSec);
    const sectionMap: Section[] = [];
    // Build song structure
    const introBars = Math.max(1, Math.floor(totalBars * 0.1));
    const outroBars = Math.max(1, Math.floor(totalBars * 0.1));
    const bodyBars = totalBars - introBars - outroBars;
    const verseLen = Math.max(2, Math.floor(bodyBars * 0.25));
    const chorusLen = Math.max(2, Math.floor(bodyBars * 0.25));
    for (let i = 0; i < introBars; i++) sectionMap.push('intro');
    let remaining = bodyBars;
    let toggle = true;
    while (remaining > 0) {
        if (toggle) {
            const len = Math.min(verseLen, remaining);
            for (let i = 0; i < len; i++) sectionMap.push('verse');
            remaining -= len;
        } else {
            const len = Math.min(chorusLen, remaining);
            for (let i = 0; i < len; i++) sectionMap.push('chorus');
            remaining -= len;
            // Insert bridge once after second chorus
            if (remaining > 4 && sectionMap.filter(s => s === 'chorus').length >= chorusLen * 2) {
                const bridgeLen = Math.min(2, remaining);
                for (let i = 0; i < bridgeLen; i++) sectionMap.push('bridge');
                remaining -= bridgeLen;
            }
        }
        toggle = !toggle;
    }
    for (let i = 0; i < outroBars; i++) sectionMap.push('outro');

    // Energy levels per section
    const sectionEnergy: Record<Section, number> = {
        intro: 0.4, verse: 0.65, chorus: 1.0, bridge: 0.5, outro: 0.35,
    };
    const sectionDrumOn: Record<Section, boolean> = {
        intro: genre !== 'Classical' && genre !== 'Ambient', verse: true, chorus: true, bridge: false, outro: genre !== 'Classical' && genre !== 'Ambient',
    };

    // Pre-generate melody using musical intervals (not random)
    const totalBeats = Math.ceil(durationSec / beatSec) + 16;
    const melodyNotes: number[] = [];
    let prevNote = cfg.scale[0];
    for (let i = 0; i < totalBeats; i++) {
        // Prefer small intervals (1-2 scale steps) for musicality
        const step = Math.floor(rng() * 3) - 1; // -1, 0, or +1 in scale
        const scaleIdx = cfg.scale.indexOf(prevNote);
        const newIdx = Math.max(0, Math.min(cfg.scale.length - 1,
            scaleIdx >= 0 ? scaleIdx + step : Math.floor(rng() * cfg.scale.length)));
        prevNote = cfg.scale[newIdx];
        melodyNotes.push(prevNote);
    }

    // Pre-generate arpeggio patterns per chord
    const arpPatterns = cfg.chords.map(chord => {
        // Create an arpeggiated pattern: root → 3rd → 5th → octave → 5th → 3rd
        const pattern = [chord[0], chord[1] || chord[0], chord[2] || chord[0],
        chord[0] + 12, chord[2] || chord[0], chord[1] || chord[0]];
        return pattern;
    });

    // Helper oscillators
    const osc = (freq: number, t: number, type: OscillatorType): number => {
        const p = 2 * Math.PI * freq * t;
        switch (type) {
            case 'sine': return Math.sin(p);
            case 'triangle': return 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
            case 'sawtooth': {
                // Band-limited sawtooth (4 harmonics) for richer, less buzzy sound
                let v = 0;
                for (let h = 1; h <= 6; h++) {
                    v += Math.sin(p * h) * (h % 2 === 0 ? -1 : 1) / h;
                }
                return v * 0.6;
            }
            case 'square': {
                // Band-limited square (odd harmonics only)
                let v = 0;
                for (let h = 1; h <= 5; h += 2) {
                    v += Math.sin(p * h) / h;
                }
                return v * 0.6;
            }
            default: return Math.sin(p);
        }
    };

    // ADSR envelope with curve
    const adsr = (t: number, a: number, d: number, s: number, r: number, dur: number): number => {
        if (t < 0) return 0;
        if (t < a) { const x = t / a; return x * x; } // exponential attack
        if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
        if (t < dur - r) return s;
        if (t < dur) { const x = (t - (dur - r)) / r; return s * (1 - x * x); } // exponential release
        return 0;
    };

    // Simple 1-pole low-pass filter state
    let lpfL = 0, lpfR = 0;

    // Noise buffer for drums and textures
    const noiseBuffer: number[] = [];
    for (let i = 0; i < sr * 2; i++) noiseBuffer.push(rng() * 2 - 1);

    // Sidechain state
    let sidechainEnv = 0;

    for (let s = 0; s < N; s++) {
        const t = s / sr;
        let mixL = 0;
        let mixRR = 0;

        const currentBar = Math.floor(t / barSec);
        const posInBar = t - currentBar * barSec;
        const currentBeat = Math.floor(posInBar / beatSec);
        const posInBeat = posInBar - currentBeat * beatSec;
        const globalBeat = Math.floor(t / beatSec);

        // Current section and energy
        const section = sectionMap[Math.min(currentBar, sectionMap.length - 1)] || 'verse';
        const energy = sectionEnergy[section];
        const drumsOn = sectionDrumOn[section] && cfg.drumLevel > 0;

        // Swing for 8th notes
        const eighthDur = beatSec / 2;
        const eighthBeat = Math.floor(posInBar / eighthDur);
        const posIn8th = posInBar - eighthBeat * eighthDur;

        // 16th note position for arpeggios
        const sixteenthDur = beatSec / 4;
        const sixteenthBeat = Math.floor(posInBar / sixteenthDur);
        const posIn16th = posInBar - sixteenthBeat * sixteenthDur;

        // ─── 1. PAD / CHORDS ───
        if (cfg.padLevel > 0) {
            const chordIdx = currentBar % cfg.chords.length;
            const chord = cfg.chords[chordIdx];
            let padSample = 0;

            for (const semi of chord) {
                const freq = cfg.baseFreq * Math.pow(2, semi / 12);
                // Triple detuned oscillators for thick unison
                padSample += osc(freq * 1.004, t, cfg.padWave) * 0.25;
                padSample += osc(freq * 0.996, t, cfg.padWave) * 0.25;
                padSample += osc(freq, t, 'sine') * 0.35;
                // Add sub-octave for warmth
                padSample += Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.15;
            }
            padSample /= chord.length;

            // Slow envelope per bar with longer attack in intro/outro
            const attackTime = section === 'intro' || section === 'outro' ? 0.8 : 0.2;
            const barEnv = adsr(posInBar, attackTime, 0.4, 0.7, 0.6, barSec);
            padSample *= barEnv * cfg.padLevel * energy;

            // Stereo width via detuning
            mixL += padSample * 0.92;
            mixRR += padSample * 1.08;
        }

        // ─── 2. ARPEGGIATED CHORDS (in verse/chorus) ───
        if (cfg.padLevel > 0 && (section === 'verse' || section === 'chorus')) {
            const chordIdx = currentBar % arpPatterns.length;
            const arp = arpPatterns[chordIdx];
            const arpIdx = sixteenthBeat % arp.length;
            const arpSemi = arp[arpIdx];
            const arpFreq = cfg.baseFreq * Math.pow(2, arpSemi / 12);

            const arpEnv = adsr(posIn16th, 0.005, 0.06, 0.2, 0.05, sixteenthDur * 0.8);
            const arpVelocity = 0.4 + rng() * 0.15; // velocity variation
            const arpSample = osc(arpFreq, t, 'triangle') * arpEnv * arpVelocity * 0.25 * energy;

            // Pan arpeggios alternating L/R for width
            const panLR = (arpIdx % 2 === 0) ? 0.7 : 1.3;
            mixL += arpSample * (2 - panLR);
            mixRR += arpSample * panLR;
        }

        // ─── 3. BASS LINE ───
        if (cfg.bassLevel > 0) {
            const chordIdx = currentBar % cfg.chords.length;
            const rootSemi = cfg.chords[chordIdx][0];
            const bassFreq = (cfg.baseFreq / 2) * Math.pow(2, rootSemi / 12);

            // Rhythmic bass patterns vary by genre
            const isHighEnergy = cfg.tempo >= 120;
            let bassActive = false;
            if (isHighEnergy) {
                bassActive = true; // every beat for electronic
            } else if (section === 'chorus') {
                bassActive = (currentBeat === 0 || currentBeat === 1 || currentBeat === 2);
            } else {
                bassActive = (currentBeat === 0 || currentBeat === 2);
            }

            if (bassActive) {
                const bassAttack = isHighEnergy ? 0.005 : 0.015;
                const bassEnv = adsr(posInBeat, bassAttack, 0.08, 0.55, 0.12, beatSec * 0.85);

                // Rich bass: fundamental + sub + harmonics
                let bassSample = Math.sin(2 * Math.PI * bassFreq * t) * 0.5; // fundamental
                bassSample += Math.sin(2 * Math.PI * bassFreq * 0.5 * t) * 0.25; // sub octave
                bassSample += Math.sin(2 * Math.PI * bassFreq * 2 * t) * 0.12; // 2nd harmonic
                bassSample += osc(bassFreq, t, 'triangle') * 0.13; // add warmth

                // Apply sidechain ducking (bass ducks when kick hits)
                const scDuck = 1.0 - sidechainEnv * 0.6;
                bassSample *= bassEnv * cfg.bassLevel * energy * scDuck;

                mixL += bassSample;
                mixRR += bassSample;
            }
        }

        // ─── 4. DRUMS ───
        if (drumsOn) {
            let drumL = 0, drumR = 0;
            const barBeat = currentBeat;

            // KICK — with pitch sweep and body
            const fourOnFloor = cfg.tempo >= 120;
            const isKick = fourOnFloor ? true : (barBeat === 0 || barBeat === 2);
            if (isKick && posInBeat < 0.2) {
                const kickT = posInBeat;
                const kickEnv = Math.exp(-kickT * 20) * 1.0 + Math.exp(-kickT * 5) * 0.3;
                const kickFreq = 50 + 100 * Math.exp(-kickT * 40); // pitch sweep
                const kickSample = Math.sin(2 * Math.PI * kickFreq * kickT) * kickEnv;
                // Kick click transient
                const click = Math.exp(-kickT * 200) * noiseBuffer[(s + 77) % noiseBuffer.length] * 0.15;
                const kick = (kickSample + click) * cfg.drumLevel;
                drumL += kick;
                drumR += kick;
                // Trigger sidechain
                sidechainEnv = 1.0;
            }

            // SNARE — with body, rattle, and noise layers
            if ((barBeat === 1 || barBeat === 3) && posInBeat < 0.2) {
                const snareT = posInBeat;
                const snareBody = Math.sin(2 * Math.PI * 185 * snareT) * Math.exp(-snareT * 14) * 0.45;
                const snareRattle = Math.sin(2 * Math.PI * 330 * snareT) * Math.exp(-snareT * 20) * 0.2;
                const snareNoise = noiseBuffer[s % noiseBuffer.length] * Math.exp(-snareT * 10) * 0.35;
                // High-frequency sizzle
                const snareSizzle = noiseBuffer[(s + 55555) % noiseBuffer.length] * Math.exp(-snareT * 25) * 0.15;
                const snare = (snareBody + snareRattle + snareNoise + snareSizzle) * cfg.drumLevel;
                drumL += snare;
                drumR += snare;
            }

            // HI-HAT — with velocity variation and open/closed
            {
                const hhVelocity = 0.12 + (eighthBeat % 2 === 0 ? 0.08 : 0); // accent downbeats
                const isOpenHat = (eighthBeat % 8 === 3 || eighthBeat % 8 === 7);
                const hhDecay = isOpenHat ? 12 : 50;
                const hhEnv = Math.exp(-posIn8th * hhDecay) * hhVelocity;
                // Metallic hi-hat: high-frequency filtered noise
                const hhNoise = noiseBuffer[(s + 99999) % noiseBuffer.length];
                const hhRing = Math.sin(2 * Math.PI * 8000 * t) * 0.3 + Math.sin(2 * Math.PI * 11000 * t) * 0.2;
                const hh = (hhNoise * 0.5 + hhRing);
                drumL += hh * hhEnv * cfg.drumLevel * 0.6;
                drumR += hh * hhEnv * cfg.drumLevel * 0.7; // slightly right
            }

            // RIDE CYMBAL — in chorus for extra energy
            if (section === 'chorus' && currentBeat === 0 && posInBeat < 0.5) {
                const rideEnv = Math.exp(-posInBeat * 4) * 0.08;
                const ride = (Math.sin(2 * Math.PI * 5500 * t) + noiseBuffer[(s + 33333) % noiseBuffer.length] * 0.5) * rideEnv * cfg.drumLevel;
                drumL += ride * 1.2;
                drumR += ride * 0.8;
            }

            // DRUM FILL — on last bar before chorus transitions
            const nextSection = sectionMap[Math.min(currentBar + 1, sectionMap.length - 1)];
            if (nextSection === 'chorus' && section !== 'chorus' && currentBeat >= 2) {
                // Snare roll fill
                const fillDiv = sixteenthDur;
                const fillPos = posIn16th;
                if (fillPos < fillDiv * 0.5) {
                    const fillSnare = noiseBuffer[(s + 22222) % noiseBuffer.length] * Math.exp(-fillPos * 30) * 0.2;
                    const fillBody = Math.sin(2 * Math.PI * 200 * fillPos) * Math.exp(-fillPos * 20) * 0.15;
                    drumL += (fillSnare + fillBody) * cfg.drumLevel;
                    drumR += (fillSnare + fillBody) * cfg.drumLevel;
                }
            }

            mixL += drumL;
            mixRR += drumR;
        }

        // ─── 5. MELODY LEAD ───
        if (cfg.leadLevel > 0 && section !== 'intro') {
            const noteSemi = melodyNotes[globalBeat % melodyNotes.length];
            const melFreq = cfg.baseFreq * 2 * Math.pow(2, noteSemi / 12);

            // Musical rest pattern: play 3 notes, rest 1, play 2, rest 2
            const phrasePos = globalBeat % 8;
            const melPlay = phrasePos < 3 || (phrasePos >= 4 && phrasePos < 6);

            if (melPlay) {
                // Velocity humanization
                const velocity = 0.7 + rng() * 0.3;
                const melEnv = adsr(posInBeat, 0.01, 0.1, 0.35, 0.15, beatSec * 0.75);
                let melSample = osc(melFreq, t, cfg.leadWave) * 0.6;
                // Add subtle vibrato
                const vibratoAmt = 0.003 * Math.sin(2 * Math.PI * 5.5 * t);
                melSample += osc(melFreq * (1 + vibratoAmt), t, 'sine') * 0.4;
                melSample *= melEnv * cfg.leadLevel * velocity * energy;

                // Chorus sections get louder melody
                if (section === 'chorus') melSample *= 1.3;

                // Pan melody slightly right
                mixL += melSample * 0.6;
                mixRR += melSample * 1.4;
            }
        }

        // ─── 6. TEXTURAL ATMOSPHERE ───
        // Subtle noise floor for ambiance (louder in ambient/cinematic)
        const noiseLevel = (genre === 'Ambient' || genre === 'Cinematic' || genre === 'Lo-fi') ? 0.015 : 0.004;
        const texNoise = noiseBuffer[(s * 3) % noiseBuffer.length] * noiseLevel * energy;
        mixL += texNoise;
        mixRR += texNoise * 0.9;

        // ─── Sidechain envelope decay ───
        sidechainEnv *= 0.9997; // ~150ms decay

        // ─── Low-pass filter (smooth out harshness) ───
        // Dynamic cutoff: opens up in chorus, closes in intro/outro
        const cutoffBase = section === 'chorus' ? 0.85 : section === 'intro' || section === 'outro' ? 0.3 : 0.6;
        // Slow filter sweep
        const filterSweep = cutoffBase + Math.sin(t * 0.2) * 0.08;
        const alpha = Math.min(0.99, Math.max(0.05, filterSweep));
        lpfL = lpfL + alpha * (mixL - lpfL);
        lpfR = lpfR + alpha * (mixRR - lpfR);

        // ─── Master processing ───
        const masterGain = 0.38;
        let outL = lpfL * masterGain;
        let outR = lpfR * masterGain;

        // Stereo width enhancement
        const mid = (outL + outR) * 0.5;
        const side = (outL - outR) * 0.5;
        const widthMult = section === 'chorus' ? 1.4 : 1.15;
        outL = mid + side * widthMult;
        outR = mid - side * widthMult;

        // Soft clipping (tanh) for warm saturation
        outL = Math.tanh(outL * 1.2);
        outR = Math.tanh(outR * 1.2);

        L[s] = outL;
        R[s] = outR;
    }

    // ─── Fade in/out ───
    const fadeInSec = Math.min(1.5, durationSec * 0.1);
    const fadeOutSec = Math.min(2.0, durationSec * 0.12);
    const fadeInSamples = Math.floor(sr * fadeInSec);
    const fadeOutSamples = Math.floor(sr * fadeOutSec);
    for (let i = 0; i < fadeInSamples && i < N; i++) {
        const x = i / fadeInSamples;
        const fade = x * x; // exponential fade in
        L[i] *= fade;
        R[i] *= fade;
    }
    for (let i = 0; i < fadeOutSamples && i < N; i++) {
        const idx = N - 1 - i;
        const x = i / fadeOutSamples;
        const fade = x * x;
        L[idx] *= fade;
        R[idx] *= fade;
    }

    // ─── Multi-tap delay reverb ───
    const delays = [
        { samples: Math.floor(sr * 0.073), feedbackGain: 0.22, panL: 0.8, panR: 1.2 },  // short: early reflections
        { samples: Math.floor(sr * 0.137), feedbackGain: 0.18, panL: 1.1, panR: 0.9 },  // med
        { samples: Math.floor(sr * 0.211), feedbackGain: 0.14, panL: 0.9, panR: 1.1 },  // long
        { samples: Math.floor(sr * 0.307), feedbackGain: 0.08, panL: 1.0, panR: 1.0 },  // tail
    ];
    // Ambient/cinematic gets more reverb
    const reverbMult = (genre === 'Ambient' || genre === 'Cinematic' || genre === 'Lo-fi') ? 1.8 : 1.0;

    for (const d of delays) {
        for (let s = d.samples; s < N; s++) {
            L[s] += L[s - d.samples] * d.feedbackGain * d.panL * reverbMult;
            R[s] += R[s - d.samples] * d.feedbackGain * d.panR * reverbMult;
        }
    }

    // Final limiter pass
    for (let s = 0; s < N; s++) {
        L[s] = Math.tanh(L[s]);
        R[s] = Math.tanh(R[s]);
    }

    return buffer;
}

/* ── Convert AudioBuffer to WAV Blob for download ── */
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataLength = buffer.length * blockAlign;
    const headerLength = 44;
    const totalLength = headerLength + dataLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Interleave channels
    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    let offset = headerLength;
    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numChannels; c++) {
            const sample = Math.max(-1, Math.min(1, channels[c][i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/* ── Main Music Page ── */
export default function MusicPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('suno');
    const [selectedGenre, setSelectedGenre] = useState('Pop');
    const [isVocal, setIsVocal] = useState(true);
    const [duration, setDuration] = useState(30);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState(''); // e.g. 'Submitting...', 'Composing...'
    const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [playProgress, setPlayProgress] = useState(0); // 0-1

    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null); // For URL-based playback
    const startTimeRef = useRef(0);
    const playDurationRef = useRef(0);
    const animFrameRef = useRef<number>(0);
    const switchingRef = useRef(false); // Suppress onPause during track transitions

    const currentModel = MUSIC_MODELS.find(m => m.id === selectedModel) || MUSIC_MODELS[0];
    const loadingWaveform = useMemo(() => generateWaveform(80), []);
    const { toast } = useToast();

    // Persistence
    const { creations, isLoading: isLoadingCreations, saveCreation } = useCreations('music');

    // Load saved tracks on mount
    useEffect(() => {
        if (!isLoadingCreations && creations.length > 0 && tracks.length === 0) {
            const savedTracks: GeneratedTrack[] = creations.map(c => {
                const meta = c.metadata as Record<string, unknown>;
                return {
                    id: c.id,
                    prompt: c.title,
                    model: (meta.model as string) || 'suno',
                    genre: (meta.genre as string) || 'Pop',
                    vocal: (meta.vocal as boolean) ?? true,
                    duration: (meta.duration as number) || 30,
                    waveform: generateWaveform(80),
                    timestamp: new Date(c.created_at).getTime(),
                    audioUrl: (meta.audioUrl as string) || undefined,
                    lyrics: (meta.lyrics as string) || undefined,
                };
            });
            setTracks(savedTracks);
        }
    }, [isLoadingCreations, creations]); // eslint-disable-line react-hooks/exhaustive-deps

    // Get or create AudioContext
    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        return audioCtxRef.current;
    }, []);

    // Stop current playback
    const stopPlayback = useCallback(() => {
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch { /* already stopped */ }
            sourceRef.current = null;
        }
        if (audioElRef.current) {
            switchingRef.current = true;
            audioElRef.current.pause();
            audioElRef.current = null;
        }
        cancelAnimationFrame(animFrameRef.current);
        setPlayingId(null);
        setPlayProgress(0);
    }, []);

    // Play a track
    const playTrack = useCallback((track: GeneratedTrack) => {
        // Stop previous without calling pause on the SAME element we're about to play
        const prevAudio = audioElRef.current;
        const nextAudio = track.audioUrl
            ? document.getElementById(`audio-${track.id}`) as HTMLAudioElement | null
            : null;

        // Only pause the OLD element if it's a different one
        if (prevAudio && prevAudio !== nextAudio) {
            switchingRef.current = true;
            prevAudio.pause();
        }
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch { /* */ }
            sourceRef.current = null;
        }
        cancelAnimationFrame(animFrameRef.current);

        if (nextAudio) {
            // ─── Play via native <audio> element ───
            audioElRef.current = nextAudio;
            switchingRef.current = false;
            setPlayingId(track.id);
            nextAudio.currentTime = 0;
            nextAudio.volume = 1;
            // play() is called synchronously within the click handler (preserves user gesture)
            nextAudio.play().catch(() => { /* browser will retry or user can click native controls */ });
        } else {
            // ─── Fallback: Web Audio synthesis ───
            switchingRef.current = false;
            audioElRef.current = null;
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();

            let buffer = track.audioBuffer;
            if (!buffer) {
                buffer = synthesizeTrack(ctx, track.genre, Math.min(track.duration, 30));
                setTracks(prev => prev.map(t =>
                    t.id === track.id ? { ...t, audioBuffer: buffer } : t
                ));
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();
            sourceRef.current = source;
            setPlayingId(track.id);
            startTimeRef.current = ctx.currentTime;
            playDurationRef.current = buffer.duration;

            const updateProgress = () => {
                const elapsed = ctx.currentTime - startTimeRef.current;
                const progress = Math.min(1, elapsed / playDurationRef.current);
                setPlayProgress(progress);
                if (progress < 1) {
                    animFrameRef.current = requestAnimationFrame(updateProgress);
                } else {
                    setPlayingId(null);
                    setPlayProgress(0);
                }
            };
            animFrameRef.current = requestAnimationFrame(updateProgress);

            source.onended = () => {
                setPlayingId(null);
                setPlayProgress(0);
                cancelAnimationFrame(animFrameRef.current);
            };
        }
    }, [getAudioCtx]);

    // Download track — fetch blob then trigger real browser download
    const downloadTrack = useCallback(async (track: GeneratedTrack) => {
        const filename = `${track.prompt.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, '').trim()}`;

        if (track.audioUrl) {
            // Fetch the full audio via our proxy, then save as blob
            const proxyUrl = `/api/music/proxy?url=${encodeURIComponent(track.audioUrl)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) { toast('Download failed', 'error'); return; }
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${filename}.mp3`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        } else {
            const ctx = getAudioCtx();
            if (ctx.state === 'suspended') await ctx.resume();
            let buffer = track.audioBuffer;
            if (!buffer) {
                buffer = synthesizeTrack(ctx, track.genre, Math.min(track.duration, 30));
                setTracks(prev => prev.map(t =>
                    t.id === track.id ? { ...t, audioBuffer: buffer } : t
                ));
            }
            const wavBlob = audioBufferToWav(buffer);
            const blobUrl = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `${filename}.wav`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }
    }, [getAudioCtx]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, [stopPlayback]);

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        setGenerationStatus('Submitting to Suno...');

        try {
            // Step 1: Submit generation request
            const genResponse = await fetch('/api/music/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    style: selectedGenre.toLowerCase(),
                    title: prompt.trim().slice(0, 60),
                    instrumental: !isVocal,
                    model: selectedModel,
                }),
            });

            if (!genResponse.ok) {
                const err = await genResponse.json().catch(() => ({}));
                throw new Error(err.error || `Generation failed: ${genResponse.status}`);
            }

            const { taskId } = await genResponse.json();
            if (!taskId) throw new Error('No taskId returned from Suno');

            setGenerationStatus('Composing your track...');

            // Step 2: Poll for completion (Suno generates async, ~30-60s)
            const statusMessages = [
                'Composing your track...',
                'Writing melodies...',
                'Mixing instruments...',
                'Adding vocals...',
                'Mastering audio...',
                'Almost ready...',
            ];
            let pollCount = 0;
            const maxPolls = 120; // 4 minutes max at 2s intervals

            const pollResult = await new Promise<{
                songs: Array<{
                    songId: string; title: string; audioUrl: string;
                    streamUrl?: string; imageUrl?: string; duration: number;
                    lyrics?: string; style?: string;
                }>;
            }>((resolve, reject) => {
                const interval = setInterval(async () => {
                    try {
                        pollCount++;
                        if (pollCount > maxPolls) {
                            clearInterval(interval);
                            reject(new Error('Generation timed out'));
                            return;
                        }

                        // Rotate status messages for visual feedback
                        const msgIdx = Math.min(Math.floor(pollCount / 8), statusMessages.length - 1);
                        setGenerationStatus(statusMessages[msgIdx]);

                        const statusRes = await fetch(`/api/music/status?taskId=${encodeURIComponent(taskId)}`);
                        if (!statusRes.ok) return; // Retry silently on error

                        const data = await statusRes.json();

                        if ((data.status === 'SUCCESS' || data.status === 'COMPLETE') && data.songs?.length > 0) {
                            clearInterval(interval);
                            resolve(data);
                        } else if (data.status === 'FAILED' || data.status === 'ERROR') {
                            clearInterval(interval);
                            reject(new Error('Suno generation failed'));
                        }
                        // Otherwise keep polling (PENDING/PROCESSING/QUEUED)
                    } catch {
                        // Silently retry on network errors
                    }
                }, 3000); // Poll every 3 seconds
            });

            // Step 3: Create track(s) from Suno response
            for (const song of pollResult.songs) {
                const audioUrl = song.audioUrl || song.streamUrl;
                if (!audioUrl) continue;

                const newTrack: GeneratedTrack = {
                    id: song.songId || Date.now().toString(),
                    prompt: prompt.trim(),
                    model: selectedModel,
                    genre: selectedGenre,
                    vocal: isVocal,
                    duration: song.duration || duration,
                    waveform: generateWaveform(80),
                    timestamp: Date.now(),
                    audioUrl,
                    lyrics: song.lyrics as string | undefined,
                    imageUrl: song.imageUrl as string | undefined,
                };
                setTracks(prev => [newTrack, ...prev]);

                // Save to persistence
                try {
                    await saveCreation({
                        title: prompt.trim(),
                        metadata: {
                            model: selectedModel,
                            genre: selectedGenre,
                            vocal: isVocal,
                            duration: song.duration || duration,
                            audioUrl,
                            lyrics: song.lyrics,
                            songId: song.songId,
                        },
                    });
                } catch (err) {
                    console.error('Failed to save track:', err);
                }
            }
        } catch (error) {
            console.error('Suno generation failed, falling back to synthesizer:', error);

            // ─── Fallback: client-side synthesis ───
            setGenerationStatus('Using local synthesis...');
            const ctx = getAudioCtx();
            const trackDuration = Math.min(duration, 30);
            const audioBuffer = synthesizeTrack(ctx, selectedGenre, trackDuration);

            const trackId = Date.now().toString();
            const newTrack: GeneratedTrack = {
                id: trackId,
                prompt: prompt.trim(),
                model: selectedModel,
                genre: selectedGenre,
                vocal: isVocal,
                duration,
                waveform: generateWaveform(80),
                timestamp: Date.now(),
                audioBuffer,
            };
            setTracks(prev => [newTrack, ...prev]);

            try {
                const wavBlob = audioBufferToWav(audioBuffer);
                const arrayBuf = await wavBlob.arrayBuffer();
                const bytes = new Uint8Array(arrayBuf);
                let binary = '';
                const chunkSize = 8192;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    const chunk = bytes.slice(i, i + chunkSize);
                    binary += String.fromCharCode(...chunk);
                }
                const base64 = btoa(binary);
                await saveCreation({
                    title: prompt.trim(),
                    metadata: { model: selectedModel, genre: selectedGenre, vocal: isVocal, duration },
                    binaryBase64: base64,
                });
            } catch (err) {
                console.error('Failed to save fallback track:', err);
            }
        } finally {
            setIsGenerating(false);
            setGenerationStatus('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    const formatDuration = (secs: number) => {
        const totalSec = Math.round(secs);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="music-page">
            {/* Controls Panel */}
            <div className="music-controls">
                <div className="music-controls__title">
                    <span className="music-controls__title-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </span>
                    AI Music
                </div>

                {/* Prompt */}
                <div className="music-controls__section">
                    <label className="music-controls__label">Describe your song</label>
                    <textarea
                        className="music-controls__prompt"
                        placeholder="An upbeat summer pop track with catchy guitar riffs, warm synths, and a feel-good chorus about road trips and freedom..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={4}
                    />
                </div>

                {/* Vocal / Instrumental Toggle */}
                <div className="music-controls__section">
                    <label className="music-controls__label">Type</label>
                    <div className="music-controls__toggle-group">
                        <button
                            className={`music-controls__toggle ${isVocal ? 'active' : ''}`}
                            onClick={() => setIsVocal(true)}
                        >
                            🎤 With Vocals
                        </button>
                        <button
                            className={`music-controls__toggle ${!isVocal ? 'active' : ''}`}
                            onClick={() => setIsVocal(false)}
                        >
                            🎸 Instrumental
                        </button>
                    </div>
                </div>

                {/* Model Selection */}
                <div className="music-controls__section">
                    <label className="music-controls__label">Model</label>
                    <div className="music-controls__model-list">
                        {MUSIC_MODELS.map(model => (
                            <button
                                key={model.id}
                                className={`music-controls__model ${selectedModel === model.id ? 'active' : ''}`}
                                onClick={() => setSelectedModel(model.id)}
                            >
                                <span className="music-controls__model-dot" style={{ background: model.color }} />
                                <span className="music-controls__model-info">
                                    <span className="music-controls__model-name">{model.name}</span>
                                    <span className="music-controls__model-desc">{model.description}</span>
                                </span>
                                <span className="music-controls__model-credits">{Math.round(model.creditsPerSec * duration)}cr</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Genre */}
                <div className="music-controls__section">
                    <label className="music-controls__label">Genre</label>
                    <div className="music-controls__genres">
                        {GENRES.map(genre => (
                            <button
                                key={genre}
                                className={`music-controls__genre ${selectedGenre === genre ? 'active' : ''}`}
                                onClick={() => setSelectedGenre(genre)}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="music-controls__section">
                    <label className="music-controls__label">Duration</label>
                    <div className="music-controls__slider-group">
                        <input
                            type="range"
                            className="music-controls__slider"
                            min={15}
                            max={180}
                            step={5}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                        />
                        <span className="music-controls__slider-value">{formatDuration(duration)}</span>
                    </div>
                </div>

                {/* Generate */}
                <button
                    className="music-controls__generate"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <span className="music-controls__spinner" />
                            {generationStatus || 'Composing...'}
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                            Generate Track · {Math.round(currentModel.creditsPerSec * duration)} credits
                        </>
                    )}
                </button>
            </div>

            {/* Tracks */}
            <div className="music-tracks">
                {tracks.length === 0 && !isGenerating ? (
                    <div className="music-tracks__empty">
                        <div className="music-tracks__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>
                        <h3>Your Studio</h3>
                        <p>Describe a mood, genre, or vibe — and get a studio-quality track in seconds.</p>
                        <div className="music-tracks__empty-features">
                            <span className="music-tracks__empty-feature">🎤 Full Vocals</span>
                            <span className="music-tracks__empty-feature">🎸 Instrumentals</span>
                            <span className="music-tracks__empty-feature">🎹 Orchestral</span>
                            <span className="music-tracks__empty-feature">📀 MP3 / WAV Export</span>
                            <span className="music-tracks__empty-feature">🎵 Up to 3 min</span>
                        </div>
                    </div>
                ) : (
                    <div className="music-tracks__list">
                        {isGenerating && (
                            <div className="music-track music-track--loading">
                                <div className="music-track__header">
                                    <div className="music-track__play">
                                        <span className="music-controls__spinner" />
                                    </div>
                                    <div className="music-track__info">
                                        <div className="music-track__title">{prompt}</div>
                                        <div className="music-track__meta">
                                            <span className="music-track__model-badge">{currentModel.name}</span>
                                            <span>{generationStatus || 'Composing...'} · {selectedGenre}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="music-track__waveform">
                                    {loadingWaveform.map((h, i) => (
                                        <div
                                            key={i}
                                            className="music-track__waveform-bar"
                                            style={{ height: `${h * 100}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {tracks.map(track => {
                            const model = MUSIC_MODELS.find(m => m.id === track.model);
                            const isPlaying = playingId === track.id;
                            const playedBars = isPlaying ? Math.floor(playProgress * track.waveform.length) : 0;
                            return (
                                <div key={track.id} className={`music-track ${isPlaying ? 'music-track--playing' : ''}`}>
                                    <div className="music-track__header">
                                        <button
                                            className="music-track__play"
                                            onClick={() => isPlaying ? stopPlayback() : playTrack(track)}
                                        >
                                            {isPlaying ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <rect x="6" y="4" width="4" height="16" />
                                                    <rect x="14" y="4" width="4" height="16" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <polygon points="5 3 19 12 5 21 5 3" />
                                                </svg>
                                            )}
                                        </button>
                                        <div className="music-track__info">
                                            <div className="music-track__title">{track.prompt}</div>
                                            <div className="music-track__meta">
                                                <span className="music-track__model-badge">{model?.name}</span>
                                                <span>{track.genre} · {track.vocal ? 'Vocal' : 'Instrumental'} · {formatDuration(track.duration)}</span>
                                            </div>
                                        </div>
                                        <div className="music-track__actions">
                                            <button className="music-track__action" title="Download" onClick={() => downloadTrack(track)}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                            </button>
                                            <button className="music-track__action" title="Share" onClick={() => { navigator.clipboard.writeText(`https://Clarix.ai/music/${track.id}`); toast('Link copied to clipboard!', 'success'); }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="18" cy="5" r="3" />
                                                    <circle cx="6" cy="12" r="3" />
                                                    <circle cx="18" cy="19" r="3" />
                                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Native audio player — uses DIRECT Suno CDN URL (audio elements are CORS-exempt) */}
                                    {track.audioUrl && (
                                        <audio
                                            id={`audio-${track.id}`}
                                            controls
                                            preload="metadata"
                                            src={track.audioUrl}
                                            onTimeUpdate={(e) => {
                                                const el = e.currentTarget;
                                                if (playingId === track.id && el.duration && !isNaN(el.duration)) {
                                                    setPlayProgress(el.currentTime / el.duration);
                                                }
                                            }}
                                            onEnded={() => {
                                                if (playingId === track.id) {
                                                    setPlayingId(null);
                                                    setPlayProgress(0);
                                                }
                                            }}
                                            onPlay={() => {
                                                if (playingId !== track.id) {
                                                    if (audioElRef.current && audioElRef.current !== (document.getElementById(`audio-${track.id}`) as HTMLAudioElement)) {
                                                        switchingRef.current = true;
                                                        audioElRef.current.pause();
                                                    }
                                                    audioElRef.current = document.getElementById(`audio-${track.id}`) as HTMLAudioElement;
                                                    switchingRef.current = false;
                                                    setPlayingId(track.id);
                                                }
                                            }}
                                            onPause={() => {
                                                if (!switchingRef.current && playingId === track.id) {
                                                    setPlayingId(null);
                                                    setPlayProgress(0);
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                height: '40px',
                                                borderRadius: '8px',
                                                margin: '8px 0 4px',
                                            }}
                                        />
                                    )}
                                    <div className="music-track__waveform">
                                        {track.waveform.map((h, i) => (
                                            <div
                                                key={i}
                                                className={`music-track__waveform-bar ${i < playedBars ? 'played' : ''}`}
                                                style={{ height: `${h * 100}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
