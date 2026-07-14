import { createContext, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useGetMeQuery } from "@/api/services/users";
import { useLogoutMutation } from "@/api/services/auth";
import { setAccessToken } from "@/api/slices/authSlice";
import { resetAllApiState } from "@/api/resetApiState";

export const AuthContext = createContext({});

// Token in localStorage → hydrated into authSlice on load. If it's present
// we call /me to confirm it's still valid; on 401 the base query drops the
// token and the app falls through to /login on the next render.
const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const accessToken = useSelector((s) => s?.auth?.accessToken);
  const isAuthed = Boolean(accessToken);

  const { data: user, isLoading, isFetching } = useGetMeQuery(undefined, {
    skip: !isAuthed,
  });

  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Server-side logout is best-effort — always clear local state.
    }
    dispatch(setAccessToken(null));
    resetAllApiState(dispatch);
  };

  const value = useMemo(
    () => ({ user, isAuthed, isReady: !isAuthed || (!isLoading && !isFetching), handleLogout }),
    [user, isAuthed, isLoading, isFetching],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
