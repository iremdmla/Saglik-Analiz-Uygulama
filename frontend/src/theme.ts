/*
 * HealthTrack "Pulse" tasarım sistemi
 * ------------------------------------------------------------------
 * Renk rolleri (her rengin tek bir anlamı vardır):
 *  teal    → marka, birincil eylemler, aktif menü, sağlıklı akış
 *  navy    → sidebar, koyu yüzeyler, başlık metinleri (güven/derinlik)
 *  blue    → bilgi, ikincil veri serileri, biyokimya
 *  violet  → yapay zekâ, analiz ve içgörüler, tiroid
 *  green   → "normal" durum, olumlu değişim
 *  amber   → "düşük" durum, dikkat, vitaminler
 *  coral   → "yüksek" durum, uyarılar, hemogram, raporlar
 *  pink    → vital bulgular (tansiyon, nabız)
 */
import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

export const palette = {
  teal: "#14B8A6",
  tealDeep: "#0D9488",
  navy: "#0B1533",
  navy2: "#13204A",
  blue: "#3B82F6",
  violet: "#8B5CF6",
  lavender: "#C4B5FD",
  green: "#22C55E",
  amber: "#F59E0B",
  coral: "#F97362",
  pink: "#EC4899",
  slate: "#94A3B8",
};

export const gradients = {
  brand: `linear-gradient(135deg, ${palette.teal} 0%, ${palette.blue} 100%)`,
  hero: `linear-gradient(125deg, #0B1533 0%, #0E3B5C 38%, #0D9488 72%, #6D5BD0 100%)`,
  aurora: `linear-gradient(135deg, ${palette.violet} 0%, ${palette.blue} 50%, ${palette.teal} 100%)`,
  violet: `linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)`,
  coral: `linear-gradient(135deg, #F97362 0%, #FB923C 100%)`,
  green: `linear-gradient(135deg, #16A34A 0%, #2DD4BF 100%)`,
  sidebar: `linear-gradient(180deg, #0B1533 0%, #0E1B40 60%, #10224F 100%)`,
};

export const tokens = {
  radius: 20,
  status: { normal: palette.green, low: palette.amber, high: palette.coral, unknown: palette.slate },
  chart: [palette.teal, palette.violet, palette.blue, palette.coral, palette.amber, palette.pink],
};

/** Her ölçüm kategorisinin sabit rengi – listelerde, grafiklerde ve ikonlarda kullanılır. */
export const categoryColor: Record<string, string> = {
  Hemogram: palette.coral,
  Biyokimya: palette.blue,
  Şeker: palette.blue,
  Kolesterol: "#6366F1",
  Karaciğer: "#0EA5E9",
  Böbrek: "#06B6D4",
  Vitaminler: palette.amber,
  Demir: "#F97316",
  "Vitamin ve Mineral": palette.amber,
  Tiroid: palette.violet,
  "Vital Bulgular": palette.pink,
  "Vücut Ölçüleri": palette.teal,
  "Yaşam Tarzı": palette.green,
  Laboratuvar: palette.blue,
};
export const colorFor = (category: string) => categoryColor[category] ?? palette.teal;

