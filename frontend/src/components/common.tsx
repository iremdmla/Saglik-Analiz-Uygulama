// Tasarım sisteminin tekrar kullanılan bileşenleri. Tüm ekranlar bu parçalardan oluşur.
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  alpha, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, Skeleton,
  Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme, type SxProps, type Theme,
} from "@mui/material";
import { useCallback, useEffect, useId, useState, type DependencyList, type ReactNode } from "react";
import { ApiError } from "../api/client";
import type { Status } from "../api/types";
import { gradients, palette, statusMeta } from "../theme";

/* ---------------------------------------------------------------- yapı taşları */

export function IconTile({ icon, color = palette.teal, size = 44, solid }: {
  icon: ReactNode; color?: string; size?: number; solid?: boolean;
}) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: size > 40 ? 3.5 : 2.5, display: "grid", placeItems: "center", flexShrink: 0,
      color: solid ? "#fff" : color,
      background: solid ? `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})` : alpha(color, 0.14),
      boxShadow: solid ? `0 8px 18px ${alpha(color, 0.35)}` : "none",
      "& svg": { fontSize: size * 0.5 },
    }}>{icon}</Box>
  );
}

export function PageHeader({ title, subtitle, action, icon, color = palette.teal, eyebrow }: {
  title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode; color?: string; eyebrow?: string;
}) {
  return (
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} mb={3}>
      <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
        {icon && <IconTile icon={icon} color={color} size={52} solid />}
        <Box minWidth={0}>
          {eyebrow && <Typography variant="overline" sx={{ color }}>{eyebrow}</Typography>}
          <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 30 } }}>{title}</Typography>
          {subtitle && <Typography color="text.secondary" mt={0.5}>{subtitle}</Typography>}
        </Box>
      </Stack>
      {action && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{action}</Stack>}
    </Stack>
  );
}

export function SectionCard({ title, subtitle, icon, color, action, children, pad = true, fill = true, sx }: {
  title?: ReactNode; subtitle?: ReactNode; icon?: ReactNode; color?: string; action?: ReactNode; children: ReactNode;
  pad?: boolean; fill?: boolean; sx?: SxProps<Theme>;
}) {
  return (
    <Card sx={{ height: fill ? "100%" : "auto", display: "flex", flexDirection: "column", ...sx }}>
      {title && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} px={2.75} pt={2.5} pb={pad ? 0 : 1.75}>
          <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
            {icon && <IconTile icon={icon} color={color} size={36} />}
            <Box minWidth={0}>
              <Typography variant="h6" noWrap>{title}</Typography>
              {subtitle && <Typography variant="caption" color="text.secondary" display="block">{subtitle}</Typography>}
            </Box>
          </Stack>
          {action}
        </Stack>
      )}
      <Box sx={{ p: pad ? 2.75 : 0, pt: pad && title ? 2 : undefined, flex: 1, minWidth: 0 }}>{children}</Box>
    </Card>
  );
}

/** Gradient zeminli vurgu kartı (hero alanları için). Dekoratif ışık halkaları içerir. */
export function HeroCard({ children, gradient = gradients.hero, sx }: { children: ReactNode; gradient?: string; sx?: SxProps<Theme> }) {
  return (
    <Card sx={{ position: "relative", overflow: "hidden", border: 0, color: "#fff", background: gradient,
      boxShadow: "0 20px 50px rgba(11,21,51,0.25)", ...sx }}>
      <Box sx={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", right: -120, top: -160,
        background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)" }} />
      <Box sx={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", left: "35%", bottom: -200,
        background: "radial-gradient(circle, rgba(45,212,191,0.35), transparent 65%)" }} />
      <Box sx={{ position: "relative" }}>{children}</Box>
    </Card>
  );
}

export function StatCard({ label, value, icon, color = palette.teal, hint, solid, unit }: {
  label: string; value: ReactNode; icon: ReactNode; color?: string; hint?: ReactNode; solid?: boolean; unit?: string;
}) {
  return (
    <Card sx={{
      height: "100%", position: "relative", overflow: "hidden",
      ...(solid && { background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.75)} 100%)`, color: "#fff", border: 0,
        boxShadow: `0 14px 30px ${alpha(color, 0.35)}` }),
      "&:hover": { transform: "translateY(-3px)" },
    }}>
      {!solid && <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${alpha(color, 0)})` }} />}
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box minWidth={0}>
            <Typography variant="body2" fontWeight={600} sx={{ opacity: solid ? 0.85 : 1 }} color={solid ? "inherit" : "text.secondary"} noWrap>{label}</Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.75}>
              <Typography variant="h4" lineHeight={1.1} sx={{ fontSize: { xs: 26, md: 30 } }}>{value}</Typography>
              {unit && <Typography variant="body2" sx={{ opacity: 0.7 }}>{unit}</Typography>}
            </Stack>
            {hint && <Typography variant="caption" display="block" mt={0.5} sx={{ opacity: solid ? 0.85 : 1 }} color={solid ? "inherit" : "text.secondary"}>{hint}</Typography>}
          </Box>
          {solid ? <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: alpha("#fff", 0.18), display: "flex" }}>{icon}</Box> : <IconTile icon={icon} color={color} />}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status, size = "small" }: { status: Status; size?: "small" | "medium" }) {
  const m = statusMeta[status] ?? statusMeta.unknown;
  return (
    <Chip size={size} label={m.label}
      icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: m.color, ml: "10px !important" }} />}
      sx={{ bgcolor: alpha(m.color, 0.12), color: m.color, border: `1px solid ${alpha(m.color, 0.25)}` }} />
  );
}

