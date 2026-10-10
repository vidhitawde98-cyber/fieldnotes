import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import SiteHeader from "./components/SiteHeader.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import HomePage from "./pages/HomePage.jsx";
import PostPage from "./pages/PostPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import MyPostsPage from "./pages/MyPostsPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/post/:slug" element={<PostPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/new" element={<RequireAuth><EditorPage /></RequireAuth>} />
              <Route path="/edit/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
              <Route path="/my-posts" element={<RequireAuth><MyPostsPage /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="text-center text-xs text-ink-soft py-6 font-body">
            Made with 🍃 using React, Node.js &amp; MongoDB
          </footer>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="font-hand text-3xl text-sage-dark mb-2">page torn out…</p>
      <p className="text-ink-soft">That page doesn't exist.</p>
    </div>
  );
}
