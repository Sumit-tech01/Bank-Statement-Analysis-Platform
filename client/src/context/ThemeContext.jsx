import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "bsa_theme";
const ThemeContext = createContext(null);

const isBrowser = typeof window !== "undefined";

const resolveInitialTheme = () => {
  if (!isBrowser) {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  let theme = "light";

  if (storedTheme === "dark" || storedTheme === "light") {
    theme = storedTheme;
  } else {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return theme;
};

const applyThemeClass = (theme) => {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  const body = window.document.body;
  const appRoot = window.document.getElementById("root");
  const nextIsDark = theme === "dark";

  root.classList.toggle("dark", nextIsDark);
  root.setAttribute("data-theme", nextIsDark ? "dark" : "light");
  body.classList.toggle("dark", nextIsDark);

  if (appRoot) {
    appRoot.classList.toggle("dark", nextIsDark);
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  useEffect(() => {
    applyThemeClass(theme);

    if (isBrowser) {
      window.localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const onSystemPreferenceChange = (event) => {
      const storedTheme = window.localStorage.getItem(THEME_KEY);

      if (storedTheme !== "dark" && storedTheme !== "light") {
        setThemeState(event.matches ? "dark" : "light");
      }
    };

    const onStorage = (event) => {
      if (event.key === THEME_KEY && (event.newValue === "dark" || event.newValue === "light")) {
        setThemeState(event.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    mediaQuery.addEventListener("change", onSystemPreferenceChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      mediaQuery.removeEventListener("change", onSystemPreferenceChange);
    };
  }, []);

  const setTheme = (nextTheme) => {
    if (nextTheme === "dark" || nextTheme === "light") {
      setThemeState(nextTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  };

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider.");
  }

  return context;
};
