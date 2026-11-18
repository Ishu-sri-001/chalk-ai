import { computeTimeline, locate } from "@/lib/playback/timeline";
import { fetchNarration } from "@/lib/playback/narration";
import { DeviceVoice } from "@/lib/playback/device-voice";

const CONCURRENCY = 3;
const QUOTA_CODES = new Set(["PROVIDER_RATE_LIMIT", "RATE_LIMITED"]);

export class LessonPlayer {
  constructor() {
    this.listeners = new Set();
    this.entries = new Map();
    this.current = null;
    this.segmentIndex = 0;
    this.segmentTime = 0;
    this.status = "idle";
    this.mode = "audio";
    this.blocked = false; // browser refused autoplay
    this.voice = "loading";
    this.deviceVoice = null;
    this.speech = { time: 0, at: 0, startedAt: 0, from: 0 };
    this.audioSegment = -1;
    this.audioReady = false;
    this.silentBase = 0;
    this.token = 0;
    this.raf = 0;
    this.destroyed = false;
    this.snapshot = this.buildSnapshot();
    this.audio = null;

    this.onEnded = () => {
      if (this.mode === "audio" && this.status === "playing") this.handleSegmentEnd();
    };
    this.onAudioError = () => {
      if (this.audioSegment < 0 || !this.current || !this.audio) return;
      const media = this.current.media[this.audioSegment];
      if (media?.status === "ready" && this.audio.getAttribute("src")) {
        const failed = this.audioSegment;
        this.audioSegment = -1;
        this.markFailed(this.current, failed);
        if (failed === this.segmentIndex && this.status === "playing") {
          this.startSegment();
          this.emit();
        }
      }
    };
  }

  // Lifecycle
  attach() {
    this.destroyed = false;
    if (!this.audio && typeof Audio !== "undefined") {
      this.audio = new Audio();
      this.audio.preload = "auto";
      this.audio.addEventListener("ended", this.onEnded);
      this.audio.addEventListener("error", this.onAudioError);
    }
    if (!this.deviceVoice && DeviceVoice.isSupported()) {
      this.deviceVoice = new DeviceVoice(() => this.emit());
    }
  }

  get voiceOff() {
    return this.voice === "unavailable" || this.voice === "quota";
  }

  // Subscription
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;

  emit() {
    this.snapshot = this.buildSnapshot();
    for (const fn of this.listeners) fn();
  }

  buildSnapshot() {
    const durations = this.durations();
    const { starts, total } = computeTimeline(durations);
    const media = this.current?.media ?? [];
    const time = (starts[this.segmentIndex] ?? 0) + this.segmentTime;
    return {
      trackId: this.current?.track.id ?? null,
      status: this.status,
      segmentIndex: this.segmentIndex,
      segmentTime: this.segmentTime,
      time: this.status === "ended" ? total : Math.min(time, total),
      total,
      durations,
      starts,
      complete: this.status === "ended",
      blocked: this.blocked,
      voice: this.voice,
      deviceVoice: Boolean(this.deviceVoice?.hasVoices()),
      voicedCount: media.filter((m) => m.status === "ready").length,
      readyCount: media.filter((m) => m.status !== "pending").length,
      segmentCount: media.length,
    };
  }

  durations() {
    if (!this.current) return [];
    return this.current.track.segments.map((s, i) => {
      const m = this.current.media[i];
      return m?.status === "ready" && m.duration ? m.duration : s.estimatedDuration;
    });
  }

  // Tracks
  load(track, { segmentIndex = 0, segmentTime = 0, autoplay = false } = {}) {
    this.stopClock();
    this.token += 1;
    this.audio?.pause();
    this.deviceVoice?.cancel();
    let entry = this.entries.get(track.id);
    if (!entry) {
      entry = {
        track,
        media: track.segments.map(() => ({
          status: this.voiceOff ? "silent" : "pending",
        })),
        controller: new AbortController(),
        inFlight: new Set(),
      };
      this.entries.set(track.id, entry);
    }
    this.current = entry;
    this.audioSegment = -1;
    this.segmentIndex = Math.min(segmentIndex, track.segments.length - 1);
    this.segmentTime = segmentTime;
    this.status = segmentIndex === 0 && segmentTime === 0 ? "idle" : "paused";
    this.blocked = false;
    this.refreshVoiceState();
    this.pump(entry);
    this.emit();
    if (autoplay) this.play();
  }

