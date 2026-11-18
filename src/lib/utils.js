import { clsx, twMerge } from "cn";

const TEXT_SIZE = /^((?:[\w-]+:)*)text-(84|48|30|24|21|19|17)$/;

export function cn(...inputs) {
  const sizes = new Map();
  const rest = [];
  for (const token of clsx(...inputs).split(/\s+/)) {
    if (!token) continue;
    const match = token.match(TEXT_SIZE);
    if (match) {
      sizes.delete(match[1]);
      sizes.set(match[1], token);
    } else {
      rest.push(token);
    }
  }
  return [twMerge(rest.join(" ")), ...sizes.values()].filter(Boolean).join(" ");
}
