const THEME_KEY = "roster-theme";

export const getStoredTheme = () => {
    return localStorage.getItem(THEME_KEY) || "light";
};

export const applyTheme = (theme) => {
    const root = document.documentElement;

    if (theme === "dark") {
        root.classList.add("dark-theme");
    } else {
        root.classList.remove("dark-theme");
    }

    localStorage.setItem(THEME_KEY, theme);

    window.dispatchEvent(
        new CustomEvent("roster-theme-change", {
            detail: theme,
        })
    );
};

export const initializeTheme = () => {
    applyTheme(getStoredTheme());
};