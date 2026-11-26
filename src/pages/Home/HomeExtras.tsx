import { useEffect, useState, type ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

import AbcRoundedIcon from "@mui/icons-material/AbcRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import DirectionsRunRoundedIcon from "@mui/icons-material/DirectionsRunRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { useAuth } from "../../contexts/useAuth";
import { getCifraDaily, getEmbaralha, type CifraDailyState, type EmbaralhaDaily } from "../../services/api";

// Seções da home abaixo de "Como você vai jogar?": desafios do dia, jogos do
// Arcade e modos da Battle. Mesmo visual dos cards da home.

const MUTED = "#9296a5";
const CARD_SX = {
  borderRadius: 3,
  bgcolor: "#15161c",
  border: "1px solid #292a35",
} as const;

function SectionTitle({ id, kicker, title, aside }: { id: string; kicker: string; title: string; aside?: ReactNode }) {
  return (
    <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 1.5 }}>
      <Box>
        <Typography sx={{ color: "#a78bfa", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 2 }}>{kicker}</Typography>
        <Typography
          id={id}
          component="h2"
          sx={{ mt: 1, fontSize: { xs: "1.6rem", sm: "2rem" }, fontWeight: 800, letterSpacing: "-0.04em", color: "#f4f4f5" }}
        >
          {title}
        </Typography>
      </Box>
      {aside}
    </Box>
  );
}

function IconDot({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        width: 42, height: 42, borderRadius: 2.5, color, bgcolor: `${color}1a`,
        "& .MuiSvgIcon-root": { fontSize: 23 },
      }}
    >
      {children}
    </Box>
  );
}

// ------------------------------------------------------------ desafios do dia

type DailyStatus = "new" | "playing" | "won" | "lost";

const STATUS_LABEL: Record<DailyStatus, string> = {
  new: "Jogar",
  playing: "Continuar",
  won: "Feito",
  lost: "Não deu",
};

function cifraStatus(state: CifraDailyState | null | undefined): DailyStatus {
  if (!state) return "new";
  if (state.finished) return state.won ? "won" : "lost";
  return state.rows.length > 0 || state.started ? "playing" : "new";
}

function readStorage<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

const CIFRA_MODES = [
  { boards: 1, label: "Diária" },
  { boards: 2, label: "Dupla" },
  { boards: 4, label: "Quarteto" },
] as const;