  // Narration loading
  pump(entry) {
    if (this.destroyed || this.voiceOff) return;
    while (entry.inFlight.size < CONCURRENCY) {
      const i = this.nextToLoad(entry);
      if (i === -1) return;
      entry.inFlight.add(i);
      entry.media[i] = { status: "pending", loading: true };
      fetchNarration(entry.track.segments[i].text, { signal: entry.controller.signal })
        .then(({ url, duration }) => {
          if (this.destroyed) return URL.revokeObjectURL(url);
          entry.media[i] = { status: "ready", url, duration };
          this.onMediaChange(entry, i);
        })
        .catch((error) => {
          if (this.destroyed || error?.name === "AbortError" || this.voiceOff) return;
          if (error?.code === "NOT_CONFIGURED") {
            this.disableVoice("unavailable");
            return;
          }
          if (QUOTA_CODES.has(error?.code)) {
            this.disableVoice("quota");
            return;
          }
          console.warn(`[narration] segment ${i + 1} failed:`, error?.message);
          this.markFailed(entry, i);
        })
        .finally(() => {
          entry.inFlight.delete(i);
          this.pump(entry);
        });
    }
  }

  nextToLoad(entry) {
    const n = entry.media.length;
    const from = entry === this.current ? this.segmentIndex : 0;
    for (let k = 0; k < n; k++) {
      const i = (from + k) % n;
      const m = entry.media[i];
      if (m.status === "pending" && !m.loading) return i;
    }
    return -1;
  }

  markFailed(entry, i) {
    entry.media[i] = { status: "failed" };
    this.onMediaChange(entry, i);
  }

  disableVoice(reason) {
    if (this.voiceOff) return;
    this.voice = reason;
    for (const entry of this.entries.values()) {
      entry.controller.abort();
      entry.media = entry.media.map((m) => (m.status === "ready" ? m : { status: "silent" }));
    }
    if (this.current && (this.status === "buffering" || this.status === "playing")) this.startSegment();
    this.emit();
  }

  onMediaChange(entry, i) {
    if (entry !== this.current) return;
    this.refreshVoiceState();
    if (i === this.segmentIndex && this.status === "buffering") this.startSegment();
    this.emit();
  }

  refreshVoiceState() {
    if (this.voiceOff || !this.current) return;
    const media = this.current.media;
    if (media.some((m) => m.status === "failed")) this.voice = "partial";
    else if (media.every((m) => m.status === "ready")) this.voice = "ready";
    else this.voice = media.some((m) => m.status === "ready") ? "ready" : "loading";
  }

  // Transport
  play() {
    if (!this.current || this.destroyed) return;
    if (this.status === "ended") {
      this.segmentIndex = 0;
      this.segmentTime = 0;
    }
    this.blocked = false;
    this.status = "playing";
    this.startSegment();
    this.startClock();
    this.emit();
  }

  pause() {
    if (this.status !== "playing" && this.status !== "buffering") return;
    this.token += 1; // cancels any pending audio start
    this.audio?.pause();
    this.deviceVoice?.cancel();
    this.status = "paused";
    this.stopClock();
    this.emit();
  }

  toggle() {
    if (this.status === "playing" || this.status === "buffering") this.pause();
    else this.play();
  }

  restart() {
    this.setPosition(0, 0);
    this.play();
  }

  seek(time) {
    const { segmentIndex, segmentTime } = locate(time, this.durations());
    this.setPosition(segmentIndex, segmentTime);
  }

  seekBy(delta) {
    this.seek(this.snapshot.time + delta);
  }

  seekToSegment(index) {
    if (!this.current) return;
    const i = Math.max(0, Math.min(index, this.current.track.segments.length - 1));
    this.setPosition(i, 0);
  }

  skip(delta) {
    if (delta < 0 && this.segmentTime > 2) return this.setPosition(this.segmentIndex, 0);
    this.seekToSegment(this.segmentIndex + delta);
  }

  setPosition(segmentIndex, segmentTime) {
    if (!this.current) return;
    const active = this.status === "playing" || this.status === "buffering";
    this.segmentIndex = segmentIndex;
    this.segmentTime = Math.max(0, segmentTime);
    if (this.status === "ended" || this.status === "idle") this.status = "paused";
    if (active) {
      this.status = "playing";
      this.startSegment();
    } else {
      this.token += 1;
      this.audio?.pause();
      this.deviceVoice?.cancel();
    }
    this.pump(this.current);
    this.emit();
  }

