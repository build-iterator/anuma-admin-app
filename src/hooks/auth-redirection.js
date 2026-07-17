import { useContext, useEffect } from "react";
import { useNavigate } from "react-router";

import { AuthContext } from "@/providers/AuthProvider";

// Push unauthenticated users to /login. Waits for AuthContext.isReady so
// we don't bounce during the /me confirmation on refresh.
export function useAuthRedirection() {
  const navigate = useNavigate();
  const { isAuthed, isReady } = useContext(AuthContext);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthed) navigate("/login", { replace: true });
  }, [isAuthed, isReady, navigate]);

  return { isReady };
}