function DailyChallenges() {
  const { token } = useAuth();
  const [embaralha, setEmbaralha] = useState<EmbaralhaDaily | null>(null);
  const [cifra, setCifra] = useState<Record<number, DailyStatus>>({});
  // Diferença entre o relógio do servidor e o daqui.
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getEmbaralha()
      .then(async (daily) => {
        if (!active) return;
        setEmbaralha(daily);
        setOffset(daily.serverNow - Date.now());
        // Logado: o servidor guarda a Cifra diária. Convidado: fica no aparelho.
        const states = await Promise.all(
          CIFRA_MODES.map(({ boards }) =>
            token
              ? getCifraDaily(boards, token).catch(() => null)
              : readStorage<{ state: CifraDailyState }>(`typebattle_cifra_${daily.date}_${boards}`)?.state ?? null,
          ),
        );
        if (active) setCifra(Object.fromEntries(CIFRA_MODES.map(({ boards }, i) => [boards, cifraStatus(states[i])])));
      })
      .catch(() => {
        // Sem conexão: os cards aparecem sem progresso.
      });
    return () => {
      active = false;
    };
  }, [token, reloadKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = embaralha ? embaralha.nextAt - (now + offset) : null;
  // Virou o dia: carrega o desafio novo.
  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      const timer = setTimeout(() => setReloadKey((key) => key + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [remaining]);

  const progress = embaralha
    ? readStorage<{ found?: unknown[]; revealed?: unknown[] | null }>(`typebattle_embaralha_${embaralha.date}`)
    : null;
  const found = progress?.found?.length ?? 0;
  const gaveUp = Boolean(progress?.revealed);
  const percent = embaralha && embaralha.total > 0 ? Math.min(100, (found / embaralha.total) * 100) : 0;

  return (
    <Box component="section" aria-labelledby="home-hoje" sx={{ maxWidth: 1000, mx: "auto", mt: { xs: 7, md: 9 } }}>
      <SectionTitle
        id="home-hoje"
        kicker="DESAFIOS DE HOJE"
        title="Um desafio novo todo dia"
        aside={
          remaining !== null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: MUTED, fontSize: 14 }}>
              <ScheduleRoundedIcon sx={{ fontSize: 17, color: "#a78bfa" }} />
              Próximo em
              <Box component="strong" sx={{ color: "#f4f4f5", fontVariantNumeric: "tabular-nums" }}>
                {formatCountdown(remaining)}
              </Box>
            </Box>
          )
        }
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {/* Cifra diário: um botão por modo, com o estado de hoje. */}
        <Box sx={{ ...CARD_SX, p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
            <IconDot color="#a78bfa"><AbcRoundedIcon /></IconDot>
            <Box>
              <Typography component="h3" sx={{ fontSize: "1.1rem", fontWeight: 800 }}>Cifra Diário</Typography>
              <Typography sx={{ fontSize: 13, color: MUTED }}>Com ranking do dia</Typography>
            </Box>
          </Stack>
          <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.7, color: MUTED }}>
            Descubra as palavras do dia contra o relógio. Igual para todo mundo.
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 1, mt: "auto" }}>
            {CIFRA_MODES.map(({ boards, label }) => {
              const status = cifra[boards] ?? "new";
              const done = status === "won" || status === "lost";
              return (
                <Box
                  key={boards}
                  component={Link}
                  to={`/arcade/cifra?modo=${boards}`}
                  sx={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, py: 1.1, px: 0.5,
                    borderRadius: 2, textDecoration: "none", textAlign: "center",
                    border: "1px solid",
                    borderColor: done ? "#292a35" : "rgba(167,139,250,0.35)",
                    bgcolor: done ? "transparent" : "rgba(167,139,250,0.08)",
                    transition: "border-color 160ms ease, background-color 160ms ease",
                    "&:hover": { borderColor: "#a78bfa", bgcolor: "rgba(167,139,250,0.14)" },
                    "&:focus-visible": { outline: "2px solid #a78bfa", outlineOffset: 2 },
                  }}
                >
                  <Box component="span" sx={{ color: "#f4f4f5", fontWeight: 800, fontSize: 14 }}>{label}</Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 12, fontWeight: 700,
                      color: status === "won" ? "#86efac" : status === "lost" ? "#fca5a5" : "#c4b5fd",
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Embaralha: progresso do dia (fica no aparelho). */}
        <Box
          component={Link}
          to="/arcade/embaralha"
          sx={{
            ...CARD_SX, p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 1.5,
            color: "inherit", textDecoration: "none",
            transition: "transform 180ms ease, border-color 180ms ease",
            "&:hover": { transform: "translateY(-3px)", borderColor: "#a78bfa" },
            "&:focus-visible": { outline: "2px solid #a78bfa", outlineOffset: 3 },
          }}
        >
          <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
            <IconDot color="#7dd3fc"><ShuffleRoundedIcon /></IconDot>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontSize: "1.1rem", fontWeight: 800 }}>Embaralha</Typography>
              <Typography sx={{ fontSize: 13, color: MUTED }}>
                {embaralha ? `${found} de ${embaralha.total} palavras` : "7 letras do dia"}
              </Typography>
            </Box>
          </Stack>
          {embaralha && (
            <Box aria-hidden="true" sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
              {embaralha.letters.map((letter, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: "#1f2230", border: "1px solid rgba(125,211,252,0.3)", fontWeight: 800, fontSize: 14,
                    textTransform: "uppercase", color: "#e0f2fe",
                  }}
                >
                  {letter}
                </Box>
              ))}
            </Box>
          )}
          <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.7, color: MUTED }}>
            Forme o máximo de palavras com as letras do dia.
          </Typography>
          <Box
            role="progressbar"
            aria-label="Palavras encontradas hoje"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            sx={{ height: 6, borderRadius: 99, bgcolor: "#262833", overflow: "hidden" }}
          >
            <Box sx={{ width: `${percent}%`, height: "100%", bgcolor: "#7dd3fc", transition: "width 300ms ease" }} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: "auto", color: "#7dd3fc", fontSize: "0.85rem", fontWeight: 800 }}>
            {gaveUp ? "Ver as palavras" : found > 0 ? "Continuar" : "Jogar"}
            <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ------------------------------------------------------------ arcade

