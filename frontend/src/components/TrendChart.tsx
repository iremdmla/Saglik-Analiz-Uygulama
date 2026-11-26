import { Box, Typography, useTheme } from "@mui/material";
import {
  Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Measurement } from "../api/types";
import { statusMeta } from "../theme";

/** Zaman içindeki değişim grafiği. Yeşil bant referans aralığını gösterir. */
export default function TrendChart({ data, height = 280, color }: { data: Measurement[]; height?: number; color?: string }) {
  const theme = useTheme();
  const c = color ?? theme.palette.primary.main;
  if (!data.length) return null;
  const last = data[data.length - 1];
  const unit = last.unit;
  // Farklı birimdeki değerler aynı grafikte gösterilmez
  const points = data.filter((d) => d.unit === unit).map((d) => ({
    date: new Date(`${d.measured_at}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }),
    value: d.value, status: d.status,
  }));
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, last.ref_min ?? Infinity);
  const hi = Math.max(...values, last.ref_max ?? -Infinity);
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.1 || 1;
  const domain = [Math.max(0, +(lo - pad).toFixed(2)), +(hi + pad).toFixed(2)];
  const gid = `g-${last.type_id}`;

  return (
    <Box width="100%" height={height}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
          {(last.ref_min != null || last.ref_max != null) && (
            <ReferenceArea y1={last.ref_min ?? domain[0]} y2={last.ref_max ?? domain[1]}
              fill={statusMeta.normal.color} fillOpacity={0.08} ifOverflow="hidden" />
          )}
          {last.ref_min != null && <ReferenceLine y={last.ref_min} stroke={statusMeta.normal.color} strokeDasharray="4 4" strokeOpacity={0.6} />}
          {last.ref_max != null && <ReferenceLine y={last.ref_max} stroke={statusMeta.normal.color} strokeDasharray="4 4" strokeOpacity={0.6} />}
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis domain={domain} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
            formatter={(v: number) => [`${v} ${unit}`, last.type_name]}
          />
          <Area type="monotone" dataKey="value" stroke={c} strokeWidth={2.5} fill={`url(#${gid})`}
            dot={({ cx, cy, payload, index }) => (
              <circle key={index} cx={cx} cy={cy} r={4.5} stroke={theme.palette.background.paper} strokeWidth={2}
                fill={statusMeta[payload.status]?.color ?? c} />
            )}
            activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
      {points.length < data.length && (
        <Typography variant="caption" color="text.secondary">Farklı birimdeki ölçümler grafikte gösterilmedi.</Typography>
      )}
    </Box>
  );
}
