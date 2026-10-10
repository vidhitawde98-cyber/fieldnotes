import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2, Clock, PenLine } from "lucide-react";
import { apiFetch, readError } from "../lib/api.js";
import { formatDate, cardTheme } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";
import TagChip from "../components/TagChip.jsx";

export default function MyPostsPage() {
  const [posts, setPosts] = useState(null);
  const { showToast } = useToast();

  function load() {
    apiFetch("/api/posts/mine")
      .then(res => res.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }
  useEffect(load, []);

  async function handleDelete(post) {
    try {
      const res = await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Could not delete this entry"));
      setPosts(prev => prev.filter(p => p._id !== post._id));
      showToast(`Deleted "${post.title}"`, {
        actionLabel: "Undo",
        duration: 7000,
        onAction: async () => {
          const r = await apiFetch(`/api/posts/${post._id}/restore`, { method: "POST" });
          if (r.ok) { showToast("Entry restored ✅"); load(); }
        }
      });
    } catch (err) {
      showToast(err.message);
    }
  }

  if (posts === null) return <p className="font-hand text-xl text-ink-soft text-center py-20">loading your notebook…</p>;

  const drafts = posts.filter(p => p.status === "draft");
  const published = posts.filter(p => p.status === "published");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-display font-extrabold text-3xl text-ink">My notebook</h1>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-ink bg-blush hover:bg-blush-dark font-display font-bold shadow-card-sm hover:-translate-y-0.5 transition-all"
        >
          <PenLine size={15} /> New entry
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 rounded-2xl p-10 text-center">
          <p className="font-hand text-2xl text-ink-soft">nothing written yet — go start a page.</p>
        </div>
      ) : (
        <>
          {drafts.length > 0 && (
            <Section title="Drafts" rows={drafts} onDelete={handleDelete} />
          )}
          {published.length > 0 && (
            <Section title="Published" rows={published} onDelete={handleDelete} />
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, rows, onDelete }) {
  return (
    <div className="mb-8">
      <h2 className="font-display font-bold text-lg text-ink-soft mb-3">{title}</h2>
      <div className="space-y-3">
        {rows.map(post => {
          const theme = cardTheme(post._id);
          return (
            <div
              key={post._id}
              className={`${theme.bg} border-2 border-ink rounded-xl p-4 flex flex-wrap items-center justify-between gap-3`}
            >
              <div className="min-w-0 flex-1">
                <Link to={`/post/${post.slug}`} className="font-display font-bold text-ink hover:underline break-words">
                  {post.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-ink-soft">
                  <span>{formatDate(post.updatedAt)}</span>
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {post.readTimeMinutes} min</span>
                  {post.tags?.slice(0, 2).map(t => <TagChip key={t} label={t} tone="sage" />)}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/edit/${post._id}`}
                  aria-label="Edit entry"
                  title="Edit"
                  className="p-2 rounded-full border-2 border-ink bg-white hover:bg-butter transition-all"
                >
                  <Pencil size={14} />
                </Link>
                <button
                  onClick={() => onDelete(post)}
                  aria-label="Delete entry"
                  title="Delete"
                  className="p-2 rounded-full border-2 border-ink bg-white hover:bg-blush transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
