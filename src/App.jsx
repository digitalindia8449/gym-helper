import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  Play,
  Pause,
  Square as Stop,
  Clock,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Heart,
  Dumbbell,
  ExternalLink,
  HeartPulse, // ⬅️ add
  StretchHorizontal, // ⬅️ add
  BedDouble, // ⬅️ add
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/***************************
 * GLOBAL TIMER (PERSISTENT + QUICK-ACCESS)
 ***************************/
const TimerContext = createContext(null);

function useInterval(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// small helper: Web Audio API (ticks + tones)
// small helper: Web Audio API (ticks + tones)
function useBeep() {
  const audioCtxRef = useRef(null);
  const intervalsRef = useRef([]);

  function ensureCtx() {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      } catch {}
    }
    return audioCtxRef.current;
  }

  const tone = (freq = 880, duration = 120, gain = 0.4, type = "sine") => {
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

  const tick = () => tone(1400, 40, 0.06, "square");
  const accent = () => tone(880, 140, 0.18, "sine");

  // 10s finish sequence: beep + vibration every ~500ms
  const finish = (totalMs = 10000) => {
    const start = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - start;
      const f = Math.floor(elapsed / 600) % 2 ? 660 : 880;
      tone(f, 140, 0.2, "sine");
      if (navigator.vibrate) {
        navigator.vibrate(150);
      }
      if (elapsed >= totalMs) {
        clearInterval(iv);
      }
    }, 500);
    intervalsRef.current.push(iv);
  };

  // cleanup
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
    };
  }, []);

  return { tick, finish, accent };
}

function TimerProvider({ children }) {
  const [seconds, setSeconds] = useState(() => {
    const s = Number(localStorage.getItem("timer_seconds"));
    return Number.isFinite(s) ? s : 0;
  });
  const [running, setRunning] = useState(
    () => localStorage.getItem("timer_running") === "1"
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const prevSec = useRef(seconds);
  const { tick, finish, accent } = useBeep();

  useInterval(
    () => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    },
    running ? 1000 : null
  );

  useEffect(() => {
    localStorage.setItem("timer_seconds", String(seconds));
  }, [seconds]);
  useEffect(() => {
    localStorage.setItem("timer_running", running ? "1" : "0");
  }, [running]);

  useEffect(() => {
    const prev = prevSec.current;
    if (running) {
      if (seconds > 0 && prev !== seconds) tick();
      if ([3, 2, 1].includes(seconds) && prev !== seconds) accent();
      if (seconds === 0 && prev > 0) {
        // 10-second alarm (sound + vibration)
        finish(10000);
      }
    }
    prevSec.current = seconds;
  }, [seconds, running, tick, finish, accent]);

  const value = useMemo(
    () => ({
      seconds,
      setSeconds,
      running,
      setRunning,
      sheetOpen,
      setSheetOpen,
    }),
    [seconds, running, sheetOpen]
  );
  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}

