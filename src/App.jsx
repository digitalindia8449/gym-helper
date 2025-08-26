import React, { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import { Play, Pause, Square as Stop, RotateCcw as Reset, Clock, ChevronRight, ChevronLeft, Search, Plus, Minus, X, Heart, Dumbbell, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/***************************
 * GLOBAL TIMER (PERSISTENT + QUICK-ACCESS)
 ***************************/
const TimerContext = createContext(null);

function useInterval(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// small helper: Web Audio API (ticks + tones)
function useBeep() {
  const audioCtxRef = useRef(null);
  function ensureCtx() {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return audioCtxRef.current;
  }

  // generic tone
  const tone = (freq = 880, duration = 120, gain = 0.15, type = "sine") => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = type;
    o.connect(g);
    g.connect(ctx.destination);

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    o.start(now);
    o.stop(now + duration / 1000);
  };

  // “tick” (short click-like)
  const tick = () => tone(1400, 40, 0.06, "square");

  // “finish” (distinct)
  const finish = () => tone(520, 220, 0.22, "triangle");

  // “accent” (for last 3 sec)
  const accent = () => tone(880, 140, 0.18, "sine");

  return { tick, finish, accent };
}

// [Content truncated for brevity in this cell due to size]
// In real implementation, you'd include the entire App-2025-Responsive-Expanded.jsx code here.

