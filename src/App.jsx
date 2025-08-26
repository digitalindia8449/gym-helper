import React, { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import { Play, Pause, Square as Stop, RotateCcw as Reset, Clock, ChevronRight, ChevronLeft, Search, Plus, Minus, X, Heart, Dumbbell } from "lucide-react";
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

function TimerProvider({ children }) {
  const [seconds, setSeconds] = useState(() => {
    const s = Number(localStorage.getItem("timer_seconds"));
    return Number.isFinite(s) ? s : 0;
  });
  const [running, setRunning] = useState(() => localStorage.getItem("timer_running") === "1");
  const [sheetOpen, setSheetOpen] = useState(false); // quick-access bottom sheet

  const prevSec = useRef(seconds);
  const { tick, finish, accent } = useBeep();

  useInterval(() => {
    setSeconds((s) => (s > 0 ? s - 1 : 0));
  }, running ? 1000 : null);

  // persistence
  useEffect(() => { localStorage.setItem("timer_seconds", String(seconds)); }, [seconds]);
  useEffect(() => { localStorage.setItem("timer_running", running ? "1" : "0"); }, [running]);

  // sounds: tick each second while counting, accents at 3..1, finish at 0
  useEffect(() => {
    const prev = prevSec.current;

    if (running) {
      // regular ticks (only when time is changing down)
      if (seconds > 0 && prev !== seconds) tick();

      // accent ticks on last 3 seconds (override with a stronger sound)
      if ([3, 2, 1].includes(seconds) && prev !== seconds) accent();

      // finished
      if (seconds === 0 && prev > 0) {
        finish();
        if (navigator.vibrate) navigator.vibrate([320]); // Vibrate on complete
      }
    }
    prevSec.current = seconds;
  }, [seconds, running, tick, finish, accent]);

  const value = useMemo(() => ({ seconds, setSeconds, running, setRunning, sheetOpen, setSheetOpen }), [seconds, running, sheetOpen]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}

function formatMMSS(total) {
  const m = Math.floor(total / 60); const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/***************************
 * SCROLL HELPERS
 ***************************/
function useScrollShadow() {
  const [shadow, setShadow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShadow(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return shadow;
}

function scrollIntoViewSmooth(el, block = "start") {
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: "smooth", block });
  } catch {
    el.scrollIntoView();
  }
}

/***************************
 * QUICK TIMER CHIPS / BARS
 ***************************/
function QuickTimerChips() {
  const { setSeconds, setRunning } = useTimer();
  const presets = [45, 60, 90, 120, 180];
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <button key={p} onClick={() => { setSeconds(p); setRunning(true); }} className="px-3 py-1 rounded-full border text-xs bg-white hover:bg-gray-50 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">
          {p >= 60 ? `${Math.floor(p/60)}:${String(p%60).padStart(2,'0')}` : `${p}s`}
        </button>
      ))}
    </div>
  );
}