export const statusMeta: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: tokens.status.normal },
  low: { label: "Düşük", color: tokens.status.low },
  high: { label: "Yüksek", color: tokens.status.high },
  unknown: { label: "Referanssız", color: tokens.status.unknown },
};

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  const divider = dark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.07)";
  const paper = dark ? "#0F1B3D" : "#FFFFFF";

  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#2DD4BF" : palette.tealDeep, contrastText: "#FFFFFF" },
      secondary: { main: palette.violet },
      info: { main: palette.blue },
      success: { main: palette.green },
      warning: { main: palette.amber },
      error: { main: palette.coral },
      background: dark ? { default: "#070D22", paper } : { default: "#F2F6FB", paper },
      text: dark ? { primary: "#EAF0FB", secondary: "#8EA0C2" } : { primary: "#0B1533", secondary: "#5A6785" },
      divider,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
      h3: { fontWeight: 800, letterSpacing: "-0.03em" },
      h4: { fontWeight: 800, letterSpacing: "-0.025em" },
      h5: { fontWeight: 800, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, fontSize: "1.02rem", letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 700 },
      overline: { fontWeight: 800, letterSpacing: "0.12em", fontSize: 11 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: "antialiased",
            fontVariantNumeric: "tabular-nums",
            backgroundAttachment: "fixed",
            // Açık tema beyaz değil: ferah, renkli bir zemin; koyu tema derin lacivert ışıltı
            backgroundImage: dark
              ? "radial-gradient(1200px 600px at 85% -10%, rgba(45,212,191,0.10), transparent 60%), radial-gradient(900px 500px at 20% 110%, rgba(139,92,246,0.12), transparent 60%)"
              : "radial-gradient(1100px 600px at 90% -10%, rgba(20,184,166,0.10), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(139,92,246,0.08), transparent 60%)",
          },
          "*::-webkit-scrollbar": { width: 8, height: 8 },
          "*::-webkit-scrollbar-thumb": { background: alpha(palette.slate, 0.3), borderRadius: 8 },
          "@keyframes fadeUp": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
          "@media (prefers-reduced-motion: reduce)": { "*": { animation: "none !important", transition: "none !important" } },
        },
      },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: tokens.radius,
            border: `1px solid ${divider}`,
            background: dark ? `linear-gradient(180deg, ${alpha("#13234D", 0.9)} 0%, ${paper} 100%)` : paper,
            boxShadow: dark ? "0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 30px rgba(0,0,0,0.25)"
              : "0 1px 2px rgba(11,21,51,0.04), 0 8px 24px rgba(11,21,51,0.05)",
            transition: "transform .25s ease, box-shadow .25s ease, border-color .25s ease",
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 12, paddingInline: 18, transition: "all .2s ease" },
          containedPrimary: {
            background: dark ? "linear-gradient(135deg, #2DD4BF, #3B82F6)" : gradients.brand,
            color: "#fff",
            boxShadow: `0 6px 18px ${alpha(palette.teal, 0.35)}`,
            "&:hover": { boxShadow: `0 10px 24px ${alpha(palette.teal, 0.45)}`, transform: "translateY(-1px)" },
            "&.Mui-disabled": { background: alpha(palette.slate, 0.25), boxShadow: "none" },
          },
          outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
        },
      },
      MuiIconButton: { styleOverrides: { root: { transition: "all .2s ease" } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiSelect: { defaultProps: { size: "small" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: dark ? alpha("#0B1533", 0.6) : alpha("#F2F6FB", 0.7),
            transition: "box-shadow .2s ease",
            "&.Mui-focused": { boxShadow: `0 0 0 4px ${alpha(palette.teal, 0.15)}` },
          },
          notchedOutline: { borderColor: divider },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700, borderRadius: 999 } } },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 24, border: `1px solid ${divider}`, backgroundColor: paper,
                   boxShadow: "0 30px 80px rgba(11,21,51,0.35)" },
        },
      },
      MuiBackdrop: { styleOverrides: { root: { backgroundColor: alpha("#070D22", 0.55), backdropFilter: "blur(4px)" } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 800, fontSize: "1.15rem" } } },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: dark ? "#8EA0C2" : "#5A6785", backgroundColor: dark ? alpha("#0B1533", 0.4) : alpha("#F2F6FB", 0.8) },
          root: { borderColor: divider },
        },
      },
      MuiTableRow: { styleOverrides: { root: { transition: "background-color .15s ease" } } },
      MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 700, minHeight: 40, borderRadius: 12 } } },
      MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: "#0B1533" } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 16, alignItems: "center" } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiToggleButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700, borderRadius: 10 } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 99 }, bar: { borderRadius: 99 } } },
      MuiAccordion: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 16 } } },
    },
  });
}