function formatMMSS(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
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
 * DATA: WEEK PLAN + EXERCISES (2025-ready)
 * Note: Each exercise can have multiple videoUrls; first one auto-embeds.
 ***************************/
const WEEK_PLAN = [
  {
    day: "Monday",
    focus: "Chest",
    icon: HeartPulse,
    part: "chest",
    colorFrom: "from-rose-100",
    colorTo: "to-orange-100",
    exercises: [
      // 🏋️ Machines
      {
        name: "Machine Chest Press (Converging)",
        videoUrls: ["https://youtu.be/65npK4Ijz1c?si=vjVqD3x3_aSY_LGf"],
        target: "Chest",
        cues: [
          "Seat aise adjust karo ki handles mid-chest pe aaye.",
          "Elbows ~45° rakho.",
          "Front pe 1 sec squeeze karo.",
        ],
      },
      {
        name: "Chest Press Machine (Iso-Lateral)",
        videoUrls: ["https://youtu.be/hirXKlo8CNw?si=BF7CDpecimDKevbc"],
        target: "Chest",
        cues: [
          "Ek time pe ek arm press karo balance ke liye.",
          "Elbows lock mat karo.",
        ],
      },
      {
        name: "Pec Deck (Neutral Grip)",
        videoUrls: [
          "https://www.youtube.com/watch?v=eGjt4lk6g34&ab_channel=PureGym",
        ],
        target: "Chest",
        cues: ["Seat adjust karo taaki elbows mid-chest ke level pe ho."],
      },

      // 🏋️‍♂️ Weights (Barbell & Dumbbell)
      {
        name: "Incline Smith Press (30–35°)",
        videoUrls: ["https://youtu.be/8urE8Z8AMQ4?si=mQC109T9rlcFMPEz"],
        target: "Upper Chest",
        cues: [
          "Bar ko halka upper chest pe touch karo.",
          "Wrists bar ke niche stacked rakho.",
        ],
      },
      {
        name: "Flat Dumbbell Press",
        videoUrls: ["https://youtu.be/YQ2s_Y7g5Qk?si=4ubKaCc4w8JpL_bV"],
        target: "Chest",
        cues: [
          "Bottom pe elbows 75–90° rakho.",
          "Bounce mat karo, control ke saath uthao.",
        ],
      },
      {
        name: "Incline Dumbbell Press",
        videoUrls: ["https://youtu.be/5CECBjd7HLQ?si=FMobLXph12fhf4Gh"],
        target: "Upper Chest",
        cues: [
          "Bench ko 30–45° pe rakho.",
          "Dumbbell arc eye-line ki taraf le jao.",
        ],
      },
      {
        name: "Incline Dumbbell Hex Press",
        videoUrls: ["https://youtu.be/WgPIxxS_YZY?si=aTpGST9UGSY8xy_o"],
        target: "Inner/Upper Chest",
        cues: [
          "Dono dumbbells tight squeeze karke rakho.",
          "Tempo slow aur control me rakho.",
        ],
      },
      {
        name: "Decline Barbell Press",
        videoUrls: ["https://www.youtube.com/watch?v=HwpYsDva4vs&t=10s"],
        target: "Lower Chest",
        cues: [
          "Shoulder blades ko tight retract karo.",
          "Bar lower chest ko lightly touch kare.",
        ],
      },
      {
        name: "Svend Press (Plate Crush Press)",
        videoUrls: ["https://youtu.be/2XmNv4T_Jfo?si=ewnSwTuaELll53NX&t=27s"],
        target: "Inner Chest",
        cues: [
          "Plates ko pura time squeeze karke rakho.",
          "Tempo control me rakho.",
        ],
      },

      // 🤸 Free & Cable
      {
        name: "Cable Fly (High-to-Low)",
        videoUrls: ["https://youtu.be/hhruLxo9yZU?si=SZjOe304hljoGbrl"],
        target: "Lower/ Mid Chest",
        cues: [
          "Elbows thode soft rakho.",
          "Thoda cross karo peak contraction ke liye.",
        ],
      },
      {
        name: "Incline Cable Press",
        videoUrls: ["https://youtu.be/ftfzEH6hVtU?si=5s9IiT0QehzFzt1p"],
        target: "Upper Chest",
        cues: [
          "Cables ko low se high rakho.",
          "Press thoda arc me eye-line ki taraf karo.",
        ],
      },
      {
        name: "Standing Cable Crossover (Low-to-High)",
        videoUrls: ["https://youtu.be/t2C-xkBrLZM?si=EHPZVdSWiwBROEIZ"],
        target: "Upper Chest",
        cues: [
          "Arms ko upward arc me sweep karo.",
          "Top pe hands thoda cross karo.",
        ],
      },
      {
        name: "Single-Arm Cable Fly",
        videoUrls: ["https://youtu.be/blzp5vSV76A?si=9hsz1NoMmwFhLd3V&t=08s"],
        target: "Inner Chest",
        cues: [
          "Step forward karke thoda torso twist karo.",
          "Midline pe pause karo.",
        ],
      },
      {
        name: "Decline Push-Ups (Feet Up)",
        videoUrls: ["https://youtu.be/5QFjmotLfW4?si=JXuGtg2oANiD5PN-&t=28s"],
        target: "Lower Chest",
        cues: ["Body straight rakho; nose hands ke upar ho."],
      },
      {
        name: "Push-Up with Resistance Band",
        videoUrls: ["hhttps://youtu.be/ogTYczFYYsU?si=ZuTJ3PFuWfEcKIa1&t=35s"],
        target: "Chest",
        cues: [
          "Band ko upper back pe set karo.",
          "Full range rakho, core tight rakho.",
        ],
      },
    ],
  },
  {
    day: "Tuesday",
    focus: "Back",
    icon: StretchHorizontal,
    part: "back",
    colorFrom: "from-indigo-100",
    colorTo: "to-sky-100",
    exercises: [
      // -------- MACHINES --------
      {
        name: "Lat Pulldown (Wide/Medium Grip)",
        videoUrls: ["https://youtu.be/c-4zw8TLjSk?si=d40nx2Vco80wOjr-&t=4s"],
        target: "Lats",
        cues: [
          "Bar ko collarbone tak lao",
          "Elbows neeche kheecho, peeche nahi",
          "Back seedhi rakho, thoda lean back chalega",
        ],
      },
      {
        name: "Seated Cable Row (Neutral Grip)",
        videoUrls: ["https://youtu.be/AfBKmXYkuDw?si=BkTmZ8Tfpj29R8vN"],
        target: "Mid Back / Rhomboids",
        cues: [
          "Seedha baitho, chest bahar nikalo",
          "Elbows piche kheecho aur squeeze karo",
          "Weight jerk mat karo, control rakho",
        ],
      },
      {
        name: "Chest-Supported Row (Machine)",
        videoUrls: ["https://youtu.be/_FrrYQxA6kc?si=1VaR8AlrAUdA0lk9"],
        target: "Mid Back / Rear Delt",
        cues: [
          "Bench/machine pe chest tight chipkake rakho",
          "Elbows ko side se kheecho",
          "Momentum use mat karo",
        ],
      },
      {
        name: "Straight-Arm Pulldown (Cable)",
        videoUrls: ["https://youtu.be/G9uNaXGTJ4w?si=yPcATeHqFifrNToe"],
        target: "Lats",
        cues: [
          "Arms almost straight rakho",
          "Arc bana ke neeche lao",
          "Sirf back se pull feel karo, haath se nahi",
        ],
      },
      {
        name: "Face Pull (Rope on Cable)",
        videoUrls: ["https://youtu.be/-MODnZdnmAQ?si=F2E158XEJo3qVi7X"],
        target: "Rear Delt / Upper Back",
        cues: [
          "Rope ko aankh ke level tak kheecho",
          "Elbows high rakho",
          "Shoulder blades squeeze karo",
        ],
      },

      // -------- WEIGHTS --------
      {
        name: "Barbell Bent-Over Row",
        videoUrls: ["https://youtu.be/6FZHJGzMFEc?si=NpA2AmCniAV3U1uf"],
        target: "Mid Back",
        cues: [
          "Back straight rakho, rounding mat karo",
          "Bar ko waist tak kheecho",
          "Top pe squeeze karo, neeche slow lao",
        ],
      },

      {
        name: "One-Arm Dumbbell Row",
        videoUrls: ["https://youtu.be/DMo3HJoawrU?si=PjwdcEtXvHfUJlzZ"],
        target: "Lats / Mid Back",
        cues: [
          "Dumbbell ko hip ki taraf kheecho",
          "Torso stable rakho, twist mat karo",
          "Top pe squeeze feel karo",
        ],
      },
      {
        name: "Deadlift (Conventional / Trap Bar)",
        videoUrls: ["https://youtu.be/v709aJKv-gM?si=XyttR6iI7hr-Itcy"],
        target: "Full Back / Posterior Chain",
        cues: [
          "Bar ko shins ke paas rakho",
          "Back bilkul straight rakho",
          "Heels se push karo, jerk mat maro",
        ],
      },
      {
        name: "Rack Pull (Partial Deadlift)",
        videoUrls: ["https://youtu.be/GubpYDNyYes?si=JpI6a5hHU9tGz0RR"],
        target: "Upper Back / Traps",
        cues: [
          "Bar ko knee ke upar set karo",
          "Heavy weight ke liye best",
          "Back tight rakho",
        ],
      },
      {
        name: "Shrugs (Dumbbell/Barbell)",
        videoUrls: ["https://youtu.be/_t3lrPI6Ns4?si=Ga7c7ljhPAmG8xFf"],
        target: "Traps",
        cues: [
          "Shoulders ko upar uthao, neck se mat kheecho",
          "Top pe 1-2 sec hold karo",
          "Slowly neeche lao",
        ],
      },

      // -------- FREE BODYWEIGHT --------
      {
        name: "Pull-Up",
        videoUrls: ["https://youtu.be/GRgWPT9XSQQ?si=eVTcmsKMbXXWqaAi"],
        target: "Lats / Upper Back",
        cues: [
          "Shoulder blades pehle squeeze karo",
          "Chest ko bar ke paas lao",
          "Body jhatka mat do, control rakho",
        ],
      },
      {
        name: "45° Back Raise",
        videoUrls: ["https://youtu.be/5_ejbGfdAQE?si=iGUNM4L5cWLfy1N1"],
        target: "Lower Back / Glutes / Hamstrings",
        cues: [
          "Spine neutral rakho (jhukte waqt round mat karo)",
          "Hip se hinge karo, kamar se nahi",
          "Upar aate hi glutes tight squeeze karo",
          "Top pe zyada hyperextend mat karo (sirf straight tak)",
        ],
      },
    ],
  },

  {
    day: "Wednesday",
    focus: "Legs",
    icon: Dumbbell,
    part: "legs",
    colorFrom: "from-green-100",
    colorTo: "to-lime-100",
    exercises: [
      {
        name: "Pendulum Squat (Machine)",
        videoUrls: ["https://www.youtube.com/watch?v=F9nMVnOe2yQ"],
        target: "Quads/Glutes",
        cues: ["Heels flat; depth as tolerated."],
      },
      {
        name: "Hack Squat (Feet Slight High)",
        videoUrls: ["https://www.youtube.com/watch?v=1xMaFs0L3ao"],
        target: "Quads",
        cues: ["Knees out; hips under torso."],
      },
      {
        name: "Leg Press (Sled)",
        videoUrls: ["https://www.youtube.com/watch?v=IZxyjW7MPJQ"],
        target: "Quads/Glutes",
        cues: ["Don’t lock knees; full control."],
      },
      {
        name: "Romanian Deadlift (DB/BB)",
        videoUrls: ["https://www.youtube.com/watch?v=DJp0T7J1BoQ"],
        target: "Hamstrings/Glutes",
        cues: ["Hinge; bar close to legs."],
      },
      {
        name: "Seated Leg Curl (Machine)",
        videoUrls: ["https://www.youtube.com/watch?v=1Tq3QdYUuHs"],
        target: "Hamstrings",
        cues: ["Pad just above heels; full curl."],
      },
      {
        name: "Leg Extension (Pause Top)",
        videoUrls: ["https://www.youtube.com/watch?v=YyvSfVjQeL0"],
        target: "Quads",
        cues: ["1–2 sec squeeze at top."],
      },
      {
        name: "Hip Thrust (Machine/Barbell)",
        videoUrls: ["https://www.youtube.com/watch?v=LM8XHLYJoYs"],
        target: "Glutes",
        cues: ["Chin tucked; posterior tilt."],
      },
      {
        name: "Standing Calf Raise",
        videoUrls: ["https://www.youtube.com/watch?v=YMmgqO8Jo-k"],
        target: "Calves",
        cues: ["Full stretch; slow tempo."],
      },
      {
        name: "Tibialis Raise (Machine/Wall)",
        videoUrls: ["https://www.youtube.com/watch?v=1QF-5B9P0s0"],
        target: "Shin",
        cues: ["Dorsiflex hard; high reps."],
      },
    ],
  },
  {
    day: "Thursday",
    focus: "Shoulders",
    icon: Dumbbell,
    part: "shoulders",
    colorFrom: "from-amber-100",
    colorTo: "to-yellow-100",
    exercises: [
      {
        name: "Seated DB Overhead Press",
        videoUrls: ["https://www.youtube.com/watch?v=2yjwXTZQDDI"],
        target: "Delts/Triceps",
        cues: ["Press slightly back over ears."],
      },
      {
        name: "Cable Lateral Raise (Behind-Body)",
        videoUrls: ["https://www.youtube.com/watch?v=3VcKaXpzqRo"],
        target: "Side Delts",
        cues: ["Lead with elbows; thumb neutral."],
      },
      {
        name: "Machine Lateral Raise",
        videoUrls: ["https://www.youtube.com/watch?v=3SJ5fQyZJvQ"],
        target: "Side Delts",
        cues: ["Pad mid-forearm; avoid shrug."],
      },
      {
        name: "Rear Delt Fly (Chest-Supported)",
        videoUrls: ["https://www.youtube.com/watch?v=ttvfGg9d76c"],
        target: "Rear Delts",
        cues: ["Hands in line with shoulders."],
      },
      {
        name: "Face Pull (High Anchor)",
        videoUrls: ["https://www.youtube.com/watch?v=rep-qVOkqgk"],
        target: "Rear Delts/Traps",
        cues: ["Rope to eyes; external rotate."],
      },
      {
        name: "Front Raise (Plate/DB)",
        videoUrls: ["https://www.youtube.com/watch?v=-t7fuZ0KhDA"],
        target: "Front Delts",
        cues: ["Raise to shoulder height."],
      },
      {
        name: "Dumbbell Shrugs (Pause Top)",
        videoUrls: ["https://www.youtube.com/watch?v=0UE5GfuzJVw"],
        target: "Upper Traps",
        cues: ["Straight up; 1 sec hold."],
      },
    ],
  },
  {
    day: "Friday",
    focus: "Arms (Biceps + Triceps)",
    icon: Dumbbell,
    part: "arms",
    colorFrom: "from-purple-100",
    colorTo: "to-fuchsia-100",
    exercises: [
      {
        name: "Cable Curl (EZ/Bar)",
        videoUrls: ["https://www.youtube.com/watch?v=ajdFwa-qM98"],
        target: "Biceps",
        cues: ["Pin elbows; control eccentric."],
      },
      {
        name: "Incline DB Curl (Long Head)",
        videoUrls: ["https://www.youtube.com/watch?v=ykJmrZ5v0Oo"],
        target: "Biceps",
        cues: ["Elbows slightly behind torso."],
      },
      {
        name: "Hammer Curl (Cable/Rope)",
        videoUrls: ["https://www.youtube.com/watch?v=zC3nLlEvin4"],
        target: "Brachialis/Forearm",
        cues: ["Neutral grip; no swing."],
      },
      {
        name: "Preacher Curl (Machine/Bench)",
        videoUrls: ["https://www.youtube.com/watch?v=ylpqKp0zdS8"],
        target: "Biceps",
        cues: ["Stretch bottom; smooth top."],
      },
      {
        name: "Overhead Cable Triceps Extension",
        videoUrls: ["https://www.youtube.com/watch?v=_gsUck-7M74"],
        target: "Triceps Long Head",
        cues: ["Elbows tucked; full lockout."],
      },
      {
        name: "Triceps Pushdown (Rope/Bar)",
        videoUrls: ["https://www.youtube.com/watch?v=2-LAMcpzODU"],
        target: "Triceps",
        cues: ["Shoulders down; wrists neutral."],
      },
      {
        name: "Assisted Dip Machine (Triceps Bias)",
        videoUrls: ["https://www.youtube.com/watch?v=6kALZikXxLc"],
        target: "Triceps/Lower Chest",
        cues: ["Upright; elbows track back."],
      },
    ],
  },
  {
    day: "Saturday",
    focus: "Core + Mobility",
    icon: StretchHorizontal,
    part: "core",
    colorFrom: "from-cyan-100",
    colorTo: "to-teal-100",
    exercises: [
      {
        name: "Cable Crunch (Kneeling)",
        videoUrls: ["https://www.youtube.com/watch?v=QjMZ9N8Zp9s"],
        target: "Abs",
        cues: ["Flex spine; ribs to pelvis."],
      },
      {
        name: "Plank (Hard Style)",
        videoUrls: ["https://www.youtube.com/watch?v=BQu26ABuVS0"],
        target: "Core",
        cues: ["Glutes tight; breathe behind brace."],
      },
      {
        name: "Dead Bug",
        videoUrls: ["https://www.youtube.com/watch?v=I1H2lqk7v9k"],
        target: "Core",
        cues: ["Low back pressed down."],
      },
      {
        name: "Hanging Knee/Leg Raise",
        videoUrls: ["https://www.youtube.com/watch?v=l4kQd9eWclE"],
        target: "Lower Abs/Hip Flexors",
        cues: ["Posterior tilt at top."],
      },
      {
        name: "Pallof Press (Anti-Rotation)",
        videoUrls: ["https://www.youtube.com/watch?v=K2VljzCC16g"],
        target: "Obliques",
        cues: ["Don’t rotate; exhale out."],
      },
      {
        name: "Bird Dog",
        videoUrls: ["https://www.youtube.com/watch?v=vzD5dZ0g4eY"],
        target: "Core/Spine",
        cues: ["Hips level; slow tempo."],
      },
      {
        name: "Mobility Flow 10–15 min",
        videoUrls: ["https://www.youtube.com/watch?v=c9EwYb0xwK4"],
        target: "Mobility",
        cues: ["Hips/ankles/thoracic."],
      },
    ],
  },
  {
    day: "Sunday",
    focus: "Rest / Recovery",
    icon: BedDouble,
    part: "full",
    colorFrom: "from-slate-100",
    colorTo: "to-zinc-100",
    exercises: [
      {
        name: "Walk 20–30 min",
        videoUrls: ["https://www.youtube.com/watch?v=8sZNm3tWQNs"],
        target: "Cardio",
        cues: ["Easy pace; nasal breathing."],
      },
      {
        name: "Foam Roll (Lower Body)",
        videoUrls: ["https://www.youtube.com/watch?v=QJLxruO3su0"],
        target: "Recovery",
        cues: ["Slow rolls; pause on tight spots."],
      },
      {
        name: "Shoulder/Spine Mobility",
        videoUrls: ["https://www.youtube.com/watch?v=KpNQfKxCqzA"],
        target: "Mobility",
        cues: ["Move pain-free range only."],
      },
    ],
  },
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
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("embed");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {}
  return null;
}

function parseStartSeconds(url) {
  try {
    const u = new URL(url);
    // support both ?t= and ?start=
    let t = u.searchParams.get("t") || u.searchParams.get("start");
    if (!t) return 0;

    // numeric seconds (e.g., ?t=90)
    if (/^\d+$/.test(t)) return parseInt(t, 10);

    // 1h2m3s / 2m10s / 45s / 08s, etc.
    let sec = 0;
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (m) {
      if (m[1]) sec += 3600 * parseInt(m[1], 10);
      if (m[2]) sec += 60 * parseInt(m[2], 10);
      if (m[3]) sec += parseInt(m[3], 10);
    }
    return sec;
  } catch {
    return 0;
  }
}

function getYouTubeEmbed(url) {
  const id = getYouTubeId(url);
  if (!id) return null;

  const start = parseStartSeconds(url);
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    loop: "1", // loop ON
    playlist: id, // required for loop to work
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
  });
  if (start > 0) params.set("start", String(start));

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/***************************
 * LITE YOUTUBE (thumbnail → iframe on demand)
 ***************************/
