const synth = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined"
    ? window.speechSynthesis
    : null;

const NOVELTY = new Set(
  "albert,bad news,bahh,bells,boing,bubbles,cellos,good news,jester,organ,superstar,trinoids,whisper,wobble,zarvox,fred,junior,kathy,ralph,eddy,flo,grandma,grandpa,reed,rocko,sandy,shelley".split(
    ",",
  ),
);
const FEMALE = new Set(
  "samantha,ava,allison,susan,zoe,victoria,karen,moira,tessa,serena,fiona,veena,lekha,catherine,nicky,aria,jenny,emma,michelle,sonia,libby,hazel,zira,neerja,natasha,clara,emily,olivia,sara,heera".split(
    ",",
  ),
);
const MALE = new Set(
  "daniel,alex,tom,evan,nathan,aaron,arthur,rishi,oliver,lee,gordon,guy,andrew,brian,christopher,eric,roger,steffan,ryan,david,mark,george,prabhat,william,liam,thomas,ravi".split(
    ",",
  ),
);

function baseName(name) {
  return name
    .toLowerCase()
    .replace(/^(microsoft|google|apple)\s+/, "")
    .replace(/\s*\(.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
}

function describe(v) {
  const name = v.name;
  const base = baseName(name);
  const first = base.split(/\s+/)[0];
  if (NOVELTY.has(base) || NOVELTY.has(first) || /espeak/i.test(name)) return null;

  let gender = FEMALE.has(first) ? "female" : MALE.has(first) ? "male" : null;
  if (/female/i.test(name)) gender = "female";
  else if (/\bmale\b/i.test(name)) gender = "male";
  else if (/^google us english$/i.test(name)) gender = "female";

  let tier = 20;
  if (/natural|neural|premium|enhanced|online/i.test(name)) tier = 100;
  else if (/^google /i.test(name)) tier = 80;
  else if (gender) tier = 60;

  const region = (v.lang.split(/[-_]/)[1] || "").toUpperCase();
  const accent =
    {
      US: "US",
      GB: "UK",
      AU: "Australian",
      IN: "Indian",
      IE: "Irish",
      ZA: "South African",
      CA: "Canadian",
      NZ: "New Zealand",
    }[region] || region;
  const userRegion = (typeof navigator !== "undefined" ? navigator.language : "")
    .split("-")[1]
    ?.toUpperCase();
  const score =
    tier +
    (region === "US" || region === "GB" ? 5 : 0) +
    (userRegion && region === userRegion ? 8 : 0) +
    (v.default ? 1 : 0);

  const display = name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s*-\s*English.*$/, "");
  return { id: v.voiceURI || name, name: display, lang: v.lang, accent, gender, score, voice: v };
}

export function listVoices() {
  const voices = synth()?.getVoices() ?? [];
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  return english
    .map(describe)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

const PREF_KEY = "chalk-voice";

export function getPreferredVoiceId() {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

export function setPreferredVoiceId(id) {
  try {
    if (id) localStorage.setItem(PREF_KEY, id);
    else localStorage.removeItem(PREF_KEY);
  } catch {}
}

export function currentVoice() {
  const voices = listVoices();
  const preferred = getPreferredVoiceId();
  return voices.find((v) => v.id === preferred) || voices[0] || null;
}

function pickVoice() {
  return currentVoice()?.voice ?? null;
}

export function previewVoice(id, text) {
  const s = synth();
  const entry = listVoices().find((v) => v.id === id);
  if (!s || !entry) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  try {
    u.voice = entry.voice;
    u.lang = entry.voice.lang;
  } catch {}
  s.speak(u);
}

function chunkWords(words, firstWord) {
  const chunks = [];
  let current = [];
  let start = firstWord;
  words.forEach((word, i) => {
    current.push(word);
    const length = current.join(" ").length;
    const sentenceEnd = /[.!?;:]["')\]]?$/.test(word) && length > 40;
    if (sentenceEnd || length > 220 || i === words.length - 1) {
      chunks.push({ words: current, startWord: start });
      start += current.length;
      current = [];
    }
  });
  return chunks;
}

export class DeviceVoice {
  constructor(onVoicesChanged) {
    this.session = 0;
    this.timer = null;
    const s = synth();
    if (s) {
      this.onVoices = () => onVoicesChanged?.();
      s.addEventListener?.("voiceschanged", this.onVoices);
      s.getVoices();
    }
  }

  static isSupported() {
    return Boolean(synth());
  }

  hasVoices() {
    return (synth()?.getVoices().length ?? 0) > 0;
  }

  cancel() {
    this.session += 1;
    clearTimeout(this.timer);
    synth()?.cancel();
  }

  speak(text, fromWord, { onWord, onEnd, onError }) {
    this.cancel();
    const session = this.session;
    const s = synth();
    const words = String(text).split(/\s+/).filter(Boolean);
    const remaining = words.slice(fromWord);
    if (!s || !remaining.length) {
      this.timer = setTimeout(() => session === this.session && onEnd(), 0);
      return;
    }
    const voice = pickVoice();
    const chunks = chunkWords(remaining, fromWord);

    this.timer = setTimeout(() => {
      if (session !== this.session) return;
      try {
        this.queue(s, chunks, voice, session, { onWord, onEnd, onError });
      } catch (error) {
        onError(error?.message || "speech-start-failed");
      }
    }, 60);
  }

  queue(s, chunks, voice, session, { onWord, onEnd, onError }) {
    chunks.forEach((chunk, ci) => {
      const utterance = new SpeechSynthesisUtterance(chunk.words.join(" "));
      if (voice) {
        try {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } catch {
          utterance.lang = "en-US";
        }
      }
      utterance.rate = 1;
      const offsets = [];
      let pos = 0;
      for (const w of chunk.words) {
        offsets.push(pos);
        pos += w.length + 1;
      }
      utterance.onstart = () => session === this.session && onWord(chunk.startWord);
      utterance.onboundary = (e) => {
        if (session !== this.session || (e.name && e.name !== "word")) return;
        let wi = 0;
        while (wi + 1 < offsets.length && offsets[wi + 1] <= e.charIndex) wi++;
        onWord(chunk.startWord + wi);
      };
      utterance.onend = () => {
        if (session === this.session && ci === chunks.length - 1) onEnd();
      };
      utterance.onerror = (e) => {
        if (session !== this.session || e.error === "interrupted" || e.error === "canceled") return;
        onError(e.error || "speech-error");
      };
      s.speak(utterance);
    });
  }

  dispose() {
    this.cancel();
    synth()?.removeEventListener?.("voiceschanged", this.onVoices);
  }
}
