import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Clock, Pencil, Trash2, User, Send } from "lucide-react";
import { apiFetch, readError } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import TagChip from "../components/TagChip.jsx";

marked.setOptions({ breaks: true });

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setPost(null);
    setNotFound(false);
    apiFetch(`/api/posts/${slug}`).then(async res => {
      if (!active) return;
      if (res.status === 404) return setNotFound(true);
      if (!res.ok) return setNotFound(true);
      setPost(await res.json());
    });
    return () => { active = false; };
  }, [slug]);

  async function handleDelete() {
    if (!post) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Could not delete this entry"));
      showToast(`Deleted "${post.title}"`, {
        actionLabel: "Undo",
        duration: 7000,
        onAction: async () => {
          const r = await apiFetch(`/api/posts/${post._id}/restore`, { method: "POST" });
          if (r.ok) showToast("Entry restored ✅");
        }
      });
      navigate("/my-posts");
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish() {
    if (!post) return;
    setBusy(true);
    const nextStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await apiFetch(`/api/posts/${post._id}`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      if (!res.ok) throw new Error(await readError(res, "Could not update this entry"));
      setPost(await res.json());
      showToast(nextStatus === "published" ? "Published! 🌿" : "Moved back to drafts");
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="font-hand text-3xl text-sage-dark mb-2">page torn out…</p>
        <p className="text-ink-soft mb-6">This entry doesn't exist, isn't published yet, or was removed.</p>
        <Link to="/" className="underline font-bold text-ink">← back to the notebook</Link>
      </div>
    );
  }
  if (!post) {
    return <p className="font-hand text-xl text-ink-soft text-center py-20">loading entry…</p>;
  }

  const html = DOMPurify.sanitize(marked.parse(post.content));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {post.status === "draft" && (
        <div className="bg-butter/70 border-2 border-ink rounded-xl px-4 py-2 text-sm font-bold text-ink mb-6 inline-block">
          📝 This is a draft — only you can see it
        </div>
      )}

      <div className="grid md:grid-cols-[180px_1fr] gap-6 md:gap-10">
        {/* Marginalia sidebar */}
        <aside className="md:border-r-2 md:border-dashed md:border-ink/30 md:pr-6">
          <div className="flex flex-row md:flex-col flex-wrap gap-2 md:gap-3 mb-4">
            {post.tags?.map(t => <TagChip key={t} label={t} tone="sage" />)}
          </div>
          <p className="font-hand text-lg text-sage-dark mb-1">{formatDate(post.publishedAt || post.createdAt)}</p>
          <p className="flex items-center gap-1.5 text-sm text-ink-soft mb-1">
            <Clock size={14} /> {post.readTimeMinutes} min read
          </p>
          {post.author && (
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              <User size={14} /> {post.author.name}
            </p>
          )}

          {post.isOwner && (
            <div className="flex md:flex-col flex-wrap gap-2 mt-5 pt-5 border-t-2 border-dashed border-ink/30">
              <Link
                to={`/edit/${post._id}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-ink rounded-full px-3 py-1.5 hover:bg-butter transition-all"
              >
                <Pencil size={14} /> Edit
              </Link>
              <button
                onClick={togglePublish}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-ink rounded-full px-3 py-1.5 hover:bg-sage transition-all disabled:opacity-60"
              >
                <Send size={14} /> {post.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-bold bg-white border-2 border-ink rounded-full px-3 py-1.5 hover:bg-blush transition-all disabled:opacity-60"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </aside>

        {/* Content */}
        <article>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink leading-tight mb-6">
            {post.title}
          </h1>
          <div className="prose-field max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </div>
  );
}