function getYouTubeThumb(id) {
  // tries best → fallback
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function LiteYouTube({ url, title }) {
  const id = getYouTubeId(url);
  const start = parseStartSeconds(url);
  const [activated, setActivated] = useState(false);
  const containerRef = useRef(null);

  // Optional: auto-activate when close to viewport (200px)
  useEffect(() => {
    if (!containerRef.current || activated) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // setActivated(true); // keep click-to-play only
            io.disconnect();
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, [activated]);

  if (!id) {
    return (
      <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 grid place-items-center text-xs text-gray-500">
        Invalid YouTube URL
      </div>
    );
  }

  if (!activated) {
    const thumb = getYouTubeThumb(id);
    return (
      <button
        ref={containerRef}
        type="button"
        onClick={() => setActivated(true)}
        className="relative aspect-video w-full overflow-hidden bg-black group"
        aria-label={`Play ${title || "video"}`}
      >
        {/* Poster */}
        <img
          src={thumb}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
          loading="lazy"
          decoding="async"
        />
        {/* Play button */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-full p-3 xs:p-4 sm:p-5 bg-white/90 shadow-lg group-hover:bg-white text-black transition">
            <Play className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
        {/* Small label */}
        <div className="absolute bottom-1.5 right-1.5 text-[9px] xs:text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
          Tap to play
        </div>
      </button>
    );
  }

  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "1",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
  });
  if (start > 0) params.set("start", String(start));

  const src = `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;

  return (
    <iframe
      className="w-full h-full aspect-video"
      src={src}
      title={title || "YouTube video"}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="origin-when-cross-origin"
      allowFullScreen
    />
  );
}

/***************************
 * UI COMPONENTS
 ***************************/
function Header({ selectedIndex, setSelectedIndex, onScrollToExercises }) {
  const goPrev = () => {
    setSelectedIndex((i) => (i + 6) % 7);
    onScrollToExercises();
  };
  const goNext = () => {
    setSelectedIndex((i) => (i + 1) % 7);
    onScrollToExercises();
  };
  const shadow = useScrollShadow();

  return (
    <div
      className={`sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-zinc-950/70 border-b dark:border-zinc-800 transition-shadow ${
        shadow ? "shadow-sm" : ""
      }`}
    >
      {/* Ultra-responsive header row */}
      <div className="max-w-6xl mx-auto px-2 xs:px-3 sm:px-4 py-2.5 xs:py-3 sm:py-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <div className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow flex items-center justify-center text-white font-bold text-xs xs:text-sm sm:text-base">
            GH
          </div>
          <div className="truncate">
            <h1 className="text-base xs:text-lg sm:text-xl font-bold tracking-tight flex items-center gap-1.5 xs:gap-2">
              Gym Helper{" "}
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 hidden xs:block" />
            </h1>
            <p className="text-[10px] xs:text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
              Simple · Hinglish · Beginner-friendly
            </p>
          </div>
        </div>

        {/* Compact pager always visible */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          <button
            onClick={goPrev}
            className="px-2.5 py-1.5 xs:px-3 xs:py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-zinc-800 dark:border-zinc-800"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            className="text-[11px] xs:text-xs sm:text-sm font-medium w-28 xs:w-32 sm:w-40 text-center truncate"
            aria-live="polite"
          >
            {WEEK_PLAN[selectedIndex].day} · {WEEK_PLAN[selectedIndex].focus}
          </div>
          <button
            onClick={goNext}
            className="px-2.5 py-1.5 xs:px-3 xs:py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-zinc-800 dark:border-zinc-800"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DayGrid({ selectedIndex, onSelect, onScrollToExercises }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
      {WEEK_PLAN.map((d, idx) => (
        <button
          key={d.day}
          onClick={() => {
            onSelect(idx);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                onScrollToExercises();
              });
            });
          }}
          className={`text-left rounded-2xl p-3 xs:p-4 border shadow-sm hover:shadow-md transition bg-gradient-to-br ${
            d.colorFrom
          } ${d.colorTo} ${
            idx === selectedIndex ? "ring-2 ring-indigo-400" : ""
          } dark:border-zinc-800 min-h-[84px]`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-400">
                {d.day}
              </div>
              <div className="font-semibold text-sm xs:text-base">
                {d.focus}
              </div>

              <div className="text-[10px] xs:text-[11px] mt-1 text-gray-500 dark:text-gray-400">
                Tap to open
              </div>
            </div>
            <d.icon className="w-8 h-8 xs:w-10 xs:h-10 text-gray-700 dark:text-gray-300 opacity-80" />
          </div>
        </button>
      ))}
    </div>
  );
}

function ExerciseCard({ ex, anchorId }) {
  const cardRef = useRef(null);
  const { setSeconds, setRunning } = useTimer();

  const quickRest = (s) => {
    setSeconds(s);
    setRunning(true);
  };

  const [activeUrlIndex, setActiveUrlIndex] = useState(0);
  const embed = getYouTubeEmbed(ex.videoUrls?.[activeUrlIndex]);

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
      <div className="p-3 xs:p-4 space-y-2.5 xs:space-y-3">
        <div className="flex items-start justify-between gap-2 xs:gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold leading-tight text-sm xs:text-base">
              {ex.name}
            </h4>
            <div className="text-[10px] xs:text-[11px] text-gray-500 dark:text-gray-400">
              Target: {ex.target || "—"}
            </div>
          </div>
          <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                quickRest(60);
              }}
              className="text-[10px] xs:text-xs px-2 py-1 rounded-lg border dark:border-zinc-800"
            >
              Rest 1:00
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                quickRest(90);
              }}
              className="text-[10px] xs:text-xs px-2 py-1 rounded-lg border dark:border-zinc-800"
            >
              1:30
            </button>
          </div>
        </div>

        <ul className="list-disc pl-4 xs:pl-5 text-[13px] xs:text-sm text-gray-700 dark:text-gray-300 space-y-1">
          {ex.cues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>

        <div className="mt-2 rounded-xl overflow-hidden border dark:border-zinc-800">
          {ex.videoUrls?.[activeUrlIndex] ? (
            <LiteYouTube url={ex.videoUrls[activeUrlIndex]} title={ex.name} />
          ) : (
            <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 grid place-items-center text-xs text-gray-500">
              Add a YouTube link in <code>videoUrls</code> to preview
            </div>
          )}
        </div>

        {ex.videoUrls?.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs">
            {ex.videoUrls.map((u, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveUrlIndex(i);
                }}
                className={`px-2 py-1 rounded-lg border dark:border-zinc-800 ${
                  i === activeUrlIndex ? "bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                Alt {i + 1}
              </button>
            ))}
          </div>
        )}

        {ex.videoUrls?.[activeUrlIndex] && (
          <div className="flex items-center gap-2 text-[10px] xs:text-xs">
            <a
              href={ex.videoUrls[activeUrlIndex]}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="w-3 h-3" /> Open on YouTube
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DayDetail({ day, filter }) {
  const filtered = day.exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(filter) ||
      (ex.target || "").toLowerCase().includes(filter)
  );
  return (
    <div className="space-y-3 xs:space-y-4">
      {filtered.map((ex, idx) => (
        <ExerciseCard key={ex.name} ex={ex} anchorId={`${day.day}-${idx}`} />
      ))}
      {filtered.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 border dark:border-zinc-800 rounded-xl p-3 xs:p-4 bg-white dark:bg-zinc-950">
          No exercise matched your search.
        </div>
      )}
    </div>
  );
}

