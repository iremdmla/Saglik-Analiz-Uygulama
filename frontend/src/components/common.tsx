// Tekrar kullanılan arayüz bileşenleri: başlık, kartlar, durum ekranları, sayfalama.
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import {
  Alert, alpha, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Skeleton, Stack, Typography, useTheme,
} from "@mui/material";
import { useCallback, useEffect, useState, type DependencyList, type ReactNode } from "react";
import { ApiError } from "../api/client";
import type { Status } from "../api/types";
import { statusMeta } from "../theme";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }}
      spacing={2} mb={3}>
      <Box>
        <Typography variant="h5">{title}</Typography>
        {subtitle && <Typography color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      </Box>
      {action && <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{action}</Stack>}
    </Stack>
  );
}

export function SectionCard({ title, action, children, pad = true, fill = true }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; pad?: boolean; fill?: boolean;
}) {
  return (
    <Card sx={{ height: fill ? "100%" : "auto", display: "flex", flexDirection: "column" }}>
      {title && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2.5} pt={2.25} pb={pad ? 0 : 1.5}>
          <Typography variant="h6">{title}</Typography>
          {action}
        </Stack>
      )}
      <Box sx={{ p: pad ? 2.5 : 0, flex: 1 }}>{children}</Box>
    </Card>
  );
}

export function StatCard({ label, value, icon, color, hint }: {
  label: string; value: ReactNode; icon: ReactNode; color?: string; hint?: ReactNode;
}) {
  const theme = useTheme();
  const c = color ?? theme.palette.primary.main;
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: 3, display: "grid", placeItems: "center",
                     bgcolor: alpha(c, 0.12), color: c, flexShrink: 0 }}>
            {icon}
          </Box>
          <Box minWidth={0}>
            <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
            <Typography variant="h5" lineHeight={1.25}>{value}</Typography>
            {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status, size = "small" }: { status: Status; size?: "small" | "medium" }) {
  const m = statusMeta[status] ?? statusMeta.unknown;
  return <Chip size={size} label={m.label} sx={{ bgcolor: alpha(m.color, 0.14), color: m.color }} />;
}

export function DemoChip() {
  return <Chip size="small" variant="outlined" label="Sentetik demo" color="secondary" sx={{ height: 22, fontSize: 11 }} />;
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Stack alignItems="center" textAlign="center" spacing={1.5} py={6} px={2}>
      <Box sx={{ width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center",
                 bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}>
        {icon ?? <ScienceOutlinedIcon fontSize="large" />}
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {description && <Typography color="text.secondary" maxWidth={420}>{description}</Typography>}
      {action}
    </Stack>
  );
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon={<ErrorOutlineIcon fontSize="large" color="error" />} title="Bir sorun oluştu" description={message}
      action={onRetry && <Button variant="outlined" onClick={onRetry}>Tekrar dene</Button>} />
  );
}

export function Pager({ page, pageSize, total, onChange }: {
  page: number; pageSize: number; total: number; onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" pt={2} gap={1} flexWrap="wrap">
      <Typography variant="body2" color="text.secondary">{total} kayıttan {from}–{to} arası</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button size="small" variant="outlined" startIcon={<ChevronLeftIcon />} disabled={page <= 1}
          onClick={() => onChange(page - 1)}>Önceki</Button>
        <Typography variant="body2" fontWeight={600} px={1}>{page} / {pages}</Typography>
        <Button size="small" variant="outlined" endIcon={<ChevronRightIcon />} disabled={page >= pages}
          onClick={() => onChange(page + 1)}>Sonraki</Button>
      </Stack>
    </Stack>
  );
}

export function ConfirmDialog({ open, title, message, onCancel, onConfirm, confirmText = "Sil", busy }: {
  open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void;
  confirmText?: string; busy?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography color="text.secondary">{message}</Typography></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Vazgeç</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>
          {busy ? <CircularProgress size={18} color="inherit" /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MedicalDisclaimer({ text }: { text?: string }) {
  return (
    <Alert severity="info" variant="outlined" sx={{ borderRadius: 3 }}>
      {text ?? "Bu uygulama teşhis veya tedavi amacı taşımaz. Değerlerinizi doktorunuzla birlikte değerlendiriniz."}
    </Alert>
  );
}

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
  if (e instanceof ApiError) {
    return e.errors.length ? `${e.message} ${e.errors.map((x) => x.message).join(" · ")}` : e.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? `${d}T00:00:00` : d.endsWith("Z") ? d : `${d}Z`).toLocaleDateString("tr-TR",
    { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d.endsWith("Z") ? d : `${d}Z`).toLocaleString("tr-TR",
    { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export const fmtRef = (min: number | null, max: number | null) =>
  min != null && max != null ? `${min} – ${max}` : max != null ? `< ${max}` : min != null ? `> ${min}` : "—";

export const today = () => new Date().toISOString().slice(0, 10);
