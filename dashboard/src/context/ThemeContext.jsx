import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getProfile } from "../utils/api";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [theme, setTheme] = useState("light");

  // Fetch initial theme from the API when user logs in
  useEffect(() => {
    let mounted = true;

    const fetchUserTheme = async () => {
      if (!token) return;
      try {
        const data = await getProfile();
        const colorTheme = data?.user?.preferences?.colorTheme || "light";
        if (mounted) {
          setTheme(colorTheme);
        }
      } catch (error) {
        console.error("Failed to fetch user theme", error);
      }
    };

    fetchUserTheme();

    return () => {
      mounted = false;
    };
  }, [token]);

  // Apply theme to the document element whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    // Also save to local storage as a fallback for faster loads before API returns
    localStorage.setItem("neuroadapt-theme", theme);
  }, [theme]);

  // Initial load from local storage before API responds
  useEffect(() => {
    const savedTheme = localStorage.getItem("neuroadapt-theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
