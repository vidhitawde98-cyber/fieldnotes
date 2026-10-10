import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, checkingAuth } = useAuth();
  const location = useLocation();

  if (checkingAuth) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
