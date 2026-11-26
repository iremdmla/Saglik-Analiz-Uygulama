// Kategori → ikon eşlemesi (tüm ekranlarda tutarlı ikon kullanımı için)
import BedtimeRoundedIcon from "@mui/icons-material/BedtimeRounded";
import BiotechRoundedIcon from "@mui/icons-material/BiotechRounded";
import BloodtypeRoundedIcon from "@mui/icons-material/BloodtypeRounded";
import DirectionsWalkRoundedIcon from "@mui/icons-material/DirectionsWalkRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import MonitorWeightRoundedIcon from "@mui/icons-material/MonitorWeightRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import type { ReactNode } from "react";

const byCategory: Record<string, ReactNode> = {
  Hemogram: <BloodtypeRoundedIcon />,
  Biyokimya: <BiotechRoundedIcon />,
  Şeker: <WaterDropRoundedIcon />,
  Kolesterol: <ScienceRoundedIcon />,
  Karaciğer: <BiotechRoundedIcon />,
  Böbrek: <WaterDropRoundedIcon />,
  Vitaminler: <WbSunnyRoundedIcon />,
  "Vitamin ve Mineral": <WbSunnyRoundedIcon />,
  Demir: <SpaRoundedIcon />,
  Tiroid: <PsychologyRoundedIcon />,
  "Vital Bulgular": <FavoriteRoundedIcon />,
  "Vücut Ölçüleri": <MonitorWeightRoundedIcon />,
  "Yaşam Tarzı": <DirectionsWalkRoundedIcon />,
};
const byCode: Record<string, ReactNode> = { SLEEP: <BedtimeRoundedIcon />, STEPS: <DirectionsWalkRoundedIcon />, WEIGHT: <MonitorWeightRoundedIcon /> };

export const iconFor = (category: string, code?: string): ReactNode =>
  (code && byCode[code]) ?? byCategory[category] ?? <ScienceRoundedIcon />;
