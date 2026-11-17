import type { ReactNode } from "react";
import { Box, Button, ButtonBase, Tooltip, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DirectionsRunRoundedIcon from "@mui/icons-material/DirectionsRunRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

import { LanguageAutocomplete } from "../../../components/LanguageAutocomplete";
import { UserTags } from "../../../components/UserTags";
import { DEFAULT_LANGUAGE, languageHasDifficulty } from "../../../utils/textGenerator";
import { getFormatLabel, getPlayerColor } from "../battleUtils";
import { cardSx, colors, ghostButtonSx, labelSx, monoFont, primaryButtonSx } from "../styles";
import type { BattleMode, BattleRoom, RoomSettings } from "../types";
import { PlayerAvatar } from "./PlayerAvatar";

interface BattleLobbyProps {
  room: BattleRoom;
  myId: string | null;
  connected: boolean;
  onUpdateSettings: (settings: RoomSettings) => void;
  onStart: () => void;
  onLeave: () => void;
  onCopyInvite: () => void;
  onCopyCode: () => void;
}

const MODES: { value: BattleMode; label: string; description: string; icon: ReactNode; isNew?: boolean }[] = [
  {
    value: "time",
    label: "Tempo",
    description: "Mais PPM quando o relógio acabar vence.",
    icon: <TimerOutlinedIcon sx={{ fontSize: 28, color: colors.accent }} />,
  },
  {
    value: "words",
    label: "Palavras",
    description: "Quem terminar o texto primeiro, sem erros.",
    icon: <NotesRoundedIcon sx={{ fontSize: 28, color: colors.cyan }} />,
  },
  {
    value: "chase",
    label: "Perseguição",
    description: "Um cursor acelera atrás de todos. Sobrevive quem aguentar.",
    icon: <DirectionsRunRoundedIcon sx={{ fontSize: 28, color: "#ff5c7a" }} />,
  },
  {
    value: "pavio",
    label: "Pavio",
    description: "A bomba passa de mão. Faça uma palavra com as letras dela.",
    icon: <WhatshotRoundedIcon sx={{ fontSize: 28, color: "#fdba74" }} />,
    isNew: true,
  },
];

function modeSummary(settings: RoomSettings): string {
  const format = getFormatLabel(settings.format).toLowerCase();
  if (settings.mode === "pavio") return `Pavio · 2 vidas · ${format}`;
  if (settings.mode === "chase") return `Perseguição · ${format}`;
  if (settings.mode === "words") return `Palavras · ${settings.wordCount} · ${format}`;
  return `Tempo · ${settings.duration} s · ${format}`;
}

// Opções lado a lado, compactas (linha de ajuste).
function Pills<T extends string | number>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <Box role="radiogroup" aria-label={label} sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, p: 0.5, borderRadius: "10px", bgcolor: colors.background }}>
      {options.map((option) => {
        const selected = option.value === value;
        const isDisabled = disabled || option.disabled;
        return (
          <ButtonBase
            key={option.value}
            role="radio"
            aria-checked={selected}
            disabled={isDisabled}
            onClick={() => !selected && onChange(option.value)}
            sx={{
              height: 32, px: 1.5, minWidth: 44, borderRadius: "8px", fontFamily: "inherit", fontSize: 14, fontWeight: 700,
              bgcolor: selected ? colors.primary : "transparent",
              color: selected ? "#fff" : colors.textSecondary,
              opacity: isDisabled && !selected ? 0.45 : 1,
              "&:hover": { bgcolor: selected ? colors.primary : "rgba(124,77,255,0.12)" },
              "&.Mui-disabled": { color: selected ? "#fff" : colors.textSecondary },
              "&.Mui-focusVisible": { outline: `2px solid ${colors.accent}`, outlineOffset: 2 },
            }}
          >
            {option.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

function ToggleChip({ label, checked, disabled, onToggle }: { label: string; checked: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <ButtonBase
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      sx={{
        height: 32, px: 1.5, borderRadius: 999, fontFamily: "inherit", fontSize: 13, fontWeight: checked ? 700 : 600,
        border: `1px solid ${checked ? "rgba(167,139,250,0.55)" : colors.borderStrong}`,
        bgcolor: checked ? "rgba(124,77,255,0.14)" : "transparent",
        color: checked ? colors.accentSoft : colors.textSecondary,
        "&.Mui-focusVisible": { outline: `2px solid ${colors.accent}`, outlineOffset: 2 },
      }}
    >
      {label}
    </ButtonBase>
  );
}

function SettingRow({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 1.5, py: 1.5,
        borderBottom: last ? "none" : `1px solid ${colors.border}`,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: colors.textMuted }}>{label}</Typography>
      {children}
    </Box>
  );
}

// Sala de espera: modo, lugares dos jogadores, ajustes e início.
export function BattleLobby({
  room,
  myId,
  connected,
  onUpdateSettings,
  onStart,
  onLeave,
  onCopyInvite,
  onCopyCode,
}: BattleLobbyProps) {
  const { settings } = room;
  const isHost = room.hostSocketId === myId;
  const canEdit = isHost && connected;
  const emptySlots = Math.max(0, settings.playerLimit - room.players.length);
  const roomIsFull = emptySlots === 0;
  const someoneReconnecting = room.players.some((player) => player.connected === false);
  // O Pavio usa sílabas em português: idioma, dificuldade e texto não se aplicam.
  const isPavio = settings.mode === "pavio";
  const language = settings.language ?? DEFAULT_LANGUAGE;

  function change<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
    onUpdateSettings({ ...settings, [key]: value });
  }

  // O Pavio aceita até 8 jogadores; os outros modos, até 4. Saindo do Pavio,
  // a capacidade volta para no máximo 4.
  const maxPlayers = isPavio ? 8 : 4;
  const tooManyForRace = room.players.length > 4;

  function changeMode(mode: BattleMode) {
    const limit = mode === "pavio" ? settings.playerLimit : Math.min(settings.playerLimit, 4);
    onUpdateSettings({ ...settings, mode, playerLimit: limit as RoomSettings["playerLimit"] });
  }

  const lastSeries = room.lastSeriesResult;
  const lastSeriesWinner = lastSeries?.players.find((player) => player.socketId === lastSeries.winnerSocketId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.75 }}>
      {/* Cabeçalho da sala */}
      <Box
        sx={{
          ...cardSx, borderRadius: "20px", px: { xs: 2.5, sm: 3.25 }, py: 2.5,
          display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2,
          borderColor: "rgba(167,139,250,0.22)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Typography sx={{ ...labelSx, letterSpacing: "2px" }}>SALA</Typography>
            <Tooltip title="Clique para copiar o código" placement="bottom-start">
              <ButtonBase
                onClick={onCopyCode}
                aria-label={`Copiar código da sala ${room.code}`}
                sx={{
                  alignSelf: "flex-start", gap: 1.25, ml: -1, px: 1, borderRadius: "10px",
                  fontFamily: monoFont, fontWeight: 800, fontSize: { xs: 28, sm: 36 }, letterSpacing: { xs: 4, sm: 6 },
                  color: "#fff", "&:hover": { bgcolor: "rgba(124,77,255,0.12)" },
                  "&:hover .copy-icon": { color: colors.accentSoft },
                  "&.Mui-focusVisible": { outline: `2px solid ${colors.accent}`, outlineOffset: 2 },
                }}
              >
                <span>
                  {room.code.slice(0, 4)}
                  <Box component="span" sx={{ color: colors.accent }}>{room.code.slice(4)}</Box>
                </span>
                <ContentCopyRoundedIcon className="copy-icon" sx={{ fontSize: 20, color: colors.textSecondary }} />
              </ButtonBase>
            </Tooltip>
          </Box>
          <Box sx={{ display: { xs: "none", sm: "block" }, width: "1px", height: 48, bgcolor: colors.borderStrong }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Typography sx={{ ...labelSx, letterSpacing: "2px" }}>MODO</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{modeSummary(settings)}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
          <Button
            variant="contained"
            startIcon={<LinkRoundedIcon />}
            onClick={onCopyInvite}
            sx={{ ...primaryButtonSx, height: 46, fontSize: 15, fontWeight: 700, px: 2.25 }}
          >
            Convidar amigos
          </Button>
          <Button variant="outlined" onClick={onLeave} sx={{ ...ghostButtonSx, height: 46 }}>
            Sair
          </Button>
        </Box>
      </Box>

      {lastSeries && (
        <Box sx={{ ...cardSx, px: 3, py: 1.75, display: "flex", alignItems: "center", gap: 1.5, borderColor: "rgba(250,204,21,0.25)" }}>
          <WorkspacePremiumRoundedIcon sx={{ color: colors.gold }} />
          <Typography sx={{ fontSize: 14, color: colors.textMuted }}>
            Última série:{" "}
            <Box component="strong" sx={{ color: "#fff" }}>
              {lastSeriesWinner ? `${lastSeriesWinner.nickname} venceu` : "terminou empatada"}
            </Box>{" "}
            · {lastSeries.players.map((player) => `${player.nickname} ${lastSeries.wins[player.socketId] ?? 0}`).join(" · ")}
          </Typography>
        </Box>
      )}

      {/* Modo de jogo */}
      <Box component="section" aria-labelledby="lobby-mode" sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
          <Typography id="lobby-mode" component="h2" sx={{ fontSize: 18, fontWeight: 800 }}>Modo de jogo</Typography>
          <Typography sx={{ color: colors.textSecondary, fontSize: 13 }}>
            {isHost ? "Você é o anfitrião · muda na hora para todos" : "Só o anfitrião pode alterar"}
          </Typography>
        </Box>
        <Box role="radiogroup" aria-labelledby="lobby-mode" sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1.75 }}>
          {MODES.map((mode) => {
            const selected = settings.mode === mode.value;
            // Com mais de 4 na sala, só o Pavio comporta todo mundo.
            const blocked = mode.value !== "pavio" && tooManyForRace;
            return (
              <ButtonBase
                key={mode.value}
                role="radio"
                aria-checked={selected}
                disabled={!canEdit || blocked}
                title={blocked ? "Este modo é para até 4 jogadores" : undefined}
                onClick={() => !selected && changeMode(mode.value)}
                sx={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.1, p: 2.25, textAlign: "left",
                  borderRadius: "16px", fontFamily: "inherit", color: "#fff",
                  bgcolor: selected ? "rgba(124,77,255,0.14)" : colors.paper,
                  border: `2px solid ${selected ? colors.primary : colors.border}`,
                  transition: "border-color 150ms ease, background-color 150ms ease",
                  "&:hover": { borderColor: selected ? colors.primary : "rgba(167,139,250,0.35)" },
                  "&.Mui-disabled": { opacity: selected ? 1 : 0.6 },
                  "&.Mui-focusVisible": { outline: `2px solid ${colors.accent}`, outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  {mode.icon}
                  {selected ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 22, color: colors.primary }} />
                  ) : mode.isNew ? (
                    <Box component="span" sx={{ fontSize: 11, fontWeight: 800, color: "#d6c8ff", bgcolor: "rgba(124,77,255,0.2)", borderRadius: 999, px: 1, py: 0.25 }}>
                      NOVO
                    </Box>
                  ) : null}
                </Box>
                <Typography sx={{ fontSize: 17, fontWeight: 800 }}>{mode.label}</Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: selected ? "#c9c2e8" : colors.textSecondary }}>
                  {mode.description}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.15fr) minmax(0, 1fr)" }, gap: 2.25, alignItems: "start" }}>
        {/* Jogadores */}
        <Box component="section" aria-labelledby="lobby-players" sx={{ ...cardSx, borderRadius: "20px", p: 2.75, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography id="lobby-players" component="h2" sx={{ fontSize: 18, fontWeight: 800 }}>Jogadores</Typography>
            <Typography sx={{ fontFamily: monoFont, fontWeight: 700, color: colors.textSecondary }}>
              {room.players.length}/{settings.playerLimit}
            </Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.75 }}>
            {room.players.map((player) => {
              const isMe = player.socketId === myId;
              const color = getPlayerColor(room, player.socketId);
              const isReconnecting = player.connected === false;
              const isRoomHost = player.socketId === room.hostSocketId;
              return (
                <Box
                  key={player.socketId}
                  sx={{
                    px: 2, py: 2.5, borderRadius: "16px", bgcolor: colors.background, minWidth: 0,
                    border: `1px solid ${isMe ? "rgba(167,139,250,0.45)" : colors.border}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 0.9, textAlign: "center",
                    opacity: isReconnecting ? 0.55 : 1,
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <PlayerAvatar nickname={player.nickname} avatarUrl={player.avatarUrl} color={color} size={68} round />
                    {isRoomHost && (
                      <Tooltip title="Anfitrião">
                        <Box
                          aria-label="Anfitrião"
                          sx={{ position: "absolute", right: -4, top: -4, width: 26, height: 26, borderRadius: "50%", bgcolor: colors.gold, display: "grid", placeItems: "center" }}
                        >
                          <WorkspacePremiumRoundedIcon sx={{ fontSize: 16, color: colors.background }} />
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                  <Typography noWrap sx={{ maxWidth: "100%", fontWeight: 800, fontSize: 16 }}>
                    {player.nickname}
                    {isMe && <Box component="span" sx={{ color: colors.textSecondary, fontWeight: 500 }}> (você)</Box>}
                  </Typography>
                  <UserTags tags={player.tags} sx={{ justifyContent: "center" }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: isReconnecting ? colors.textSecondary : "#4ade80" }}>
                    {isReconnecting ? "Reconectando…" : "Pronto"}
                  </Typography>
                </Box>
              );
            })}

            {Array.from({ length: emptySlots }, (_, index) => (
              <Box
                key={`empty-${index}`}
                sx={{
                  px: 2, py: 2.5, borderRadius: "16px", border: "2px dashed rgba(255,255,255,0.14)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.25,
                }}
              >
                <Box sx={{ width: 68, height: 68, borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.22)", display: "grid", placeItems: "center", color: colors.textSecondary }}>
                  <AddRoundedIcon />
                </Box>
                <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>Lugar vago</Typography>
                <Button
                  size="small"
                  onClick={onCopyInvite}
                  sx={{
                    textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 1.75,
                    color: colors.accentSoft, border: "1px solid rgba(167,139,250,0.45)", bgcolor: "rgba(124,77,255,0.12)",
                    "&:hover": { bgcolor: "rgba(124,77,255,0.2)" },
                  }}
                >
                  Copiar convite
                </Button>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Ajustes */}
        <Box component="section" aria-labelledby="lobby-settings" sx={{ ...cardSx, borderRadius: "20px", px: 2.75, py: 2.25, display: "flex", flexDirection: "column" }}>
          <Typography id="lobby-settings" component="h2" sx={{ fontSize: 18, fontWeight: 800, mb: 0.5 }}>Ajustes</Typography>

          {settings.mode === "time" && (
            <SettingRow label="Duração">
              <Pills label="Duração" value={settings.duration} disabled={!canEdit} onChange={(value) => change("duration", value)}
                options={[{ value: 15, label: "15 s" }, { value: 30, label: "30 s" }, { value: 60, label: "60 s" }]} />
            </SettingRow>
          )}
          {settings.mode === "words" && (
            <SettingRow label="Palavras">
              <Pills label="Palavras" value={settings.wordCount} disabled={!canEdit} onChange={(value) => change("wordCount", value)}
                options={([10, 25, 50, 100] as const).map((count) => ({ value: count, label: String(count) }))} />
            </SettingRow>
          )}
          <SettingRow label="Formato">
            <Pills label="Formato" value={settings.format} disabled={!canEdit} onChange={(value) => change("format", value)}
              options={[{ value: "single", label: "Única" }, { value: "best-of-3", label: "Melhor de 3" }, { value: "best-of-5", label: "Melhor de 5" }]} />
          </SettingRow>
          <SettingRow label="Jogadores" last={isPavio}>
            <Pills label="Jogadores" value={settings.playerLimit} disabled={!canEdit} onChange={(value) => change("playerLimit", value)}
              options={([2, 3, 4, 5, 6, 7, 8] as const)
                .filter((amount) => amount <= maxPlayers)
                .map((amount) => ({ value: amount, label: String(amount), disabled: amount < room.players.length }))} />
          </SettingRow>

          {!isPavio && (
            <>
              <SettingRow label="Idioma">
                <LanguageAutocomplete
                  value={language}
                  disabled={!canEdit}
                  onChange={(code) => change("language", code)}
                  ariaLabel="Idioma do texto"
                  inputSx={{
                    width: 180,
                    "& .MuiOutlinedInput-root": { height: 40, borderRadius: "10px", bgcolor: colors.background, color: "#fff", fontSize: 14, fontWeight: 700 },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.borderStrong },
                    "& .Mui-disabled input": { WebkitTextFillColor: colors.textSecondary },
                    "& .MuiSvgIcon-root": { color: colors.textSecondary },
                  }}
                />
              </SettingRow>
              {languageHasDifficulty(language) && (
                <SettingRow label="Dificuldade">
                  <Pills label="Dificuldade" value={settings.difficulty} disabled={!canEdit} onChange={(value) => change("difficulty", value)}
                    options={[{ value: "easy", label: "Fácil" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difícil" }]} />
                </SettingRow>
              )}
              <SettingRow label="Texto" last>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  <ToggleChip label="Acentos" checked={settings.accents} disabled={!canEdit} onToggle={() => change("accents", !settings.accents)} />
                  <ToggleChip label="Maiúsculas" checked={settings.uppercase} disabled={!canEdit} onToggle={() => change("uppercase", !settings.uppercase)} />
                  <ToggleChip label="Pontuação" checked={settings.punctuation} disabled={!canEdit} onToggle={() => change("punctuation", !settings.punctuation)} />
                </Box>
              </SettingRow>
            </>
          )}

          {isPavio && (
            <Typography sx={{ mt: 1.5, fontSize: 13, color: colors.textSecondary, lineHeight: 1.55 }}>
              Na sua vez, escreva uma palavra com as letras da bomba juntas (com AB vale cabo, não carbo).
              Cada um tem 2 vidas; quem estiver com a bomba quando ela explodir perde uma. Palavras em
              português, acento opcional.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Barra de início */}
      <Box
        sx={{
          ...cardSx, borderRadius: "20px", py: 2, pr: 2, pl: 3,
          display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 0.75 }} aria-hidden="true">
            {Array.from({ length: settings.playerLimit }, (_, index) => (
              <Box key={index} sx={{ width: 30, height: 8, borderRadius: 4, bgcolor: index < room.players.length ? colors.accent : "#2b3038" }} />
            ))}
          </Box>
          <Typography sx={{ color: colors.textSecondary, fontSize: 15 }}>
            {!roomIsFull ? (
              <>
                Falta{emptySlots > 1 ? "m" : ""}{" "}
                <Box component="strong" sx={{ color: "#fff" }}>
                  {emptySlots} {emptySlots === 1 ? "jogador" : "jogadores"}
                </Box>{" "}
                para começar
              </>
            ) : someoneReconnecting ? (
              "Aguardando um jogador reconectar…"
            ) : isHost ? (
              "Todo mundo chegou. Pode começar!"
            ) : (
              "Todo mundo chegou. Aguardando o anfitrião iniciar."
            )}
          </Typography>
        </Box>

        {isHost && (
          <Button
            variant="contained"
            onClick={onStart}
            disabled={!connected || !roomIsFull || someoneReconnecting}
            sx={{ ...primaryButtonSx, minWidth: 240, px: 3 }}
          >
            Iniciar battle
          </Button>
        )}
      </Box>
    </Box>
  );
}
