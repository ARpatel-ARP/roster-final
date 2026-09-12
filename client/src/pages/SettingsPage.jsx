import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme,  } from "../../utils/theme.js";

function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [darkMode, setDarkMode] = useState(
  () => getStoredTheme() === "dark"
);

useEffect(() => {
  const handleThemeChange = (event) => {
    setDarkMode(event.detail === "dark");
  };

  window.addEventListener("roster-theme-change", handleThemeChange);

  return () => {
    window.removeEventListener(
      "roster-theme-change",
      handleThemeChange
    );
  };
}, []);

  const toggleDarkMode = () => {
    const nextTheme = darkMode ? "light" : "dark";

    setDarkMode(!darkMode);
    applyTheme(nextTheme);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage application preferences and notification settings.
        </p>
      </div>

      {/* Preferences */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Preferences
        </h2>

        <div className="mt-5 divide-y divide-slate-100">
          <SettingToggle
            title="Notifications"
            description="Receive notifications for roster and leave updates."
            enabled={notificationsEnabled}
            onChange={setNotificationsEnabled}
          />

          <SettingToggle
            title="Dark mode"
            description="Use a black and white theme across the application."
            enabled={darkMode}
            onChange={toggleDarkMode}
          />

          <SettingToggle
            title="Compact mode"
            description="Use a more compact layout for roster information."
            enabled={compactMode}
            onChange={setCompactMode}
          />
        </div>
      </section>

      {/* Application */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Application
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Roster Management System
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Manage employees, teams, leaves and roster schedules.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
              Application Version
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              1.0.0
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}) {
  return (
    <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-slate-900" : "bg-slate-300"
          }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"
            }`}
        />
      </button>
    </div>
  );
}

export default SettingsPage;