function TimerSheet() {
  const { seconds, setSeconds, running, setRunning, sheetOpen, setSheetOpen } = useTimer();
  const [mins, setMins] = useState(1);
  const [secs, setSecs] = useState(0);

  const start = () => {
    const newVal = seconds > 0 ? seconds : (Math.max(0, mins) * 60 + Math.max(0, Math.min(59, secs)));
    setSeconds(newVal);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const stop = () => { setRunning(false); setSeconds(0); };
  const reset = (v) => { setRunning(false); setSeconds(v); };

  return (
    <AnimatePresence>
      {sheetOpen && (
        <motion.div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/35" onClick={() => setSheetOpen(false)} />
          {/* sheet */}
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="relative w-full sm:w-[440px] max-w-[94vw] mx-auto bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 border dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40"><Clock className="w-5 h-5" /></div>
                <div className="font-semibold">Workout Timer</div>
              </div>
              <button onClick={() => setSheetOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="Close timer"><X className="w-4 h-4"/></button>
            </div>

            <div className="mt-3 text-6xl font-bold tabular-nums text-center tracking-wider">
              {formatMMSS(seconds)}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={start} className="py-2 rounded-xl shadow border bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"><Play className="w-4 h-4"/>Start</button>
              <button onClick={pause} className="py-2 rounded-xl shadow border bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"><Pause className="w-4 h-4"/>Pause</button>
              <button onClick={stop} className="py-2 rounded-xl shadow border bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"><Stop className="w-4 h-4"/>Stop</button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span>Set:</span>
                <input type="number" min={0} value={mins} onChange={(e)=>setMins(Number(e.target.value))} className="w-20 px-2 py-1 rounded-lg border dark:border-zinc-800 dark:bg-zinc-950" aria-label="Minutes"/>:
                <input type="number" min={0} max={59} value={secs} onChange={(e)=>setSecs(Number(e.target.value))} className="w-20 px-2 py-1 rounded-lg border dark:border-zinc-800 dark:bg-zinc-950" aria-label="Seconds"/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[45,60,90,120,180,300].map((p)=> (
                  <button key={p} onClick={()=>reset(p)} className="px-2 py-1 rounded-lg border text-xs bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">{p>=60?`${Math.floor(p/60)}:${String(p%60).padStart(2,'0')}`:`${p}s`}</button>
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Tip: Use quick chips or set exact mm:ss. Timer persists across refresh & pages.</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FloatingTimerButton() {
  const { setSheetOpen, running, seconds } = useTimer();
  return (
    <button onClick={()=>setSheetOpen(true)} className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2 active:scale-[.98] focus:outline-none focus:ring-4 ring-indigo-300 dark:ring-indigo-800">
      <Clock className="w-4 h-4"/>
      <span className="font-semibold text-sm">{running ? "Running" : "Timer"} · {formatMMSS(seconds)}</span>
    </button>
  );
}

function QuickTimerBar() {
  const { seconds, running } = useTimer();
  return (
    <div className="sticky top-[56px] z-30 bg-white/80 dark:bg-zinc-950/70 backdrop-blur border-b dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Quick Rest:</div>
        <QuickTimerChips />
        <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">{running ? "Counting" : "Idle"} · {formatMMSS(seconds)}</div>
      </div>
    </div>
  );
}

/***************************
 * SMALL INLINE SVGs (body-part hints)
 ***************************/
const BodySvg = ({ part = "full", className = "w-10 h-10" }) => {
  if (part === "chest") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="8" y="18" width="48" height="28" rx="8" className="fill-rose-200 dark:fill-rose-900/50" />
      <circle cx="24" cy="32" r="3" className="fill-rose-400 dark:fill-rose-600" />
      <circle cx="40" cy="32" r="3" className="fill-rose-400 dark:fill-rose-600" />
    </svg>
  );
  if (part === "back") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M16 50 C18 30, 46 30, 48 50" className="fill-indigo-200 dark:fill-indigo-900/50" />
      <rect x="20" y="18" width="24" height="12" rx="6" className="fill-indigo-300 dark:fill-indigo-700"/>
    </svg>
  );
  if (part === "legs") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="18" y="18" width="10" height="30" rx="4" className="fill-green-300 dark:fill-green-800"/>
      <rect x="36" y="18" width="10" height="30" rx="4" className="fill-green-300 dark:fill-green-800"/>
    </svg>
  );
  if (part === "shoulders") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="20" cy="26" r="8" className="fill-amber-300 dark:fill-amber-800"/>
      <circle cx="44" cy="26" r="8" className="fill-amber-300 dark:fill-amber-800"/>
    </svg>
  );
  if (part === "arms") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M10 40 Q22 20 34 34 T54 40" className="fill-purple-300 dark:fill-purple-800"/>
    </svg>
  );
  if (part === "core") return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="24" y="18" width="16" height="28" rx="4" className="fill-cyan-300 dark:fill-cyan-800"/>
      <line x1="32" y1="18" x2="32" y2="46" className="stroke-cyan-600 dark:stroke-cyan-400" strokeWidth="2" />
    </svg>
  );
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="12" r="6" className="fill-zinc-300 dark:fill-zinc-700"/>
      <rect x="20" y="20" width="24" height="24" rx="6" className="fill-zinc-200 dark:fill-zinc-800"/>
    </svg>
  );
};

/***************************
 * DATA: WEEK PLAN + EXERCISES (add your YouTube links)
 ***************************/
const WEEK_PLAN = [
  { day: "Monday", focus: "Chest", emoji: "🫀", part: "chest", colorFrom: "from-rose-100", colorTo: "to-orange-100", exercises: [
    { name: "Push-Ups", videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4", target: "Chest/Triceps", cues: ["Haath kandhon ke line mein rakho (shoulder width).", "Seedha body rakho—kamar na jhukaao.", "Neeche aate 2 sec, upar jaate 1 sec.", "Neeche saans lo, upar saans chhodo."] },
    { name: "Flat Dumbbell Press", videoUrl: "https://youtu.be/SHsUIZiNdeY", target: "Chest", cues: ["Bench par seedha leto.", "Elbow ~90° tak neeche lao.", "Control ke saath upar press."] },
    { name: "Incline Dumbbell Press", videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8", target: "Upper Chest", cues: ["Bench 30–45°.", "Dumbbell upper-chest line tak.", "Jhatka nahi."] },
    { name: "Cable Fly (Chest)", videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0", target: "Chest", cues: ["Machine ke beech khade ho.", "Halki kohni tedhi.", "Aage milao, stretch feel karo."] },
    { name: "Incline DB Fly", videoUrl: "https://www.youtube.com/watch?v=GekuLTRa0Ew", target: "Upper Chest", cues: ["Arc me le jao, ground parallel tak.", "Bottom me stretch, phir squeeze."] },
    { name: "Pec Deck / Machine Fly", videoUrl: "https://www.youtube.com/watch?v=8QF0vG3j8lM", target: "Chest", cues: ["Seat adjust karo, handles seena level.", "Center me 1 sec hold."] },
    { name: "Decline Push-Ups", videoUrl: "https://www.youtube.com/watch?v=GQ6rj3x2Ukg", target: "Lower Chest", cues: ["Pair upar bench par.", "Body straight, poora range."] },
  ]},
  { day: "Tuesday", focus: "Back", emoji: "🦴", part: "back", colorFrom: "from-indigo-100", colorTo: "to-sky-100", exercises: [
    { name: "Lat Pulldown", videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc", target: "Lats", cues: ["Wide-ish grip, seena bahar.", "Bar ko seene tak kheecho."] },
    { name: "Seated Cable Row", videoUrl: "https://www.youtube.com/watch?v=HJSVR_2fk8M", target: "Mid Back", cues: ["Seedhe baitho, peeth seedhi.", "Handle pet ki taraf.", "Scapula squeeze."] },
    { name: "One-Arm DB Row", videoUrl: "https://www.youtube.com/watch?v=pYcpY20QaE8", target: "Lats/Lower Lats", cues: ["Ek ghutna bench par.", "Jango ke bagal se kheecho."] },
    { name: "Face Pull (Rear Delt)", videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk", target: "Rear Delt/Upper Back", cues: ["Rope ko aankhon/naak tak.", "Kohni upar, blades back."] },
    { name: "Bent-Over Barbell Row", videoUrl: "https://www.youtube.com/watch?v=vT2GjY_Umpw", target: "Mid Back", cues: ["Hip-hinge, peeth neutral.", "Bar navel tak kheecho."] },
    { name: "Straight-Arm Pulldown", videoUrl: "https://www.youtube.com/watch?v=G1T9-Cy_m6Y", target: "Lats", cues: ["Kohni lock, arc me neeche.", "Top me stretch."] },
    { name: "Back Extension / Hyper", videoUrl: "https://www.youtube.com/watch?v=ph3pddpKzzw", target: "Lower Back", cues: ["Slow down, slow up.", "Overextend mat karo."] },
  ]},
  { day: "Wednesday", focus: "Legs", emoji: "🦵", part: "legs", colorFrom: "from-green-100", colorTo: "to-lime-100", exercises: [
    { name: "Bodyweight/DB Squat", videoUrl: "https://www.youtube.com/watch?v=aclHkVaku9U", target: "Quads/Glutes", cues: ["Pair shoulder-width.", "Kamar piche jaise chair.", "Depth jitna safe ho."] },
    { name: "Leg Press", videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ", target: "Quads/Glutes", cues: ["Ghutne bahar, control range."] },
    { name: "Romanian Deadlift (DB)", videoUrl: "https://www.youtube.com/watch?v=DJp0T7J1BoQ", target: "Hamstrings/Glutes", cues: ["Hip hinge, shins ke paas dumbbell.", "Hamstrings me stretch."] },
    { name: "Walking Lunges", videoUrl: "https://www.youtube.com/watch?v=wrwwXE_x-pQ", target: "Quads/Glutes", cues: ["Long stride, front knee 90°.", "Torso upright."] },
    { name: "Leg Curl (Seated/Prone)", videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs", target: "Hamstrings", cues: ["Poora curl, control se wapas."] },
    { name: "Leg Extension", videoUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0", target: "Quads", cues: ["Top par 1 sec squeeze."] },
    { name: "Standing Calf Raise", videoUrl: "https://www.youtube.com/watch?v=YMmgqO8Jo-k", target: "Calves", cues: ["Panje par utho, niche slow."] },
  ]},
  { day: "Thursday", focus: "Shoulders", emoji: "🧍", part: "shoulders", colorFrom: "from-amber-100", colorTo: "to-yellow-100", exercises: [
    { name: "Overhead Press (DB/BB)", videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI", target: "Delts/Triceps", cues: ["Core tight, path straight.", "Ear line ke upar."] },
    { name: "Lateral Raise", videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo", target: "Side Delts", cues: ["Kohni halki tedhi, 90° tak."] },
    { name: "Front Raise", videoUrl: "https://www.youtube.com/watch?v=-t7fuZ0KhDA", target: "Front Delts", cues: ["Shoulder height tak."] },
    { name: "Rear Delt Fly", videoUrl: "https://www.youtube.com/watch?v=ttvfGg9d76c", target: "Rear Delts", cues: ["Hip hinge, side me le jao."] },
    { name: "Arnold Press", videoUrl: "https://www.youtube.com/watch?v=vj2w851ZHRM", target: "Delts", cues: ["Front se rotate karte hue press."] },
    { name: "Upright Row (Cable/DB)", videoUrl: "https://www.youtube.com/watch?v=tilg5abTTlM", target: "Upper Traps/Delts", cues: ["Elbows high, range comfortable."] },
    { name: "Dumbbell Shrugs", videoUrl: "https://www.youtube.com/watch?v=0UE5GfuzJVw", target: "Traps", cues: ["Shoulders seedha upar, 1 sec hold."] },
  ]},
  { day: "Friday", focus: "Arms (Biceps + Triceps)", emoji: "💪", part: "arms", colorFrom: "from-purple-100", colorTo: "to-fuchsia-100", exercises: [
    { name: "DB Biceps Curl", videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo", target: "Biceps", cues: ["Kohni jaga par rakho.", "Dheere upar, dheere neeche."] },
    { name: "Hammer Curl", videoUrl: "https://www.youtube.com/watch?v=zC3nLlEvin4", target: "Brachialis/Forearm", cues: ["Neutral grip, body stable."] },
    { name: "Preacher Curl (Bench/Machine)", videoUrl: "https://www.youtube.com/watch?v=ylpqKp0zdS8", target: "Biceps", cues: ["Bottom me stretch, top squeeze."] },
    { name: "Cable Curl (Bar/Rope)", videoUrl: "https://www.youtube.com/watch?v=ajdFwa-qM98", target: "Biceps", cues: ["Constant tension, wrists neutral."] },
    { name: "Triceps Pushdown", videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU", target: "Triceps", cues: ["Kohni chipkao, full extension."] },
    { name: "Overhead Triceps Ext.", videoUrl: "https://www.youtube.com/watch?v=_gsUck-7M74", target: "Long Head Triceps", cues: ["Sir ke piche se upar press."] },
    { name: "Bench Dips (Assisted)", videoUrl: "https://www.youtube.com/watch?v=6kALZikXxLc", target: "Triceps", cues: ["Range comfortable, shoulders safe."] },
  ]},
  { day: "Saturday", focus: "Core + Mobility", emoji: "🧘", part: "core", colorFrom: "from-cyan-100", colorTo: "to-teal-100", exercises: [
    { name: "Plank", videoUrl: "https://www.youtube.com/watch?v=BQu26ABuVS0", target: "Core", cues: ["Kamar neutral, saans normal."] },
    { name: "Dead Bug", videoUrl: "https://www.youtube.com/watch?v=I1H2lqk7v9k", target: "Core", cues: ["Opposite hand-leg, peeth chipki rahe."] },
    { name: "Leg Raise (lying)", videoUrl: "https://www.youtube.com/watch?v=l4kQd9eWclE", target: "Lower Abs", cues: ["Lower back press to floor."] },
    { name: "Russian Twists", videoUrl: "https://www.youtube.com/watch?v=wkD8rjkodUI", target: "Obliques", cues: ["Rotate from torso, jhatka nahi."] },
    { name: "Side Plank", videoUrl: "https://www.youtube.com/watch?v=K2VljzCC16g", target: "Obliques", cues: ["Body straight line, hips up."] },
    { name: "Bird Dog", videoUrl: "https://www.youtube.com/watch?v=vzD5dZ0g4eY", target: "Core/Spine", cues: ["Slow control, hips level."] },
    { name: "Stretch: Cat-Cow / Child's Pose", videoUrl: "https://www.youtube.com/watch?v=KpNQfKxCqzA", target: "Mobility", cues: ["Saans ke sath, dard nahi."] },
  ]},
  { day: "Sunday", focus: "Rest / Recovery", emoji: "🛌", part: "full", colorFrom: "from-slate-100", colorTo: "to-zinc-100", exercises: [
    { name: "Walk 20–30 min", videoUrl: "https://www.youtube.com/watch?v=8sZNm3tWQNs", target: "Cardio", cues: ["Halki chal, fresh raho."] },
    { name: "Foam Roll", videoUrl: "https://www.youtube.com/watch?v=QJLxruO3su0", target: "Recovery", cues: ["Dard wale muscles ko halka roll."] },
    { name: "Mobility 10–15 min", videoUrl: "https://www.youtube.com/watch?v=c9EwYb0xwK4", target: "Mobility", cues: ["Hips, ankles, shoulders."] },
  ]},
];

/***************************
 * UTILS: YT EMBED
 ***************************/
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // /embed/VIDEOID
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("embed");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}
function getYouTubeEmbed(url) {
  const id = getYouTubeId(url);
  if (!id) return null;
  // loop on YT requires playlist=id
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`;
}

/***************************
 * UI COMPONENTS
 ***************************/
function Header({ selectedIndex, setSelectedIndex, onScrollToExercises }) {
  const goPrev = () => { setSelectedIndex((i) => (i + 6) % 7); onScrollToExercises(); };
  const goNext = () => { setSelectedIndex((i) => (i + 1) % 7); onScrollToExercises(); };
  const shadow = useScrollShadow();

  return (
    <div className={`sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-zinc-950/70 border-b dark:border-zinc-800 transition-shadow ${shadow ? "shadow-sm" : ""}`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow flex items-center justify-center text-white font-bold text-sm sm:text-base">GH</div>
          <div className="truncate">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">Gym Helper <Dumbbell className="w-5 h-5 hidden sm:block"/></h1>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Simple · Hinglish · Beginner-friendly</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="px-3 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-zinc-800 dark:border-zinc-800" aria-label="Previous day"><ChevronLeft className="w-4 h-4"/></button>
          <div className="text-xs sm:text-sm font-medium w-32 sm:w-40 text-center truncate" aria-live="polite">{WEEK_PLAN[selectedIndex].day} · {WEEK_PLAN[selectedIndex].focus}</div>
          <button onClick={goNext} className="px-3 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-zinc-800 dark:border-zinc-800" aria-label="Next day"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  );
}

function DayGrid({ selectedIndex, onSelect, onScrollToExercises }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {WEEK_PLAN.map((d, idx) => (
        <button
          key={d.day}
          onClick={() => { onSelect(idx); onScrollToExercises(); }}
          className={`text-left rounded-2xl p-4 border shadow-sm hover:shadow-md transition bg-gradient-to-br ${d.colorFrom} ${d.colorTo} ${idx===selectedIndex ? 'ring-2 ring-indigo-400' : ''} dark:border-zinc-800`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{d.day}</div>
              <div className="font-semibold flex items-center gap-2">{d.emoji} {d.focus}</div>
              <div className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">Tap to open</div>
            </div>
            <BodySvg part={d.part} />
          </div>
        </button>
      ))}
    </div>
  );
}

function SetCounter({ defaultSets = 3 }) {
  const [sets, setSets] = useState(defaultSets);
  const [done, setDone] = useState(0);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 dark:text-gray-400">Sets:</span>
      <button onClick={()=>setSets((s)=>Math.max(1,s-1))} className="p-1 rounded border dark:border-zinc-800"><Minus className="w-3 h-3"/></button>
      <span className="min-w-6 text-center tabular-nums">{done}/{sets}</span>
      <button onClick={()=>setSets((s)=>s+1)} className="p-1 rounded border dark:border-zinc-800"><Plus className="w-3 h-3"/></button>
      <button onClick={()=>setDone((d)=>Math.min(sets, d+1))} className="ml-2 px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">Mark 1 done</button>
      <button onClick={()=>setDone(0)} className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800">Reset</button>
    </div>
  );
}

function ExerciseCard({ ex, anchorId }) {
  const cardRef = useRef(null);
  const { setSeconds, setRunning } = useTimer();

  const quickRest = (s) => { setSeconds(s); setRunning(true); };

  const embed = getYouTubeEmbed(ex.videoUrl);

  const onCenter = () => {
    if (cardRef.current) {
      scrollIntoViewSmooth(cardRef.current, "center");
    }
  };

  return (
    <motion.div
      id={anchorId}
      ref={cardRef}
      layout
      onClick={onCenter}
      className="rounded-2xl border bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm overflow-hidden cursor-pointer"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold leading-tight">{ex.name}</h4>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Target: {ex.target || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e)=>{e.stopPropagation(); quickRest(60);}} className="text-xs px-2 py-1 rounded-lg border dark:border-zinc-800">Rest 1:00</button>
            <button onClick={(e)=>{e.stopPropagation(); quickRest(90);}} className="text-xs px-2 py-1 rounded-lg border dark:border-zinc-800">1:30</button>
          </div>
        </div>

        {/* cues */}
        <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
          {ex.cues.map((c, i) => <li key={i}>{c}</li>)}
        </ul>

        {/* Always-on video after target (muted, autoplay, loop, no controls) */}
        <div className="mt-2 rounded-xl overflow-hidden border dark:border-zinc-800">
          {embed ? (
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={embed}
                title={ex.name}
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen={false}
              />
            </div>
          ) : (
            <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 grid place-items-center text-xs text-gray-500">
              Add a YouTube link in <code>videoUrl</code> to preview
            </div>
          )}
        </div>

        <SetCounter />
      </div>
    </motion.div>
  );
}

function DayDetail({ day, filter }) {
  const filtered = day.exercises.filter(ex => ex.name.toLowerCase().includes(filter) || (ex.target||'').toLowerCase().includes(filter));
  return (
    <div className="space-y-4">
      {filtered.map((ex, idx) => <ExerciseCard key={ex.name} ex={ex} anchorId={`${day.day}-${idx}`} />)}
      {filtered.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 border dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-950">No exercise matched your search.</div>
      )}
    </div>
  );
}

/***************************
 * MOBILE BOTTOM BAR (nav + quick timer)
 ***************************/
function MobileBar({ onPrev, onNext }) {
  const { setSeconds, setRunning } = useTimer();
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t bg-white/95 dark:bg-zinc-950/95 backdrop-blur dark:border-zinc-800">
      <div className="px-3 py-2 grid grid-cols-3 gap-2 items-center">
        <button onClick={onPrev} className="px-3 py-2 rounded-xl border dark:border-zinc-800 flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4"/>Prev</button>
        <button onClick={()=>{ setSeconds(60); setRunning(true); }} className="px-3 py-2 rounded-xl shadow bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-2">
          <Clock className="w-4 h-4"/> 1:00 Rest
        </button>
        <button onClick={onNext} className="px-3 py-2 rounded-xl border dark:border-zinc-800 flex items-center justify-center gap-2">Next<ChevronRight className="w-4 h-4"/></button>
      </div>
    </div>
  );
}

/***************************
 * ROOT APP
 ***************************/
export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const today = new Date();
    // 0 = Sunday..6 = Saturday; we want Monday start
    const jsDay = today.getDay();
    const mondayFirst = (jsDay + 6) % 7; // Monday=0
    return mondayFirst; // open today by default
  });
  const [searchText, setSearchText] = useState("");

  const selectedDay = WEEK_PLAN[selectedIndex];

  const exerciseSectionRef = useRef(null);

  const scrollToExercises = () => {
    if (exerciseSectionRef.current) {
      scrollIntoViewSmooth(exerciseSectionRef.current, "start");
    }
  };

  useEffect(() => {
    // auto-scroll to top when day changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedIndex]);

  const goPrev = () => { setSelectedIndex((i) => (i + 6) % 7); scrollToExercises(); };
  const goNext = () => { setSelectedIndex((i) => (i + 1) % 7); scrollToExercises(); };

  return (
    <TimerProvider>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-zinc-950 dark:to-zinc-900 text-gray-900 dark:text-gray-100">
        <Header selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} onScrollToExercises={scrollToExercises} />

        {/* Quick chips bar */}
        <QuickTimerBar />

        <main className="max-w-6xl mx-auto p-3 sm:p-4 pb-28 sm:pb-10 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">7-Day Simple Structure <Heart className="w-4 h-4 hidden sm:block"/></h2>
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={goPrev} className="px-3 py-2 rounded-xl border dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800" aria-label="Previous day"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={goNext} className="px-3 py-2 rounded-xl border dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800" aria-label="Next day"><ChevronRight className="w-4 h-4"/></button>
              </div>
            </div>
            <DayGrid selectedIndex={selectedIndex} onSelect={setSelectedIndex} onScrollToExercises={scrollToExercises} />
          </section>

          {/* Exercises Section (scroll target) */}
          <section ref={exerciseSectionRef} className="bg-white/70 dark:bg-zinc-950/60 backdrop-blur rounded-2xl border dark:border-zinc-800 p-3 sm:p-4">
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800">
                <Search className="w-4 h-4 text-gray-500"/>
                <input value={searchText} onChange={(e)=>setSearchText(e.target.value.toLowerCase())} placeholder="Search exercise or target (e.g., biceps, chest)..." className="w-full outline-none text-sm bg-transparent" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <BodySvg part={selectedDay.part} className="w-7 h-7 sm:w-8 sm:h-8"/>
                <span className="font-semibold">{selectedDay.day}:</span> {selectedDay.focus}
              </div>
            </div>
            <DayDetail day={selectedDay} filter={searchText} />
          </section>

          <footer className="py-10 text-center text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
            Made for beginners · Add your own YouTube links inside code (videoUrl) for each exercise. <br/>
            Tip: Use the floating timer button (bottom-right) or quick chips on top for instant rest timing.
          </footer>
        </main>

        {/* Mobile sticky bar + Quick-access Timer */}
        <MobileBar onPrev={goPrev} onNext={goNext} />
        <FloatingTimerButton />
        <TimerSheet />
      </div>
    </TimerProvider>
  );
}
