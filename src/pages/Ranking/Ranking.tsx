import { useEffect, useState, type ReactNode } from "react";

import {
  Alert,
  Avatar,
  Box,
  ButtonBase,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import DirectionsRunRoundedIcon from "@mui/icons-material/DirectionsRunRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";

import { LanguageAutocomplete } from "../../components/LanguageAutocomplete";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { UserTags } from "../../components/UserTags";
import { getArcadeRanking, getRanking, type Tag } from "../../services/api";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from "../../utils/textGenerator";

// Qual ranking está na tela. Os do Arcade também vêm pelo link (?tipo=pavio).
type Board = "time" | "words" | "pavio" | "orbita" | "chase" | "cifra";

const BOARDS: { value: Board; label: string; group: "Digitar" | "Arcade"; icon: ReactNode }[] = [
  { value: "time", label: "Tempo", group: "Digitar", icon: <TimerOutlinedIcon sx={{ fontSize: 18 }} /> },
  { value: "words", label: "Palavras", group: "Digitar", icon: <NotesRoundedIcon sx={{ fontSize: 18 }} /> },
  { value: "pavio", label: "Pavio", group: "Arcade", icon: <WhatshotRoundedIcon sx={{ fontSize: 18 }} /> },
  { value: "orbita", label: "Órbita", group: "Arcade", icon: <PublicRoundedIcon sx={{ fontSize: 18 }} /> },
  { value: "chase", label: "Perseguição", group: "Arcade", icon: <DirectionsRunRoundedIcon sx={{ fontSize: 18 }} /> },
  { value: "cifra", label: "Cifra", group: "Arcade", icon: <GridViewRoundedIcon sx={{ fontSize: 18 }} /> },
];

function isBoard(value: string | null): value is Board {
  return BOARDS.some((board) => board.value === value);
}

// Uma linha do ranking, já com o número principal e o detalhe de cada jogo.
interface RankingPlayer {
  position: number;
  userId: number;
  name: string;
  avatarUrl?: string | null;
  tags?: Tag[];
  value: string;
  detail: string;
}

const PURPLE = "#a78bfa";
const PANEL_BACKGROUND = "#171923";
const BORDER_COLOR = "rgba(167, 139, 250, 0.16)";

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

// Nome do número principal de cada ranking (no pódio e na lista).
const VALUE_LABEL: Record<Board, { long: string; short: string }> = {
  time: { long: "PALAVRAS POR MINUTO", short: "PPM" },
  words: { long: "PALAVRAS POR MINUTO", short: "PPM" },
  pavio: { long: "PALAVRAS NA BOMBA", short: "PALAVRAS" },
  orbita: { long: "PONTOS", short: "PONTOS" },
  chase: { long: "AGUENTOU", short: "AGUENTOU" },
  cifra: { long: "PALAVRAS CONTRA O RELÓGIO", short: "PALAVRAS" },
};

const toggleSx = {
  "& .MuiToggleButton-root": {
    px: { xs: 1.5, sm: 2.25 },
    py: 1,
    color: "#b7bac8",
    borderColor: "rgba(255,255,255,0.1)",
    fontWeight: 700,
    textTransform: "none",
    "&:hover": { backgroundColor: "rgba(167, 139, 250, 0.08)" },
    "&.Mui-selected": {
      color: "#eee7ff",
      backgroundColor: "rgba(124, 77, 255, 0.2)",
      borderColor: "rgba(167, 139, 250, 0.5)",
    },
    "&.Mui-selected:hover": { backgroundColor: "rgba(124, 77, 255, 0.28)" },
  },
};

export function Ranking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tipo = searchParams.get("tipo");
  const board: Board = isBoard(tipo) ? tipo : "time";

  const [duration, setDuration] = useState<number>(15);
  const [wordCount, setWordCount] = useState<number>(25);
  // Cada idioma tem seu próprio ranking; começa no português.
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  // O último ranking que chegou, marcado com os filtros dele: enquanto os
  // filtros da tela não batem com os dele, está carregando.
  const key = `${board}|${duration}|${wordCount}|${language}`;
  const [loaded, setLoaded] = useState<{ key: string; ranking: RankingPlayer[]; error: string }>({
    key: "",
    ranking: [],
    error: "",
  });
  const isLoading = loaded.key !== key;
  const ranking = isLoading ? [] : loaded.ranking;
  const error = isLoading ? "" : loaded.error;

  // Pavio e Órbita usam palavras em português; os outros têm idioma.
  const hasLanguage = board === "time" || board === "words" || board === "chase";

  function chooseBoard(next: Board) {
    setSearchParams(next === "time" ? {} : { tipo: next }, { replace: true });
  }

  // O ranking é público e não depende de autenticação.
  useEffect(() => {
    let isActive = true;

    async function load(): Promise<RankingPlayer[]> {
      if (board === "time" || board === "words") {
        const response = await getRanking(board === "time" ? duration : wordCount, language, board);
        return response.ranking.map((player) => ({
          ...player,
          value: String(player.ppm),
          detail:
            board === "words" && player.durationMs
              ? `Precisão: ${player.accuracy}% · ${formatSeconds(player.durationMs)}`
              : `Precisão: ${player.accuracy}%`,
        }));
      }

      const response = await getArcadeRanking(board, board === "chase" ? language : undefined);
      return response.ranking.map((player) => {
        const d = player.details;
        let value = String(player.score);
        let detail: string;
        if (board === "pavio") {
          detail = d.longest ? `Mais longa: ${d.longest}` : "";
        } else if (board === "cifra") {
          detail = d.last ? `Última: ${d.last}` : "";
        } else if (board === "orbita") {
          value = player.score.toLocaleString("pt-BR");
          detail = `Onda ${d.wave ?? "?"} · combo ${d.bestCombo ?? 0}`;
        } else {
          value = formatSeconds(player.score);
          detail = `${d.ppm ?? 0} PPM · precisão ${d.accuracy ?? 0}%`;
        }
        return { ...player, value, detail };
      });
    }

    load()
      .then((players) => {
        if (isActive) setLoaded({ key, ranking: players, error: "" });
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (isActive) {
          setLoaded({ key, ranking: [], error: "Não foi possível carregar o ranking. Tente novamente." });
        }
      });

    return () => {
      isActive = false;
    };
  }, [key, board, duration, wordCount, language]);

  const languageLabel =
    LANGUAGE_OPTIONS.find((option) => option.code === language)?.label ?? "Português";

  let description: string;
  let emptyHint: string;
  if (board === "time") {
    description = `Resultados em ${languageLabel} para testes de ${duration} segundos.`;
    emptyHint = `Complete um teste de ${duration} segundos para começar a classificação.`;
  } else if (board === "words") {
    description = `Resultados em ${languageLabel} para textos de ${wordCount} palavras.`;
    emptyHint = `Complete um teste de ${wordCount} palavras para começar a classificação.`;
  } else if (board === "pavio") {
    description = "Mais palavras antes da bomba explodir, no modo solo.";
    emptyHint = "Jogue o Pavio no Arcade para começar a classificação.";
  } else if (board === "cifra") {
    description = "Mais palavras descobertas na Cifra contra o relógio.";
    emptyHint = "Jogue a Cifra contra o relógio no Arcade para começar a classificação.";
  } else if (board === "orbita") {
    description = "Maior pontuação defendendo o núcleo.";
    emptyHint = "Jogue o Órbita no Arcade para começar a classificação.";
  } else {
    description = `Quem aguentou mais tempo à frente do perseguidor, em ${languageLabel}.`;
    emptyHint = "Jogue a Perseguição no Arcade para começar a classificação.";
  }

  function getInitials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  const valueLabel = VALUE_LABEL[board];
  const topThree = ranking
    .filter((player) => player.position >= 1 && player.position <= 3)
    .sort((a, b) => a.position - b.position);

  const remainingPlayers = ranking.filter((player) => player.position > 3);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        mx: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 6 },
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={{ xs: 3, md: 4 }}>
        {/* Cabeçalho */}
        <Box>
          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                display: "grid",
                placeItems: "center",
                borderRadius: 3,
                color: PURPLE,
                backgroundColor: "rgba(167, 139, 250, 0.12)",
                border: `1px solid ${BORDER_COLOR}`,
              }}
            >
              <EmojiEventsRoundedIcon sx={{ fontSize: 27 }} />
            </Box>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.8px", color: "#f5f3ff" }}>
                Ranking
              </Typography>
              <Typography variant="body2" sx={{ color: "#969bad", mt: 0.25 }}>
                Os melhores do TypeBattle no teste e no Arcade.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              height: 2,
              width: 72,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${PURPLE}, transparent)`,
              mt: 2,
            }}
          />
        </Box>

        {/* Qual ranking */}
        <Box
          role="radiogroup"
          aria-label="Escolha o ranking"
          sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 2, sm: 3 } }}
        >
          {(["Digitar", "Arcade"] as const).map((group) => (
            <Box key={group} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", color: "#969bad" }}>
                {group.toUpperCase()}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {BOARDS.filter((item) => item.group === group).map((item) => {
                  const selected = item.value === board;
                  return (
                    <ButtonBase
                      key={item.value}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseBoard(item.value)}
                      sx={{
                        gap: 0.75,
                        height: 40,
                        px: 1.75,
                        borderRadius: "10px",
                        fontFamily: "inherit",
                        fontSize: 14,
                        fontWeight: 700,
                        color: selected ? "#eee7ff" : "#b7bac8",
                        backgroundColor: selected ? "rgba(124, 77, 255, 0.2)" : PANEL_BACKGROUND,
                        border: `1px solid ${selected ? "rgba(167, 139, 250, 0.5)" : "rgba(255,255,255,0.08)"}`,
                        "&:hover": { backgroundColor: selected ? "rgba(124, 77, 255, 0.28)" : "rgba(167, 139, 250, 0.08)" },
                        "&.Mui-focusVisible": { outline: `2px solid ${PURPLE}`, outlineOffset: 2 },
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Filtros do ranking escolhido */}
        {hasLanguage && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              backgroundColor: PANEL_BACKGROUND,
              border: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, color: "#f5f3ff", mb: 0.5 }}>
                  {board === "time" ? "Idioma e duração" : board === "words" ? "Idioma e palavras" : "Idioma"}
                </Typography>
                <Typography variant="body2" sx={{ color: "#969bad" }}>
                  Cada idioma tem seu próprio ranking.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.5,
                  alignItems: { xs: "stretch", sm: "center" },
                }}
              >
                <Box sx={{ minWidth: { sm: 200 } }}>
                  <LanguageAutocomplete
                    value={language}
                    onChange={setLanguage}
                    ariaLabel="Idioma do ranking"
                    inputSx={{
                      "& .MuiOutlinedInput-root": {
                        color: "#eee7ff",
                        fontWeight: 700,
                        borderRadius: 2,
                        backgroundColor: "rgba(255,255,255,0.02)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                      "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(167, 139, 250, 0.5)",
                      },
                    }}
                  />
                </Box>

                {board === "time" && (
                  <ToggleButtonGroup
                    value={duration}
                    exclusive
                    onChange={(_event, value: number | null) => value !== null && setDuration(value)}
                    aria-label="Duração do teste"
                    sx={toggleSx}
                  >
                    <ToggleButton value={15}>15s</ToggleButton>
                    <ToggleButton value={30}>30s</ToggleButton>
                    <ToggleButton value={60}>60s</ToggleButton>
                  </ToggleButtonGroup>
                )}

                {board === "words" && (
                  <ToggleButtonGroup
                    value={wordCount}
                    exclusive
                    onChange={(_event, value: number | null) => value !== null && setWordCount(value)}
                    aria-label="Quantidade de palavras"
                    sx={toggleSx}
                  >
                    {[10, 25, 50, 100].map((count) => (
                      <ToggleButton key={count} value={count}>
                        {count}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Título da classificação */}
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#f5f3ff", letterSpacing: "-0.4px" }}>
            Melhores jogadores
          </Typography>
          <Typography variant="body2" sx={{ color: "#969bad", mt: 0.5 }}>
            {description}
          </Typography>
        </Box>

        {/* Carregamento */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 8,
              gap: 2,
            }}
          >
            <CircularProgress size={34} sx={{ color: PURPLE }} />
            <Typography variant="body2" sx={{ color: "#969bad" }}>
              Carregando classificação...
            </Typography>
          </Box>
        )}

        {/* Erro */}
        {!isLoading && error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Ranking vazio */}
        {!isLoading && !error && ranking.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, sm: 6 },
              textAlign: "center",
              borderRadius: 3,
              backgroundColor: PANEL_BACKGROUND,
              border: `1px solid ${BORDER_COLOR}`,
            }}
          >
            <EmojiEventsRoundedIcon sx={{ fontSize: 48, color: "#686b7b", mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#f5f3ff", mb: 1 }}>
              Ainda não há resultados
            </Typography>
            <Typography variant="body2" sx={{ color: "#969bad" }}>
              {emptyHint}
            </Typography>
          </Paper>
        )}

        {/* Pódio */}
        {!isLoading && !error && topThree.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {topThree.map((player) => {
              const isFirst = player.position === 1;
              const isSecond = player.position === 2;
              const medalColor = isFirst ? "#f5c451" : isSecond ? "#c5cbd8" : "#d99a68";

              return (
                <Paper
                  key={player.userId}
                  elevation={0}
                  component={RouterLink}
                  to={`/jogador/${player.userId}`}
                  sx={{
                    display: "block",
                    color: "inherit",
                    textDecoration: "none",
                    order: { xs: player.position, sm: isFirst ? 0 : isSecond ? -1 : 1 },
                    position: "relative",
                    overflow: "hidden",
                    p: { xs: 2.5, sm: 2 },
                    borderRadius: 3,
                    textAlign: "center",
                    background: isFirst
                      ? "linear-gradient(155deg, rgba(124,77,255,0.2), #171923 70%)"
                      : PANEL_BACKGROUND,
                    border: `1px solid ${isFirst ? "rgba(167,139,250,0.45)" : BORDER_COLOR}`,
                    transition: "transform 160ms ease, border-color 160ms ease",
                    "&:hover": { transform: "translateY(-3px)", borderColor: "rgba(167,139,250,0.55)" },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      backgroundColor: medalColor,
                      opacity: isFirst ? 1 : 0.75,
                    }}
                  />

                  <MilitaryTechRoundedIcon sx={{ color: medalColor, fontSize: 30, mb: 1 }} />

                  <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                    <Avatar
                      src={player.avatarUrl ?? undefined}
                      alt={player.name}
                      sx={{
                        width: 58,
                        height: 58,
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "#f5f3ff",
                        backgroundColor: "rgba(167,139,250,0.18)",
                        border: `2px solid ${medalColor}`,
                      }}
                    >
                      {getInitials(player.name)}
                    </Avatar>
                  </Box>

                  <Typography variant="body2" sx={{ color: medalColor, fontWeight: 800, mb: 0.5 }}>
                    {player.position}º LUGAR
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.75,
                      mb: 2,
                    }}
                  >
                    <Typography sx={{ color: "#f5f3ff", fontWeight: 700, fontSize: "1rem", overflowWrap: "anywhere" }}>
                      {player.name}
                    </Typography>
                    <UserTags tags={player.tags} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: "2rem", sm: "1.8rem" },
                      fontWeight: 800,
                      color: PURPLE,
                      lineHeight: 1.2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {player.value}
                  </Typography>

                  <Typography variant="caption" sx={{ color: "#969bad", fontWeight: 600 }}>
                    {valueLabel.long}
                  </Typography>

                  {player.detail && (
                    <Box
                      sx={{
                        mt: 2,
                        pt: 1.5,
                        borderTop: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#c4c7d1", overflowWrap: "anywhere" }}>
                        {player.detail}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}

        {/* Demais posições */}
        {!isLoading && !error && remainingPlayers.length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ color: "#c4c7d1", fontWeight: 700, mb: 1.5 }}>
              Classificação geral
            </Typography>

            <Paper
              elevation={0}
              sx={{
                overflow: "hidden",
                borderRadius: 3,
                backgroundColor: PANEL_BACKGROUND,
                border: `1px solid ${BORDER_COLOR}`,
              }}
            >
              {remainingPlayers.map((player, index) => (
                <Box
                  key={player.userId}
                  component={RouterLink}
                  to={`/jogador/${player.userId}`}
                  sx={{
                    color: "inherit",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1.5, sm: 2 },
                    px: { xs: 1.5, sm: 2.5 },
                    py: 2,
                    borderBottom:
                      index < remainingPlayers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    transition: "background-color 150ms ease",
                    "&:hover": { backgroundColor: "rgba(167,139,250,0.05)" },
                  }}
                >
                  <Box sx={{ minWidth: 34, color: "#969bad", fontWeight: 800, textAlign: "center" }}>
                    #{player.position}
                  </Box>

                  <Avatar
                    src={player.avatarUrl ?? undefined}
                    alt={player.name}
                    sx={{
                      width: 40,
                      height: 40,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#e9ddff",
                      backgroundColor: "rgba(167,139,250,0.15)",
                    }}
                  >
                    {getInitials(player.name)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: "#f5f3ff",
                        fontWeight: 700,
                        overflowWrap: "anywhere",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        columnGap: 1,
                        rowGap: 0.5,
                      }}
                    >
                      {player.name}
                      <UserTags tags={player.tags} />
                    </Typography>

                    {player.detail && (
                      <Typography variant="body2" sx={{ color: "#969bad", overflowWrap: "anywhere" }}>
                        {player.detail}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography
                      sx={{ color: PURPLE, fontSize: "1.15rem", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                    >
                      {player.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#969bad" }}>
                      {valueLabel.short}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
