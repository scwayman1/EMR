"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Ambient Music Player — a subtle floating button that plays
 * relaxing instrumental music at low volume.
 *
 * Uses the Web Audio API to generate a gentle ambient tone
 * (no external audio file needed). In production, this would
 * load a real MP3/OGG of classical music.
 */
export function AmbientMusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    gain: GainNode;
  } | null>(null);

  const toggle = useCallback(() => {
    if (playing) {
      // Stop
      if (nodesRef.current) {
        nodesRef.current.gain.gain.linearRampToValueAtTime(
          0,
          (ctxRef.current?.currentTime ?? 0) + 0.5,
        );
        setTimeout(() => {
          nodesRef.current?.osc1.stop();
          nodesRef.current?.osc2.stop();
          nodesRef.current = null;
          ctxRef.current?.close();
          ctxRef.current = null;
        }, 600);
      }
      setPlaying(false);
    } else {
      // Start ambient tone
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1);
      gain.connect(ctx.destination);

      // Two gentle sine waves that create a warm pad
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 174; // Solfeggio frequency — grounding
      osc1.connect(gain);
      osc1.start();

      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 261.63; // Middle C
      osc2.connect(gain);
      osc2.start();

      // Gentle modulation for movement
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.1; // Very slow
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start();

      nodesRef.current = { osc1, osc2, gain };
      setPlaying(true);
    }
  }, [playing]);

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-surface-raised/90 border border-border shadow-lg backdrop-blur-sm text-xs font-medium text-text-muted hover:text-text hover:border-border-strong transition-all"
      aria-label={playing ? "Mute ambient music" : "Play ambient music"}
      title={playing ? "Mute ambient music" : "Play ambient music"}
    >
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L3.5 4H1V10H3.5L7 13V1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M10 4.5C10.8 5.3 11.25 6.4 11.25 7.5C11.25 8.6 10.8 9.7 10 10.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M12 2.5C13.3 3.8 14 5.6 14 7.5C14 9.4 13.3 11.2 12 12.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1L3.5 4H1V10H3.5L7 13V1Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 5L13 8M13 5L10.5 8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span className="hidden sm:inline">
        {playing ? "Mute" : "Ambient"}
      </span>
    </button>
  );
}
