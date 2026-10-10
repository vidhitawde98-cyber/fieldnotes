import { Link, NavLink, useNavigate } from "react-router-dom";
import { PenLine, NotebookText, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

function LeafMark({ className = "" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 34C20 34 8 28 8 16C8 9 13 6 20 6C27 6 32 9 32 16C32 28 20 34 20 34Z"
        fill="#A9C0A0"
        stroke="#2B2A28"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 8V30" stroke="#2B2A28" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const navClass = ({ isActive }) =>
  `px-4 py-2 rounded-full border-2 border-ink text-sm font-bold font-display transition-all ${
    isActive ? "bg-ink text-cream" : "bg-white hover:bg-butter"
  }`;

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header>
      <div className="bg-sage-dark text-cream text-xs sm:text-sm font-bold tracking-wide text-center py-1.5 px-3">
        a running log of what I'm building &amp; learning — new entries most weeks ✏️
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <LeafMark className="w-8 h-8 sm:w-9 sm:h-9 -rotate-6" />
          <span className="font-display font-extrabold text-2xl sm:text-3xl text-ink">Fieldnotes</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          {user && (
            <NavLink to="/my-posts" className={navClass}>
              <span className="inline-flex items-center gap-1.5">
                <NotebookText size={15} /> My posts
              </span>
            </NavLink>
          )}
          {user ? (
            <>
              <Link
                to="/new"
                className="px-4 py-2 rounded-full border-2 border-ink bg-blush hover:bg-blush-dark text-sm font-bold font-display inline-flex items-center gap-1.5 shadow-card-sm hover:-translate-y-0.5 transition-all"
              >
                <PenLine size={15} /> Write
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                aria-label="Log out"
                className="p-2 rounded-full border-2 border-ink bg-white hover:bg-butter transition-all"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <NavLink to="/login" className={navClass}>
              Log in
            </NavLink>
          )}
        </nav>
      </div>
      <div className="squiggle" />
    </header>
  );
}
