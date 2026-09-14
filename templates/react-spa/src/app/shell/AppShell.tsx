import type { ReactNode } from "react";
import { messages } from "../../core/i18n/messages";
import { useTheme } from "../providers/ThemeProvider";
import styles from "./AppShell.module.scss";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>{messages.appName}</span>
        <button
          className={styles.themeButton}
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "light" ? messages.enableDarkTheme : messages.enableLightTheme}
        >
          {theme === "light" ? messages.darkTheme : messages.lightTheme}
        </button>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
