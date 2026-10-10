import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { cardTheme, formatDate } from "../lib/format.js";
import TagChip from "./TagChip.jsx";

export default function PostCard({ post, rotate = true }) {
  const theme = cardTheme(post._id);
  const tilt = rotate ? (post._id.charCodeAt(post._id.length - 1) % 2 === 0 ? "-rotate-1" : "rotate-1") : "";

  return (
    <Link
      to={`/post/${post.slug}`}
      className={`group block ${theme.bg} border-2 border-ink rounded-2xl p-5 shadow-card ${tilt} hover:rotate-0 hover:-translate-y-1 transition-all duration-200`}
    >
      {post.status === "draft" && (
        <span className="inline-block mb-2 text-[11px] font-bold uppercase tracking-wide bg-ink text-cream px-2 py-0.5 rounded-full">
          Draft
        </span>
      )}
      <h3 className="font-display font-extrabold text-xl text-ink leading-snug mb-1.5 group-hover:underline decoration-2 underline-offset-2">
        {post.title}
      </h3>
      <p className="text-sm text-ink-soft mb-3 line-clamp-2">{post.excerpt}</p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {post.tags?.slice(0, 3).map(t => (
          <TagChip key={t} label={t} tone="sage" />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>{formatDate(post.publishedAt || post.createdAt)}</span>
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {post.readTimeMinutes} min read
        </span>
      </div>
    </Link>
  );
}
