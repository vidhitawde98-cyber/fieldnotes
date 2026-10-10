export default function TagChip({ label, active, onClick, tone = "sage" }) {
  const toneClass = {
    sage: active ? "bg-sage-dark text-cream" : "bg-sage/60 text-ink hover:bg-sage",
    blush: active ? "bg-blush-dark text-cream" : "bg-blush/60 text-ink hover:bg-blush",
    butter: active ? "bg-butter-dark text-cream" : "bg-butter/60 text-ink hover:bg-butter"
  }[tone];

  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border border-ink/70 transition-all ${toneClass}`}
    >
      #{label}
    </Comp>
  );
}
