// Text fitting. The Ink web runtime does not clip long single-line text (found
// while building the sibling ClaudeCodeGlasses Page), so every string is checked
// against a width budget instead. One unit is about one Latin character at
// 12 px; CJK and full-width characters count as two.

export function charUnits(ch) {
  const code = ch.codePointAt(0);
  if (code >= 0x2e80 && code <= 0xa4cf) return 2;
  if (code >= 0xac00 && code <= 0xd7a3) return 2;
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  if (code >= 0xfe30 && code <= 0xfe6f) return 2;
  if (code >= 0xff00 && code <= 0xff60) return 2;
  if (code >= 0xffe0 && code <= 0xffe6) return 2;
  return 1;
}

export function textUnits(value) {
  const chars = Array.from(String(value || ''));
  let units = 0;
  for (let i = 0; i < chars.length; i += 1) units += charUnits(chars[i]);
  return units;
}

// Returns `value` unchanged when it fits, otherwise a prefix ending in '…'.
export function fitText(value, maxUnits) {
  const text = String(value || '');
  if (textUnits(text) <= maxUnits) return text;
  const chars = Array.from(text);
  let out = '';
  let units = 0;
  for (let i = 0; i < chars.length; i += 1) {
    const u = charUnits(chars[i]);
    if (units + u > maxUnits - 1) break;
    out += chars[i];
    units += u;
  }
  return out.replace(/\s+$/, '') + '…';
}