const GAMES = [
  { to: "/arcade/cifra", name: "Cifra", text: "Adivinhe a palavra de 5 letras, no diário ou contra o relógio.", color: "#a78bfa", icon: <AbcRoundedIcon /> },
  { to: "/arcade/embaralha", name: "Embaralha", text: "Forme palavras com as 7 letras do dia.", color: "#7dd3fc", icon: <ShuffleRoundedIcon /> },
  { to: "/arcade/conjuga", name: "Conjuga", text: "Digite as conjugações do verbo antes do tempo acabar.", color: "#86efac", icon: <MenuBookRoundedIcon /> },
  { to: "/arcade/pavio", name: "Pavio", text: "Uma palavra com a sílaba antes que a bomba exploda.", color: "#fdba74", icon: <WhatshotRoundedIcon /> },
  { to: "/arcade/orbita", name: "Órbita", text: "Destrua as palavras antes que elas cheguem ao núcleo.", color: "#f0abfc", icon: <PublicRoundedIcon /> },
  { to: "/arcade/perseguicao", name: "Perseguição", text: "Fuja do perseguidor, que acelera a cada segundo.", color: "#fca5a5", icon: <DirectionsRunRoundedIcon /> },
];

function ArcadeGames() {
  return (
    <Box component="section" aria-labelledby="home-arcade" sx={{ maxWidth: 1000, mx: "auto", mt: { xs: 7, md: 9 } }}>
      <SectionTitle
        id="home-arcade"
        kicker="ARCADE"
        title="Jogos de palavras e digitação"
        aside={
          <Box
            component={Link}
            to="/arcade"
            sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#c4b5fd", fontWeight: 800, fontSize: 14, textDecoration: "none", "&:hover": { color: "#ddd6fe" } }}
          >
            Ver o Arcade <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
        }
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
        {GAMES.map((game) => (
          <Box
            key={game.to}
            component={Link}
            to={game.to}
            sx={{
              ...CARD_SX, display: "flex", alignItems: "center", gap: 1.75, p: 2, minWidth: 0,
              color: "inherit", textDecoration: "none",
              transition: "transform 180ms ease, border-color 180ms ease, background-color 180ms ease",
              "&:hover": { transform: "translateY(-3px)", borderColor: game.color, bgcolor: "#191a22" },
              "&:focus-visible": { outline: `2px solid ${game.color}`, outlineOffset: 3 },
            }}
          >
            <IconDot color={game.color}>{game.icon}</IconDot>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" sx={{ fontSize: "1rem", fontWeight: 800 }}>{game.name}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: MUTED }}>{game.text}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ------------------------------------------------------------ battle

const BATTLE_MODES = [
  { name: "Tempo", text: "Maior PPM quando o relógio zerar.", players: "2 a 4 jogadores", to: "/battle" },
  { name: "Palavras", text: "Quem terminar o texto primeiro vence.", players: "2 a 4 jogadores", to: "/battle" },
  { name: "Perseguição", text: "Um cursor alcança um por um; quem sobrar vence.", players: "2 a 4 jogadores", to: "/battle" },
  { name: "Pavio", text: "Passe a bomba com uma palavra antes que ela exploda.", players: "2 a 8 jogadores", to: "/battle?mode=pavio" },
];

function BattleModes() {
  return (
    <Box component="section" aria-labelledby="home-battle" sx={{ maxWidth: 1000, mx: "auto", mt: { xs: 7, md: 9 } }}>
      <SectionTitle
        id="home-battle"
        kicker="BATTLE"
        title="Quatro jeitos de jogar com amigos"
        aside={
          <Button
            component={Link}
            to="/battle"
            variant="outlined"
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{
              borderRadius: 2, borderColor: "#353442", color: "#e4e4e7", fontWeight: 800, textTransform: "none",
              "&:hover": { borderColor: "#7dd3fc", bgcolor: "rgba(125,211,252,0.06)" },
            }}
          >
            Criar sala
          </Button>
        }
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.5 }}>
        {BATTLE_MODES.map((mode) => (
          <Box
            key={mode.name}
            component={Link}
            to={mode.to}
            sx={{
              ...CARD_SX, display: "flex", flexDirection: "column", gap: 0.75, p: 2.5,
              color: "inherit", textDecoration: "none",
              transition: "transform 180ms ease, border-color 180ms ease",
              "&:hover": { transform: "translateY(-3px)", borderColor: "#7dd3fc" },
              "&:focus-visible": { outline: "2px solid #7dd3fc", outlineOffset: 3 },
            }}
          >
            <Typography component="h3" sx={{ fontSize: "1rem", fontWeight: 800 }}>{mode.name}</Typography>
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.55, color: MUTED, flex: 1 }}>{mode.text}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#7dd3fc" }}>{mode.players}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function HomeExtras() {
  return (
    <>
      <DailyChallenges />
      <ArcadeGames />
      <BattleModes />
    </>
  );
}
