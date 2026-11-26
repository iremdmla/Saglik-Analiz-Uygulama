// Merkezi tasarım sistemi: renkler, tipografi, köşe yarıçapları ve bileşen stilleri.
import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

export const tokens = {
  radius: 16,
  brand: { light: "#0E9384", dark: "#2ED3B7" },
  accent: { light: "#6172F3", dark: "#8098F9" },
  status: {
    normal: "#12B76A",
    low: "#F79009",
    high: "#F04438",
    unknown: "#98A2B3",
  },
  chart: ["#0E9384", "#6172F3", "#F79009", "#EE46BC", "#2E90FA", "#875BF7"],
};

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  const primary = dark ? tokens.brand.dark : tokens.brand.light;
  const divider = dark ? "rgba(148,163,184,0.14)" : "#E6EAF0";

  return createTheme({
    palette: {
      mode,
      primary: { main: primary, contrastText: dark ? "#04201C" : "#FFFFFF" },
      secondary: { main: dark ? tokens.accent.dark : tokens.accent.light },
      success: { main: tokens.status.normal },
      warning: { main: tokens.status.low },
      error: { main: tokens.status.high },
      background: dark
        ? { default: "#0A1120", paper: "#101A2C" }
        : { default: "#F4F7FA", paper: "#FFFFFF" },
      text: dark
        ? { primary: "#E6EDF7", secondary: "#94A3B8" }
        : { primary: "#101828", secondary: "#5B6779" },
      divider,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      h4: { fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700, letterSpacing: "-0.01em" },
      h6: { fontWeight: 700, fontSize: "1.05rem" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: "0.08em" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: "antialiased" },
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-thumb": { background: alpha("#94A3B8", 0.35), borderRadius: 8 },
        },
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius,
            border: `1px solid ${divider}`,
            boxShadow: dark ? "none" : "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.04)",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10, paddingInline: 16 } },
      },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiSelect: { defaultProps: { size: "small" } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: tokens.radius } } },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em",
                  color: dark ? "#94A3B8" : "#5B6779" },
          root: { borderColor: divider },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontSize: "0.75rem" } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 10 } } },
    },
  });
}

export const statusMeta: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: tokens.status.normal },
  low: { label: "Düşük", color: tokens.status.low },
  high: { label: "Yüksek", color: tokens.status.high },
  unknown: { label: "Referanssız", color: tokens.status.unknown },
};
