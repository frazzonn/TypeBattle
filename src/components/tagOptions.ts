import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardRoundedIcon from "@mui/icons-material/KeyboardRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

// ---------- Estilos e ícones (mesma lista do backend) ----------

export const TAG_STYLE_OPTIONS = [
  { id: "classic", label: "Clássica", usesColor: true },
  { id: "solid", label: "Sólida", usesColor: true },
  { id: "outline", label: "Contorno", usesColor: true },
  { id: "gradient", label: "Gradiente", usesColor: false },
  { id: "neon", label: "Neon", usesColor: false },
  { id: "rainbow", label: "Arco-íris", usesColor: false },
  { id: "shimmer", label: "Brilho", usesColor: true },
  { id: "gold", label: "Ouro", usesColor: false },
  { id: "diamond", label: "Diamante", usesColor: false },
  { id: "pulse", label: "Pulsante", usesColor: true },
  { id: "fire", label: "Fogo", usesColor: false },
  { id: "holo", label: "Holográfico", usesColor: false },
  { id: "terminal", label: "Terminal", usesColor: false },
] as const;

export type TagStyleId = (typeof TAG_STYLE_OPTIONS)[number]["id"];

export const TAG_ICON_OPTIONS: { id: string; label: string; icon: typeof CodeRoundedIcon }[] = [
  { id: "code", label: "Código", icon: CodeRoundedIcon },
  { id: "bolt", label: "Raio", icon: BoltRoundedIcon },
  { id: "star", label: "Estrela", icon: StarRoundedIcon },
  { id: "shield", label: "Escudo", icon: ShieldRoundedIcon },
  { id: "heart", label: "Coração", icon: FavoriteRoundedIcon },
  { id: "fire", label: "Fogo", icon: LocalFireDepartmentRoundedIcon },
  { id: "trophy", label: "Troféu", icon: EmojiEventsRoundedIcon },
  { id: "premium", label: "Medalha", icon: WorkspacePremiumRoundedIcon },
  { id: "verified", label: "Verificado", icon: VerifiedRoundedIcon },
  { id: "diamond", label: "Diamante", icon: DiamondRoundedIcon },
  { id: "keyboard", label: "Teclado", icon: KeyboardRoundedIcon },
];