/***************************
 * QUICK TIMER CHIPS / BARS
 ***************************/
function QuickTimerChips() {
  const { setSeconds, setRunning } = useTimer();
  const presets = [45, 60, 90, 120, 180];
  return (
    <div className="flex flex-wrap gap-1.5 xs:gap-2">
      {presets.map((p) => (
        <button
          key={p}
          onClick={() => {
            setSeconds(p);
            setRunning(true);
          }}
          className="px-2.5 xs:px-3 py-1 rounded-full border text-[10px] xs:text-xs bg-white hover:bg-gray-50 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
        >
          {p >= 60
            ? `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`
            : `${p}s`}
        </button>
      ))}
    </div>
  );
}

function TimerSheet() {
  const { seconds, setSeconds, running, setRunning, sheetOpen, setSheetOpen } =
    useTimer();
  const [mins, setMins] = useState(1);
  const [secs, setSecs] = useState(0);

  const start = () => {
    const newVal =
      seconds > 0
        ? seconds
        : Math.max(0, mins) * 60 + Math.max(0, Math.min(59, secs));
    setSeconds(newVal);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const stop = () => {
    setRunning(false);
    setSeconds(0);
  };
  const reset = (v) => {
    setRunning(false);
    setSeconds(v);
  };

  return (
    <AnimatePresence>
      {sheetOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setSheetOpen(false)}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full sm:w-[440px] max-w-[94vw] mx-auto bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-3 xs:p-4 border dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="font-semibold text-sm xs:text-base">
                  Workout Timer
                </div>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                aria-label="Close timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 xs:mt-3 text-5xl xs:text-6xl font-bold tabular-nums text-center tracking-wider">
              {formatMMSS(seconds)}
            </div>

            <div className="mt-3 xs:mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={start}
                className="py-2 rounded-xl shadow border bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Start</span>
              </button>
              <button
                onClick={pause}
                className="py-2 rounded-xl shadow border bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4" />
                <span className="text-sm">Pause</span>
              </button>
              <button
                onClick={stop}
                className="py-2 rounded-xl shadow border bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 dark:border-zinc-800 flex items-center justify-center gap-2"
              >
                <Stop className="w-4 h-4" />
                <span className="text-sm">Stop</span>
              </button>
            </div>

            <div className="mt-3 xs:mt-4 flex items-center justify-between gap-2 xs:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 xs:gap-2 text-sm">
                <span className="text-xs xs:text-sm">Set:</span>
                <input
                  type="number"
                  min={0}
                  value={mins}
                  onChange={(e) => setMins(Number(e.target.value))}
                  className="w-16 xs:w-20 px-2 py-1 rounded-lg border dark:border-zinc-800 dark:bg-zinc-950"
                  aria-label="Minutes"
                />
                :
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={secs}
                  onChange={(e) => setSecs(Number(e.target.value))}
                  className="w-16 xs:w-20 px-2 py-1 rounded-lg border dark:border-zinc-800 dark:bg-zinc-950"
                  aria-label="Seconds"
                />
              </div>
              <div className="flex gap-1.5 xs:gap-2 flex-wrap">
                {[45, 60, 90, 120, 180, 300].map((p) => (
                  <button
                    key={p}
                    onClick={() => reset(p)}
                    className="px-2 py-1 rounded-lg border text-[10px] xs:text-xs bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    {p >= 60
                      ? `${Math.floor(p / 60)}:${String(p % 60).padStart(
                          2,
                          "0"
                        )}`
                      : `${p}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 xs:mt-3 text-[11px] xs:text-xs text-gray-500 dark:text-gray-400">
              Tip: Use quick chips or set exact mm:ss. Timer persists across
              refresh & pages.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FloatingTimerButton() {
  const { setSheetOpen, running, seconds } = useTimer();
  return (
    <button
      onClick={() => setSheetOpen(true)}
      // ⬇️ move a little up on phones so it doesn't collide with MobileBar
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-5 z-50 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-1.5 sm:gap-2 active:scale-[.98] focus:outline-none focus:ring-4 ring-indigo-300 dark:ring-indigo-800"
    >
      <Clock className="w-4 h-4" />
      <span className="font-semibold text-xs sm:text-sm">
        {running ? "Running" : "Timer"} · {formatMMSS(seconds)}
      </span>
    </button>
  );
}

function QuickTimerBar() {
  const { seconds, running } = useTimer();
  return (
    <div className="sticky top-[52px] sm:top-[56px] z-30 bg-white/80 dark:bg-zinc-950/70 backdrop-blur border-b dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 flex items-center gap-2">
        <div className="text-[10px] xs:text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
          Quick Rest:
        </div>
        <QuickTimerChips />
        <div className="ml-auto text-[10px] xs:text-xs text-gray-500 dark:text-gray-400">
          {running ? "Counting" : "Idle"} · {formatMMSS(seconds)}
        </div>
      </div>
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
      <div className="px-2.5 py-2 grid grid-cols-3 gap-1.5 items-center">
        <button
          onClick={onPrev}
          className="px-3 py-2 rounded-xl border dark:border-zinc-800 flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs">Prev</span>
        </button>
        <button
          onClick={() => {
            setSeconds(60);
            setRunning(true);
          }}
          className="px-3 py-2 rounded-xl shadow bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-1.5"
        >
          <Clock className="w-4 h-4" />{" "}
          <span className="text-xs">1:00 Rest</span>
        </button>
        <button
          onClick={onNext}
          className="px-3 py-2 rounded-xl border dark:border-zinc-800 flex items-center justify-center gap-1.5"
        >
          <span className="text-xs">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
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

  const goPrev = () => {
    setSelectedIndex((i) => (i + 6) % 7);
    scrollToExercises();
  };
  const goNext = () => {
    setSelectedIndex((i) => (i + 1) % 7);
    scrollToExercises();
  };

  return (
    <TimerProvider>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-zinc-950 dark:to-zinc-900 text-gray-900 dark:text-gray-100">
        <Header
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onScrollToExercises={scrollToExercises}
        />

        <QuickTimerBar />

        <main className="max-w-6xl mx-auto p-2 xs:p-3 sm:p-4 pb-32 sm:pb-10 space-y-4 xs:space-y-6">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 xs:mb-3">
              <h2 className="text-sm xs:text-base sm:text-lg font-semibold flex items-center gap-1.5 xs:gap-2">
                7-Day Simple Structure{" "}
                <Heart className="w-4 h-4 hidden sm:block" />
              </h2>
              <div className="flex items-center gap-1.5 xs:gap-2">
                <button
                  onClick={goPrev}
                  className="px-2.5 py-1.5 xs:px-3 xs:py-2 rounded-xl border dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goNext}
                  className="px-2.5 py-1.5 xs:px-3 xs:py-2 rounded-xl border dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <DayGrid
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onScrollToExercises={scrollToExercises}
            />
          </section>

          <section
            ref={exerciseSectionRef}
            className="bg-white/70 dark:bg-zinc-950/60 backdrop-blur rounded-2xl border dark:border-zinc-800 p-2.5 xs:p-3 sm:p-4"
          >
            <div className="mb-3 xs:mb-4 flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[210px] flex items-center gap-2 px-2.5 xs:px-3 py-1.5 xs:py-2 rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value.toLowerCase())}
                  placeholder="Search exercise or target (e.g., biceps, chest)..."
                  className="w-full outline-none text-[13px] xs:text-sm bg-transparent"
                />
              </div>
              <div className="text-[12px] xs:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <selectedDay.icon className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8" />
                <span className="font-semibold">{selectedDay.day}:</span>{" "}
                {selectedDay.focus}
              </div>
            </div>
            <DayDetail day={selectedDay} filter={searchText} />
          </section>

          <footer className="py-10 text-[10px] xs:text-[11px] sm:text-xs text-center text-gray-500 dark:text-gray-400">
            Made for beginners · You can add or reorder videoUrls for each
            exercise.
            <br />
            Tip: Use the floating timer button (bottom-right) or quick chips on
            top for instant rest timing.
          </footer>
        </main>

        <MobileBar onPrev={goPrev} onNext={goNext} />
        <FloatingTimerButton />
        <TimerSheet />
      </div>
    </TimerProvider>
  );
}
