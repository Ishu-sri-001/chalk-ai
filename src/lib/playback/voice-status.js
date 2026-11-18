let pending = null;

export function getVoiceStatus() {
  if (!pending) {
    pending = fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s?.voice) return { configured: null, signature: null };
        const v = s.voice;
        return {
          configured: Boolean(v.configured),
          signature: v.configured ? `${v.provider}|${v.model}|${v.voice}` : null,
        };
      })
      .catch(() => {
        pending = null;
        return { configured: null, signature: null };
      });
  }
  return pending;
}