  startSegment() {
    const token = ++this.token;
    const i = this.segmentIndex;
    const media = this.current.media[i];
    this.audioReady = false;
    this.deviceVoice?.cancel();

    if (media.status === "pending") {
      this.audio?.pause();
      this.status = "buffering";
      this.pump(this.current);
      return;
    }
    if (media.status !== "ready" || !this.audio) {
      this.audio?.pause();
      this.status = "playing";
      if (this.deviceVoice?.hasVoices()) {
        this.startSpeech(token);
      } else {
        this.startSilent();
      }
      return;
    }

    this.mode = "audio";
    this.status = "playing";
    const audio = this.audio;
    const offset = this.segmentTime;
    const begin = () => {
      if (token !== this.token) return;
      try {
        audio.currentTime = Math.min(offset, Math.max(0, (audio.duration || offset + 1) - 0.05));
      } catch {}
      this.audioReady = true;
      audio.play().catch((error) => {
        if (token !== this.token) return;
        if (error?.name === "NotAllowedError") {
          this.status = "paused";
          this.blocked = true;
          this.stopClock();
          this.emit();
        } else if (error?.name !== "AbortError") {
          this.markFailed(this.current, i);
          if (token === this.token) this.startSegment();
        }
      });
    };

    if (this.audioSegment !== i) {
      this.audioSegment = i;
      audio.src = media.url;
      audio.addEventListener("loadedmetadata", begin, { once: true });
      audio.load();
    } else if (audio.readyState >= 1) {
      begin();
    } else {
      audio.addEventListener("loadedmetadata", begin, { once: true });
    }
  }

  refreshVoice() {
    if (this.status === "playing" && this.mode === "speech") {
      this.startSegment();
    }
    this.emit();
  }

  startSilent() {
    this.mode = "silent";
    this.silentBase = performance.now() - this.segmentTime * 1000;
  }

  startSpeech(token) {
    const segment = this.current.track.segments[this.segmentIndex];
    const words = segment.text.split(/\s+/).filter(Boolean);
    const duration = this.durations()[this.segmentIndex];
    const fromWord = Math.min(words.length, Math.floor((this.segmentTime / duration) * words.length));
    const now = performance.now();
    this.mode = "speech";
    this.speech = { time: this.segmentTime, at: now, startedAt: now, from: this.segmentTime };

    this.deviceVoice.speak(segment.text, fromWord, {
      onWord: (wordIndex) => {
        if (token !== this.token) return;
        const spokenAt = (wordIndex / Math.max(1, words.length)) * duration;
        this.speech = { ...this.speech, time: Math.max(this.segmentTime, spokenAt), at: performance.now() };
      },
      onEnd: () => {
        if (token !== this.token || this.status !== "playing") return;
        this.handleSegmentEnd();
      },
      onError: (code) => {
        if (token !== this.token) return;
        console.warn("[device voice] falling back to captions:", code);
        this.startSilent();
      },
    });
  }

  handleSegmentEnd() {
    const last = this.current.track.segments.length - 1;
    if (this.segmentIndex < last) {
      this.segmentIndex += 1;
      this.segmentTime = 0;
      this.startSegment();
      this.emit();
    } else {
      this.token += 1;
      this.audio?.pause();
      this.deviceVoice?.cancel();
      this.segmentTime = this.durations()[last];
      this.status = "ended";
      this.stopClock();
      this.emit();
    }
  }

  // Clock
  startClock() {
    if (this.raf || typeof requestAnimationFrame === "undefined") return;
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      if (this.status !== "playing") return;
      const duration = this.durations()[this.segmentIndex];
      if (this.mode === "silent") {
        this.segmentTime = (performance.now() - this.silentBase) / 1000;
        if (this.segmentTime >= duration) return this.handleSegmentEnd();
      } else if (this.mode === "speech") {
        const now = performance.now();
        this.segmentTime = Math.min(this.speech.time + (now - this.speech.at) / 1000, duration * 0.98);
        const expected = duration - this.speech.from;
        if ((now - this.speech.startedAt) / 1000 > expected * 1.8 + 3) return this.handleSegmentEnd();
      } else if (this.audioReady && this.audioSegment === this.segmentIndex) {
        this.segmentTime = this.audio.currentTime;
      }
      this.emit();
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopClock() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // Teardown
  detach() {
    this.destroyed = true;
    this.token += 1;
    this.stopClock();
    this.deviceVoice?.dispose();
    this.deviceVoice = null;
    if (this.audio) {
      this.audio.removeEventListener("ended", this.onEnded);
      this.audio.removeEventListener("error", this.onAudioError);
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    for (const entry of this.entries.values()) {
      entry.controller.abort();
      for (const m of entry.media) if (m.url) URL.revokeObjectURL(m.url);
    }
    this.entries.clear();
    this.current = null;
    this.audioSegment = -1;
    this.status = "idle";
    this.voice = "loading";
  }
}
