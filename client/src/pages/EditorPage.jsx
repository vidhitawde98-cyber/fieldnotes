import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Eye, EyeOff, X, Bold, Italic, Heading2, List, ListOrdered, Quote, Link2, Code2, Save, Clock3, ArrowLeft, Maximize2 } from "lucide-react";
import { apiFetch, readError } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

marked.setOptions({ breaks: true, gfm: true });
const tools = [
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "_", after: "_" },
  { label: "Heading", icon: Heading2, before: "## ", after: "", line: true },
  { label: "Bulleted list", icon: List, before: "- ", after: "", line: true },
  { label: "Numbered list", icon: ListOrdered, before: "1. ", after: "", line: true },
  { label: "Quote", icon: Quote, before: "> ", after: "", line: true },
  { label: "Link", icon: Link2, before: "[link text](", after: ")" },
  { label: "Code", icon: Code2, before: "`", after: "`" },
];

export default function EditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const textareaRef = useRef(null);
  const initialRef = useRef("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);
  const [slug, setSlug] = useState(null);
  const [status, setStatus] = useState("draft");
  const [lastSaved, setLastSaved] = useState("");
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const dirty = `${title}\n${content}\n${tags.join(",")}` !== initialRef.current;

  useEffect(() => {
    if (!isEditing) { initialRef.current = "\n\n"; return; }
    let active = true;
    apiFetch("/api/posts/mine")
      .then(async res => { if (!res.ok) throw new Error(await readError(res, "Could not load your posts")); return res.json(); })
      .then(posts => {
        if (!active) return;
        const post = posts.find(p => p._id === id);
        if (!post) setError("This entry could not be found, or you don't have permission to edit it.");
        else {
          setTitle(post.title); setContent(post.content); setTags(post.tags || []); setSlug(post.slug); setStatus(post.status || "draft");
          initialRef.current = `${post.title}\n${post.content}\n${(post.tags || []).join(",")}`;
        }
        setLoaded(true);
      }).catch(err => { if (active) { setError(err.message || "Could not load this entry"); setLoaded(true); } });
    return () => { active = false; };
  }, [id, isEditing]);

  useEffect(() => {
    const handler = e => { if (dirty && !saving) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving]);

  function insertMarkdown(tool) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = content.slice(start, end) || (tool.label === "Link" ? "link text" : "your text");
    const prefix = tool.line && start > 0 && content[start - 1] !== "\n" ? "\n" : "";
    const insertion = `${prefix}${tool.before}${selected}${tool.after}`;
    const next = content.slice(0, start) + insertion + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => { el.focus(); const cursor = start + insertion.length; el.setSelectionRange(cursor, cursor); });
  }
  function addTagFromInput() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, "").replace(/[^a-z0-9-]/g, "-").slice(0, 30);
    if (t && !tags.includes(t) && tags.length < 8) setTags(old => [...old, t]);
    setTagInput("");
  }
  function removeTag(t) { setTags(old => old.filter(x => x !== t)); }

  async function save(nextStatus) {
    setError("");
    if (!title.trim()) return setError("Give your entry a title before saving.");
    if (!content.trim()) return setError("Write a few words before saving.");
    if (title.trim().length > 150) return setError("Keep the title under 150 characters.");
    if (content.length > 50000) return setError("This entry is too long. Please keep it under 50,000 characters.");
    setSaving(true);
    try {
      const body = { title: title.trim(), content, tags, status: nextStatus };
      const res = isEditing ? await apiFetch(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify(body) }) : await apiFetch("/api/posts", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await readError(res, "Could not save this entry. Please try again."));
      const saved = await res.json();
      setSlug(saved.slug); setStatus(saved.status); setLastSaved(new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
      initialRef.current = `${title.trim()}\n${content}\n${tags.join(",")}`;
      showToast(nextStatus === "published" ? "Your story is out in the world ✿" : "Draft tucked away safely");
      navigate(nextStatus === "published" ? `/post/${saved.slug}` : "/my-posts");
    } catch (err) { setError(err.message || "Something went wrong while saving."); }
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="editor-loading">Opening your notebook…</div>;
  const html = DOMPurify.sanitize(marked.parse(content || "*Your words will appear here as you write.*"), { USE_PROFILES: { html: true } });

  return <div className={`writing-studio ${focusMode ? "focus-mode" : ""}`}>
    <div className="studio-topbar"><button className="studio-back" onClick={() => { if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) return; navigate(-1); }}><ArrowLeft size={16}/> Back</button><div className="studio-breadcrumb">FIELDNOTES <span>/</span> YOUR WRITING DESK</div><button className="focus-toggle" onClick={() => setFocusMode(v => !v)}><Maximize2 size={15}/>{focusMode ? "Exit focus" : "Focus mode"}</button></div>
    <header className="studio-heading"><div><p className="eyebrow">A FRESH PAGE, JUST FOR YOU</p><h1>{isEditing ? "Back to your story." : "Let's put it into words."}</h1><p>Don't worry about making it perfect. Just make it yours.</p></div><div className={`save-status ${dirty ? "unsaved" : "saved"}`}><span/>{saving ? "Saving…" : dirty ? "Unsaved changes" : lastSaved ? `Saved at ${lastSaved}` : "Ready when you are"}</div></header>
    {error && <div role="alert" className="studio-error">{error}</div>}
    <div className="studio-meta"><div className="studio-title-wrap"><label htmlFor="entry-title">YOUR STORY TITLE</label><input id="entry-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="A little space to think…" maxLength={150}/><div className="title-counter">{title.length}/150</div></div><div className="studio-tags"><label>FILE UNDER</label><div className="tag-entry">{tags.map(t => <span className="editor-tag" key={t}>#{t}<button onClick={() => removeTag(t)} aria-label={`Remove ${t}`}><X size={12}/></button></span>)}<input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => {if (e.key === "Enter" || e.key === ",") {e.preventDefault();addTagFromInput();}}} onBlur={addTagFromInput} placeholder={tags.length ? "+ add tag" : "journal, life, ideas…"}/></div><small>Up to 8 tags · press Enter to add</small></div></div>
    <div className="editor-toolbar"><div className="toolbar-label">THE WORDS</div><div className="toolbar-buttons">{tools.map(tool => <button type="button" key={tool.label} title={tool.label} aria-label={tool.label} onClick={() => insertMarkdown(tool)}><tool.icon size={16}/></button>)}</div><button className="preview-toggle" onClick={() => setShowPreview(v => !v)}>{showPreview ? <EyeOff size={15}/> : <Eye size={15}/>} {showPreview ? "Hide preview" : "Show preview"}</button></div>
    <div className={`studio-workspace ${showPreview ? "with-preview" : "write-only"}`}><section className="writing-pane"><div className="pane-label"><span>✎ &nbsp; YOUR DRAFT</span><span>MARKDOWN FRIENDLY</span></div><textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)} placeholder={"Start anywhere.\n\nA small moment, a big feeling, a thing you learned…\n\nYou can use Markdown, or tap the tools above."} maxLength={50000} aria-label="Write your blog post"/><div className="writing-stats"><span>{wordCount} words</span><span><Clock3 size={13}/> {readTime} min read</span><span>{content.length.toLocaleString()} / 50,000</span></div></section>{showPreview && <section className="preview-pane"><div className="pane-label"><span>◉ &nbsp; THE READER'S VIEW</span><span>LIVE PREVIEW</span></div><article className="prose-field preview-article">{title.trim() && <h1>{title}</h1>}<div dangerouslySetInnerHTML={{__html:html}}/></article><div className="preview-signoff">— end of this little note —</div></section>}</div>
    <footer className="studio-footer"><div className="footer-note"><span className="footer-flower">✳</span><div><strong>{status === "published" ? "A story already in the world" : "Your thoughts are safe here"}</strong><p>{dirty ? "Save your changes before leaving." : "Take your time. There is no rush."}</p></div></div><div className="studio-actions"><button className="studio-draft" disabled={saving} onClick={() => save("draft")}><Save size={15}/>{saving ? "Saving…" : "Save draft"}</button><button className="studio-publish" disabled={saving} onClick={() => save("published")}>{saving ? "Saving…" : status === "published" ? "Update story ↗" : "Publish story ↗"}</button></div></footer>
  </div>;
}