export function DemoChip() {
  return <Chip size="small" label="Sentetik" sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(palette.violet, 0.12), color: palette.violet }} />;
}

/* ---------------------------------------------------------------- veri görselleştirme */

/** Dairesel ilerleme göstergesi (0-100). İçine metin yerleştirilebilir. */
export function RingGauge({ value, size = 120, thickness = 12, colors = [palette.teal, palette.violet], track, children }: {
  value: number; size?: number; thickness?: number; colors?: [string, string]; track?: string; children?: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <Box position="relative" width={size} height={size} flexShrink={0}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} /><stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? alpha(palette.slate, 0.18)} strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <Stack position="absolute" sx={{ inset: 0 }} alignItems="center" justifyContent="center" textAlign="center">{children}</Stack>
    </Box>
  );
}

/** Değerin referans aralığındaki konumunu gösteren çubuk (yeşil bölge = referans). */
export function RangeBar({ value, min, max, status, height = 8 }: {
  value: number; min: number | null; max: number | null; status: Status; height?: number;
}) {
  const theme = useTheme();
  if (min == null && max == null) return <Box height={height} borderRadius={99} bgcolor={alpha(palette.slate, 0.15)} />;
  const lo = min ?? 0;
  const hi = max ?? (lo * 2 || 1);
  const span = hi - lo || 1;
  const start = lo - span * 0.5;
  const end = hi + span * 0.5;
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - start) / (end - start)) * 100));
  const color = statusMeta[status]?.color ?? palette.slate;
  return (
    <Box position="relative" height={height + 8} display="flex" alignItems="center">
      <Box sx={{ position: "absolute", left: 0, right: 0, height, borderRadius: 99,
        background: `linear-gradient(90deg, ${alpha(palette.amber, 0.35)}, ${alpha(palette.slate, 0.12)} 30%, ${alpha(palette.slate, 0.12)} 70%, ${alpha(palette.coral, 0.35)})` }} />
      <Box sx={{ position: "absolute", left: `${min == null ? 0 : pct(lo)}%`, width: `${(max == null ? 100 : pct(hi)) - (min == null ? 0 : pct(lo))}%`,
        height, borderRadius: 99, bgcolor: alpha(palette.green, 0.45) }} />
      <Box sx={{ position: "absolute", left: `calc(${pct(value)}% - ${height + 2}px)`, width: height * 2 + 4, height: height * 2 + 4,
        borderRadius: "50%", bgcolor: color, border: `3px solid ${theme.palette.background.paper}`, boxShadow: `0 2px 8px ${alpha(color, 0.5)}`,
        transition: "left .6s ease" }} />
    </Box>
  );
}

/** Hafif, bağımlılıksız SVG sparkline. */
export function Sparkline({ data, color = palette.teal, width = 120, height = 36 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const id = useId().replace(/:/g, "");
  if (data.length < 2) return <Box width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible", maxWidth: width }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}

export type Period = "3m" | "6m" | "1y" | "all";
const PERIOD_DAYS: Record<Period, number> = { "3m": 92, "6m": 183, "1y": 366, all: 100000 };

export function filterByPeriod<T>(rows: T[], period: Period, getDate: (r: T) => string): T[] {
  const from = Date.now() - PERIOD_DAYS[period] * 86400000;
  return rows.filter((r) => new Date(`${getDate(r).slice(0, 10)}T00:00:00`).getTime() >= from);
}

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <ToggleButtonGroup size="small" exclusive value={value} onChange={(_, v) => v && onChange(v)}
      sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.04), p: 0.5, borderRadius: 3, "& .MuiToggleButton-root": { border: 0, px: 1.5, py: 0.4, borderRadius: "10px !important" },
        "& .Mui-selected": { bgcolor: (t) => `${t.palette.background.paper} !important`, boxShadow: "0 2px 6px rgba(11,21,51,0.12)" } }}>
      <ToggleButton value="3m">3A</ToggleButton>
      <ToggleButton value="6m">6A</ToggleButton>
      <ToggleButton value="1y">1Y</ToggleButton>
      <ToggleButton value="all">Tümü</ToggleButton>
    </ToggleButtonGroup>
  );
}

/* ---------------------------------------------------------------- durum ekranları */

