import { Alert, CssBaseline, Snackbar, ThemeProvider, useMediaQuery } from "@mui/material";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createAppTheme } from "../theme";

type Mode = "light" | "dark";
type Notice = { message: string; severity: "success" | "error" | "info" | "warning" };

const ColorModeContext = createContext<{ mode: Mode; toggle: () => void; setMode: (m: Mode) => void }>(null!);
const NotifyContext = createContext<(message: string, severity?: Notice["severity"]) => void>(() => {});

const STORAGE_KEY = "healthtrack-theme"; // yalnızca tema tercihi (hassas veri değil)

function readStoredMode(): Mode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setModeState] = useState<Mode>(() => readStoredMode() ?? (prefersDark ? "dark" : "light"));
  const [notice, setNotice] = useState<Notice | null>(null);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* depolama kapalı olabilir */
    }
  }, []);
  const toggle = useCallback(() => setMode(mode === "dark" ? "light" : "dark"), [mode, setMode]);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const notify = useCallback((message: string, severity: Notice["severity"] = "success") =>
    setNotice({ message, severity }), []);

  return (
    <ColorModeContext.Provider value={{ mode, toggle, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotifyContext.Provider value={notify}>
          {children}
          <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
            <Alert severity={notice?.severity ?? "info"} variant="filled" onClose={() => setNotice(null)}
              sx={{ borderRadius: 2 }}>
              {notice?.message}
            </Alert>
          </Snackbar>
        </NotifyContext.Provider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export const useColorMode = () => useContext(ColorModeContext);
export const useNotify = () => useContext(NotifyContext);
