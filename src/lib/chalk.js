export function resetLabel(resetsAt) {
  if (!resetsAt) return null;
  const at = new Date(resetsAt);
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return at.toDateString() === new Date().toDateString() ? time : `tomorrow at ${time}`;
}

export function arrivesPhrase(resetsAt) {
  const label = resetLabel(resetsAt);
  if (!label) return "";
  return label.startsWith("tomorrow") ? label : `at ${label}`;
}

export function chalkHeadline(daily) {
  const n = daily.remaining;
  if (n <= 0) return "Out of chalk for today";
  if (n === 1) return "Your last stick of chalk for today";
  if (n <= 3) return `Only ${n} sticks of chalk left today`;
  return `${n} sticks of chalk left today`;
}

export const chalkTone = (remaining) => (remaining <= 0 ? "empty" : remaining <= 3 ? "low" : "ok");
