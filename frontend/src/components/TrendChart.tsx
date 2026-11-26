import { Box, Typography, useTheme } from "@mui/material";
import { useId } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { palette, statusMeta } from "../theme";
import { fmtShort } from "./common";

export type Point = { date: string; value: number; status?: string };

/** Ortak grafik tooltip'i (her iki temada uyumlu). */
export function useChartTooltip() {
  const theme = useTheme();
  return {
    contentStyle: { background: theme.palette.mode === "dark" ? "#0B1533" : "#fff", border: `1px solid ${theme.palette.divider}`,
      borderRadius: 14, boxShadow: "0 12px 30px rgba(11,21,51,0.18)", padding: "8px 12px" },
    labelStyle: { color: theme.palette.text.secondary, fontWeight: 600, fontSize: 12 },
    itemStyle: { color: theme.palette.text.primary, fontWeight: 700 },
  };
}

export const axisProps = (color: string) => ({ tick: { fontSize: 11, fill: color }, tickLine: false, axisLine: false });

/** Zaman içindeki değişim: gradient alan, durum renkli noktalar ve referans aralığı bandı. */
export default function TrendChart({ points, unit, name, refMin, refMax, height = 280, color = palette.teal }: {
  points: Point[]; unit: string; name: string; refMin?: number | null; refMax?: number | null; height?: number; color?: string;
}) {
  const theme = useTheme();
  const tip = useChartTooltip();
  const gid = useId().replace(/:/g, "");
  if (!points.length) return <Box height={height} display="grid" sx={{ placeItems: "center" }}><Typography color="text.secondary">Seçilen dönemde veri yok</Typography></Box>;
  const data = points.map((p) => ({ ...p, label: fmtShort(p.date) }));
  const values = data.map((p) => p.value);
  const lo = Math.min(...values, refMin ?? Infinity);
  const hi = Math.max(...values, refMax ?? -Infinity);
  const pad = (hi - lo) * 0.18 || Math.abs(hi) * 0.1 || 1;
  // Okunaklı eksen: aralığa göre yuvarlanmış sınırlar
  const step = hi - lo > 20 ? 10 : hi - lo > 4 ? 1 : 0.1;
  const domain: [number, number] = [Math.max(0, Math.floor((lo - pad) / step) * step), Math.ceil((hi + pad) / step) * step];
  const refColor = statusMeta.normal.color;

  return (
    <Box width="100%" height={height}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 14, right: 14, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.42} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`s${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={palette.violet} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={theme.palette.divider} vertical={false} />
          {(refMin != null || refMax != null) && (
            <ReferenceArea y1={refMin ?? domain[0]} y2={refMax ?? domain[1]} fill={refColor} fillOpacity={0.07} ifOverflow="hidden" />
          )}
          {refMin != null && <ReferenceLine y={refMin} stroke={refColor} strokeDasharray="5 5" strokeOpacity={0.7}
            label={{ value: `alt ${refMin}`, position: "insideBottomRight", fill: refColor, fontSize: 10 }} />}
          {refMax != null && <ReferenceLine y={refMax} stroke={refColor} strokeDasharray="5 5" strokeOpacity={0.7}
            label={{ value: `üst ${refMax}`, position: "insideTopRight", fill: refColor, fontSize: 10 }} />}
          <XAxis dataKey="label" {...axisProps(theme.palette.text.secondary)} minTickGap={18} />
          <YAxis domain={domain} {...axisProps(theme.palette.text.secondary)} width={52}
            tickFormatter={(v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: step < 1 ? 1 : 0 })} />
          <Tooltip {...tip} formatter={(v: number) => [`${v} ${unit}`, name]} />
          <Area type="monotone" dataKey="value" stroke={`url(#s${gid})`} strokeWidth={3} fill={`url(#a${gid})`} animationDuration={700}
            dot={({ cx, cy, payload, index }) => (
              <circle key={index} cx={cx} cy={cy} r={4.5} stroke={theme.palette.background.paper} strokeWidth={2}
                fill={payload.status ? statusMeta[payload.status]?.color ?? color : color} />
            )}
            activeDot={{ r: 7, stroke: theme.palette.background.paper, strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
