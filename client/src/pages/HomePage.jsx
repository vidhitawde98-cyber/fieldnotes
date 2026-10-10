import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, X, PenLine, Sparkles, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/PostCard.jsx";
import TagChip from "../components/TagChip.jsx";

const notes = [
  { mark: "01", title: "Keep a little record", text: "The tiny things are usually the things worth remembering.", color: "pink" },
  { mark: "02", title: "Make room for wonder", text: "A thought can be small and still change your whole day.", color: "sage" },
  { mark: "03", title: "Begin before you're ready", text: "You don't need the perfect words. You just need the first sentence.", color: "butter" },
];

export default function HomePage() {
  const [posts, setPosts] = useState(null);
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const requestId = useRef(0);
  const { user } = useAuth();

  useEffect(() => {
    apiFetch("/api/tags").then(async res => {
      if (!res.ok) throw new Error("Tags unavailable");
      return res.json();
    }).then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    const params = new URLSearchParams({ page: String(page), limit: "9" });
    if (query.trim()) params.set("q", query.trim());
    if (activeTag) params.set("tag", activeTag);
    const t = setTimeout(() => {
      apiFetch(`/api/posts?${params.toString()}`)
        .then(async res => {
          if (!res.ok) throw new Error("We couldn't load the stories. Check that the API is running and try again.");
          return res.json();
        })
        .then(data => {
          if (id === requestId.current) {
            // Supports both the paginated API and an older local backend.
            setPosts(Array.isArray(data) ? data : data.posts || []);
            setPages(Array.isArray(data) ? 1 : data.pages || 1);
            setError("");
          }
        })
        .catch(err => { if (id === requestId.current) { setError(err.message); setPosts([]); } });
    }, 220);
    return () => clearTimeout(t);
  }, [query, activeTag, page]);

  function updateQuery(value) { setQuery(value); setPage(1); }
  function updateTag(value) { setActiveTag(value); setPage(1); }

  return (
    <div className="fieldnotes-home">
      <section className="editorial-hero">
        <div className="hero-sticker sticker-one" aria-hidden="true">a place to<br/>put your thoughts ✳</div>
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot"/> AN ONLINE JOURNAL FOR THE CURIOUS</p>
          <h1>Little thoughts.<br/><em>Long</em> stories.</h1>
          <p className="hero-description">A soft corner of the internet for things you notice, lessons you're learning, and stories you don't want to lose.</p>
          <div className="hero-actions">
            <a href="#latest" className="button-primary">Read the notes <ArrowDownRight size={17}/></a>
            {user ? <Link to="/new" className="button-secondary"><PenLine size={16}/> Write something</Link> : <Link to="/login" className="button-secondary"><PenLine size={16}/> Start a note</Link>}
          </div>
          <p className="hero-footnote">made slowly, read whenever ✿</p>
        </div>
        <div className="hero-art" aria-label="Decorative journal illustration">
          <div className="art-sun"/><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
          <div className="art-paper"><span className="paper-label">FIELD NOTES / NO. 001</span><span className="paper-flower">✳</span><strong>things<br/>worth<br/><i>keeping.</i></strong><span className="paper-line"/><span className="paper-caption">thoughts from an ordinary day</span></div>
          <span className="art-spark spark-a">✳</span><span className="art-spark spark-b">✴</span><span className="art-hand">dear diary,</span>
        </div>
        <div className="hero-side-note">ISSUE 01 <span>·</span> MADE OF WORDS</div>
      </section>

      <section className="prompt-strip" aria-label="Writing prompts">
        <div className="prompt-intro"><Sparkles size={17}/><span>A LITTLE NUDGE TO BEGIN</span></div>
        {notes.map(note => <div key={note.mark} className={`prompt-note prompt-${note.color}`}><span>{note.mark}</span><div><strong>{note.title}</strong><p>{note.text}</p></div></div>)}
      </section>

      <section id="latest" className="latest-section">
        <div className="section-heading">
          <div><p className="eyebrow">THE GOOD STUFF</p><h2>Fresh from the <em>notebook.</em></h2><p className="section-subtitle">Small discoveries, big feelings, and everything in between.</p></div>
          <div className="post-count"><BookOpen size={16}/><span>{posts === null ? "..." : `${posts.length}${pages > 1 ? "+" : ""} stories`}</span></div>
        </div>
        <div className="feed-tools">
          <div className="feed-tags"><TagChip label="everything" tone="butter" active={!activeTag} onClick={() => updateTag("")}/>{tags.map(t => <TagChip key={t} label={t} tone="butter" active={activeTag === t} onClick={() => updateTag(activeTag === t ? "" : t)}/>)}</div>
          <label className="feed-search"><Search size={16}/><input value={query} onChange={e => updateQuery(e.target.value)} placeholder="Find a little something…" aria-label="Search stories"/>{query && <button onClick={() => updateQuery("")} aria-label="Clear search"><X size={15}/></button>}</label>
        </div>
        {error && <div className="feed-message feed-error"><strong>Oh, crumbs.</strong><span>{error}</span><button onClick={() => window.location.reload()}>Try again <ArrowUpRight size={15}/></button></div>}
        {posts === null ? <div className="loading-grid">{[1,2,3].map(n => <div className="post-skeleton" key={n}/>)}</div> : posts.length === 0 ? (
          <div className="empty-editorial"><div className="empty-doodle">✳</div><p className="eyebrow">A FRESH PAGE</p><h3>{query || activeTag ? "Nothing on this page just yet." : "The notebook is waiting for its first story."}</h3><p>{query || activeTag ? "Try another search or clear your filters." : "Once a story is published, it will find its way here. Until then, consider this your invitation to begin."}</p><div className="empty-actions">{(query || activeTag) && <button className="button-secondary" onClick={() => {updateQuery("");updateTag("");}}>Clear filters</button>}<Link className="button-primary" to={user ? "/new" : "/login"}><PenLine size={16}/> Write the first story</Link></div></div>
        ) : <><div className="editorial-post-grid">{posts.map((post, index) => <PostCard key={post._id} post={post} />)}</div>{pages > 1 && <div className="pagination"><button disabled={page <= 1} onClick={() => {setPage(p => p - 1);document.getElementById("latest")?.scrollIntoView({behavior:"smooth"});}}>← Newer</button><span>PAGE {page} / {pages}</span><button disabled={page >= pages} onClick={() => {setPage(p => p + 1);document.getElementById("latest")?.scrollIntoView({behavior:"smooth"});}}>Older →</button></div>}</>}
      </section>
      <section className="closing-note"><span className="closing-flower">✳</span><p>YOU DON'T HAVE TO HAVE IT ALL FIGURED OUT.</p><h2>Just start with <em>one sentence.</em></h2><Link to={user ? "/new" : "/login"}>Make a little room to write <ArrowUpRight size={16}/></Link></section>
    </div>
  );
}
