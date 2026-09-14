import { HomePage } from "../features/home/ui/HomePage";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AppShell } from "./shell/AppShell";

export function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <HomePage />
      </AppShell>
    </ThemeProvider>
  );
}
