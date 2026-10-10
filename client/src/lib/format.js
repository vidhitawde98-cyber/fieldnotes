export function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Stable pastel card color per post, based on its id, so colors don't shuffle on reload.
const CARD_THEMES = [
  { bg: "bg-blush", tag: "bg-blush-dark" },
  { bg: "bg-sage", tag: "bg-sage-dark" },
  { bg: "bg-butter", tag: "bg-butter-dark" },
  { bg: "bg-sky", tag: "bg-sky-dark" }
];
export function cardTheme(id) {
  let hash = 0;
  const str = String(id || "");
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return CARD_THEMES[hash % CARD_THEMES.length];
}