export function EmptyState({ icon, title, description, action, color = palette.teal }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode; color?: string;
}) {
  return (
    <Stack alignItems="center" textAlign="center" spacing={1.5} py={6} px={2} sx={{ animation: "fadeUp .4s ease" }}>
      <Box position="relative" width={96} height={96} display="grid" sx={{ placeItems: "center" }}>
        <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(color, 0.22)}, transparent 70%)` }} />
        <Box sx={{ position: "absolute", inset: 14, borderRadius: "50%", border: `1.5px dashed ${alpha(color, 0.4)}` }} />
        <IconTile icon={icon ?? <ScienceOutlinedIcon />} color={color} size={52} solid />
      </Box>
      <Typography variant="h6">{title}</Typography>
      {description && <Typography color="text.secondary" maxWidth={440}>{description}</Typography>}
      {action}
    </Stack>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 4 }} />)}
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon={<ErrorOutlineIcon />} color={palette.coral} title="Bir sorun oluştu" description={message}
      action={onRetry && <Button variant="outlined" onClick={onRetry}>Tekrar dene</Button>} />
  );
}

export function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" pt={2} gap={1} flexWrap="wrap">
      <Typography variant="body2" color="text.secondary">
        <b>{total}</b> kayıttan {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)} arası
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant="outlined" startIcon={<ChevronLeftIcon />} disabled={page <= 1} onClick={() => onChange(page - 1)}>Önceki</Button>
        <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: "primary.main", fontWeight: 800, fontSize: 14 }}>
          {page} / {pages}
        </Box>
        <Button size="small" variant="outlined" endIcon={<ChevronRightIcon />} disabled={page >= pages} onClick={() => onChange(page + 1)}>Sonraki</Button>
      </Stack>
    </Stack>
  );
}

export function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmText = "Sil", busy, tone = "danger" }: {
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void;
  confirmText?: string; busy?: boolean; tone?: "danger" | "primary";
}) {
  const color = tone === "danger" ? palette.coral : palette.teal;
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogContent sx={{ pt: 4, textAlign: "center" }}>
        <Box display="flex" justifyContent="center" mb={2}><IconTile icon={<WarningAmberRoundedIcon />} color={color} size={56} /></Box>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary" mt={1}>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button fullWidth variant="outlined" onClick={onCancel}>Vazgeç</Button>
        <Button fullWidth variant="contained" onClick={onConfirm} disabled={busy}
          sx={tone === "danger" ? { background: gradients.coral, boxShadow: `0 6px 18px ${alpha(palette.coral, 0.35)}` } : undefined}>
          {busy ? <CircularProgress size={18} color="inherit" /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MedicalDisclaimer({ text }: { text?: string }) {
  return (
    <Card sx={{ p: 2, display: "flex", gap: 1.5, alignItems: "center", boxShadow: "none",
      background: (t) => alpha(palette.violet, t.palette.mode === "dark" ? 0.12 : 0.06), borderColor: alpha(palette.violet, 0.2) }}>
      <IconTile icon={<InfoOutlinedIcon />} color={palette.violet} size={36} />
      <Typography variant="body2" color="text.secondary">
        {text ?? "Bu uygulama teşhis veya tedavi amacı taşımaz. Değerlerinizi doktorunuzla birlikte değerlendiriniz."}
      </Typography>
    </Card>
  );
}

/* ---------------------------------------------------------------- yardımcılar */

/** Basit veri yükleme kancası: loading / error / data durumlarını yönetir. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    run().then(setData).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [run]);
  useEffect(reload, [reload]);
  return { data, error, loading, reload, setData };
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.errors.length ? `${e.message} ${e.errors.map((x) => x.message).join(" · ")}` : e.message;
  return "Beklenmeyen bir hata oluştu.";
}

const asDate = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d.endsWith("Z") ? d : `${d}Z`);
export const fmtDate = (d: string | null | undefined) =>
  d ? asDate(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtShort = (d: string) => asDate(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
export const fmtDateTime = (d: string | null | undefined) =>
  d ? asDate(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtRef = (min: number | null, max: number | null) =>
  min != null && max != null ? `${min} – ${max}` : max != null ? `< ${max}` : min != null ? `> ${min}` : "—";
export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name?: string) => (name ?? "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
export const fmtNum = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export function statusOf(value: number, min: number | null, max: number | null): Status {
  if (min == null && max == null) return "unknown";
  if (min != null && value < min) return "low";
  if (max != null && value > max) return "high";
  return "normal";
}

/** Modal pencereler için ikonlu, renk vurgulu başlık. */
export function DialogHeader({ icon, title, subtitle, color = palette.teal }: { icon: ReactNode; title: string; subtitle?: string; color?: string }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 3, pt: 3, pb: 2.5,
      background: `linear-gradient(135deg, ${alpha(color, 0.14)}, transparent 70%)`, borderBottom: 1, borderColor: "divider" }}>
      <IconTile icon={icon} color={color} size={46} solid />
      <Box minWidth={0}>
        <Typography variant="h6" fontSize={18}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
  );
}
