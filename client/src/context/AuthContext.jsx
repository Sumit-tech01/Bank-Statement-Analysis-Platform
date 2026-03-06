import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { TOKEN_KEY, setUnauthorizedHandler } from "../api/api.js";

const AuthContext = createContext(null);
const PROFILE_OVERRIDE_KEY = "bsa_profile_override";

const extractMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const readProfileOverride = () => {
  try {
    const raw = localStorage.getItem(PROFILE_OVERRIDE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_OVERRIDE_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    const nextToken = response?.data?.data?.token;
    const nextUser = response?.data?.data?.user;

    if (!nextToken || !nextUser) {
      throw new Error("Invalid login response.");
    }

    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    const profileOverride = readProfileOverride();
    setUser({ ...nextUser, ...profileOverride });
    return nextUser;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    const nextToken = response?.data?.data?.token;
    const nextUser = response?.data?.data?.user;

    if (!nextToken || !nextUser) {
      throw new Error("Invalid register response.");
    }

    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    const profileOverride = readProfileOverride();
    setUser({ ...nextUser, ...profileOverride });
    return nextUser;
  };

  const updateUserProfile = (updates) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      const nextUser = { ...current, ...updates };
      localStorage.setItem(
        PROFILE_OVERRIDE_KEY,
        JSON.stringify({
          name: nextUser.name,
          email: nextUser.email,
          avatar: nextUser.avatar || "",
        })
      );
      return nextUser;
    });
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (!token) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get("/auth/me");
        const currentUser = response?.data?.data?.user || response?.data?.data;
        const profileOverride = readProfileOverride();

        if (active && currentUser) {
          setUser({ ...currentUser, ...profileOverride });
        }
      } catch (_error) {
        if (active) {
          logout();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      updateUserProfile,
      getErrorMessage: extractMessage,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider.");
  }

  return context;
};
