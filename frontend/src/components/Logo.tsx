import { Box, Stack, Typography } from "@mui/material";

/** HealthTrack logosu: kalp + nabız çizgisi, marka gradyanı (teal → mavi → mor). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return <Box component="img" src="/favicon.svg" alt="HealthTrack" sx={{ width: size, height: size, display: "block",
    filter: "drop-shadow(0 6px 14px rgba(45,212,191,0.35))" }} />;
}

export default function Logo({ compact, light }: { compact?: boolean; light?: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={compact ? "center" : "flex-start"}>
      <LogoMark />
      {!compact && (
        <Box>
          <Typography fontWeight={800} fontSize={18} lineHeight={1.1} letterSpacing="-0.02em" color={light ? "#fff" : "text.primary"}>
            Health<Box component="span" sx={{ background: "linear-gradient(90deg,#2DD4BF,#8B5CF6)", WebkitBackgroundClip: "text", color: "transparent" }}>Track</Box>
          </Typography>
          <Typography fontSize={11} fontWeight={700} letterSpacing="0.14em" sx={{ color: light ? "rgba(255,255,255,0.55)" : "text.secondary" }}>
            AI HEALTH PLATFORM
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
