import { Box, Button, ButtonBase, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";

import { LanguageAutocomplete } from "../../../components/LanguageAutocomplete";
import {
  DEFAULT_LANGUAGE,
  languageHasDifficulty,
} from "../../../utils/textGenerator";
import { getPlayerColor } from "../battleUtils";
import {
  cardSx,
  colors,
  ghostButtonSx,
  labelSx,
  monoFont,
  primaryButtonSx,
} from "../styles";
import type { BattleRoom, RoomSettings } from "../types";
import { SegmentedControl } from "./SegmentedControl";

interface BattleLobbyProps {
  room: BattleRoom;
  myId: string | null;
  connected: boolean;
  onUpdateSettings: (settings: RoomSettings) => void;
  onStart: () => void;
  onLeave: () => void;
  onCopyInvite: () => void;
}

interface ToggleChipProps {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function ToggleChip({ label, checked, disabled, onToggle }: ToggleChipProps) {
  return (
    <ButtonBase
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      sx={{
        display: "inline-flex",
        gap: 1,
        height: 40,
        px: 1.75,
        borderRadius: "10px",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: checked ? 700 : 600,
        border: `1px solid ${
          checked ? "rgba(167,139,250,0.55)" : colors.borderStrong
        }`,
        bgcolor: checked ? "rgba(124,77,255,0.14)" : "transparent",
        color: checked ? colors.accentSoft : colors.textSecondary,
        "&.Mui-focusVisible": {
          outline: `2px solid ${colors.accent}`,
          outlineOffset: 2,
        },
      }}
    >
      {checked && <CheckRoundedIcon sx={{ fontSize: 18 }} />}
      {label}
    </ButtonBase>
  );
}

// Sala de espera: jogadores, regras (editáveis pelo anfitrião) e início.
export function BattleLobby({
  room,
  myId,
  connected,
  onUpdateSettings,
  onStart,
  onLeave,
  onCopyInvite,
}: BattleLobbyProps) {
  const { settings } = room;
  const isHost = room.hostSocketId === myId;
  const canEdit = isHost && connected;
  const emptySlots = Math.max(0, settings.playerLimit - room.players.length);
  const roomIsFull = emptySlots === 0;

  function change<K extends keyof RoomSettings>(
    key: K,
    value: RoomSettings[K],
  ) {
    onUpdateSettings({ ...settings, [key]: value });
  }

  const lastSeries = room.lastSeriesResult;
  const lastSeriesWinner = lastSeries?.players.find(
    (player) => player.socketId === lastSeries.winnerSocketId,
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          ...cardSx,
          px: 3,
          py: 2.5,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          borderColor: "rgba(167,139,250,0.22)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography sx={{ ...labelSx, letterSpacing: "2px" }}>
            CÓDIGO DA SALA
          </Typography>
          <Typography
            sx={{
              fontFamily: monoFont,
              fontWeight: 700,
              fontSize: { xs: 28, sm: 34 },
              letterSpacing: { xs: 4, sm: 6 },
            }}
          >
            {room.code.slice(0, 4)}
            <Box component="span" sx={{ color: colors.accent }}>
              {room.code.slice(4)}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
          <Button
            variant="outlined"
            startIcon={<LinkRoundedIcon />}
            onClick={onCopyInvite}
            sx={{
              ...ghostButtonSx,
              fontWeight: 700,
              color: colors.accentSoft,
              borderColor: "rgba(167,139,250,0.45)",
              bgcolor: "rgba(124,77,255,0.12)",
              "&:hover": {
                borderColor: colors.accent,
                bgcolor: "rgba(124,77,255,0.18)",
              },
            }}
          >
            Copiar link de convite
          </Button>
          <Button variant="outlined" onClick={onLeave} sx={ghostButtonSx}>
            Sair da sala
          </Button>
        </Box>
      </Box>

      {lastSeries && (
        <Box
          sx={{
            ...cardSx,
            px: 3,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderColor: "rgba(250,204,21,0.25)",
          }}
        >
          <WorkspacePremiumRoundedIcon sx={{ color: colors.gold }} />
          <Typography sx={{ fontSize: 14, color: colors.textMuted }}>
            Última série:{" "}
            <Box component="strong" sx={{ color: "#ffffff" }}>
              {lastSeriesWinner
                ? `${lastSeriesWinner.nickname} venceu`
                : "terminou empatada"}
            </Box>{" "}
            ·{" "}
            {lastSeries.players
              .map(
                (player) =>
                  `${player.nickname} ${lastSeries.wins[player.socketId] ?? 0}`,
              )
              .join(" · ")}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Box
          component="section"
          aria-labelledby="lobby-players"
          sx={{
            ...cardSx,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 1.75,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Typography
              id="lobby-players"
              component="h2"
              sx={{ fontSize: 18, fontWeight: 800 }}
            >
              Jogadores
            </Typography>
            <Typography
              sx={{
                fontFamily: monoFont,
                fontWeight: 700,
                color: colors.textSecondary,
              }}
            >
              {room.players.length}/{settings.playerLimit}
            </Typography>
          </Box>

          {room.players.map((player) => {
            const isMe = player.socketId === myId;
            const color = getPlayerColor(room, player.socketId);

            return (
              <Box
                key={player.socketId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.75,
                  px: 1.75,
                  py: 1.5,
                  borderRadius: "12px",
                  bgcolor: colors.background,
                  border: `1px solid ${isMe ? "rgba(167,139,250,0.45)" : colors.border}`,
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    bgcolor: color,
                    color: colors.background,
                    fontWeight: 900,
                    fontSize: 17,
                  }}
                >
                  {player.nickname.charAt(0).toUpperCase()}
                </Box>
                <Typography
                  noWrap
                  sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15 }}
                >
                  {player.nickname}
                  {isMe && (
                    <Box
                      component="span"
                      sx={{ color: colors.textSecondary, fontWeight: 500 }}
                    >
                      {" "}
                      (você)
                    </Box>
                  )}
                </Typography>
                {player.socketId === room.hostSocketId && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: "rgba(250,204,21,0.12)",
                      color: colors.gold,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <WorkspacePremiumRoundedIcon sx={{ fontSize: 15 }} />
                    Anfitrião
                  </Box>
                )}
              </Box>
            );
          })}

          {Array.from({ length: emptySlots }, (_, index) => (
            <Box
              key={`empty-${index}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                px: 1.75,
                py: 1.5,
                borderRadius: "12px",
                border: "1px dashed rgba(255,255,255,0.16)",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  color: colors.textSecondary,
                }}
              >
                <AddRoundedIcon fontSize="small" />
              </Box>
              <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
                Vaga aberta — aguardando jogador…
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          component="section"
          aria-labelledby="lobby-rules"
          sx={{
            ...cardSx,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2.25,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 1.5,
            }}
          >
            <Typography
              id="lobby-rules"
              component="h2"
              sx={{ fontSize: 18, fontWeight: 800 }}
            >
              Regras
            </Typography>
            <Typography sx={{ color: colors.textSecondary, fontSize: 12 }}>
              {isHost
                ? "Você é o anfitrião · aplica na hora"
                : "Só o anfitrião pode alterar"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography id="lobby-language" sx={labelSx}>
              IDIOMA
            </Typography>
            <LanguageAutocomplete
              value={settings.language ?? DEFAULT_LANGUAGE}
              disabled={!canEdit}
              onChange={(code) => change("language", code)}
              labelId="lobby-language"
              inputSx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 48,
                  borderRadius: "10px",
                  bgcolor: colors.background,
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 700,
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "transparent",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                  { borderColor: colors.borderStrong },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  { borderColor: colors.accent },
                "& .Mui-disabled input": {
                  WebkitTextFillColor: colors.textSecondary,
                },
                "& .MuiSvgIcon-root": { color: colors.textSecondary },
              }}
            />
          </Box>
          {/* Alguns idiomas têm uma lista só, sem dificuldade. */}
          {languageHasDifficulty(settings.language ?? DEFAULT_LANGUAGE) && (
            <SegmentedControl
              label="Dificuldade"
              value={settings.difficulty}
              disabled={!canEdit}
              onChange={(value) => change("difficulty", value)}
              options={[
                { value: "easy", label: "Fácil" },
                { value: "normal", label: "Normal" },
                { value: "hard", label: "Difícil" },
              ]}
            />
          )}
          <SegmentedControl
            label="Duração"
            value={settings.duration}
            disabled={!canEdit}
            onChange={(value) => change("duration", value)}
            options={[
              { value: 15, label: "15 s" },
              { value: 30, label: "30 s" },
              { value: 60, label: "60 s" },
            ]}
          />
          <SegmentedControl
            label="Formato"
            value={settings.format}
            disabled={!canEdit}
            onChange={(value) => change("format", value)}
            options={[
              { value: "single", label: "Única" },
              { value: "best-of-3", label: "Melhor de 3" },
              { value: "best-of-5", label: "Melhor de 5" },
            ]}
          />
          <SegmentedControl
            label="Jogadores"
            value={settings.playerLimit}
            disabled={!canEdit}
            onChange={(value) => change("playerLimit", value)}
            options={([2, 3, 4] as const).map((amount) => ({
              value: amount,
              label: String(amount),
              // Não dá para reduzir abaixo de quem já está na sala.
              disabled: amount < room.players.length,
            }))}
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography sx={labelSx}>TEXTO</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <ToggleChip
                label="Acentos"
                checked={settings.accents}
                disabled={!canEdit}
                onToggle={() => change("accents", !settings.accents)}
              />
              <ToggleChip
                label="Maiúsculas"
                checked={settings.uppercase}
                disabled={!canEdit}
                onToggle={() => change("uppercase", !settings.uppercase)}
              />
              <ToggleChip
                label="Pontuação"
                checked={settings.punctuation}
                disabled={!canEdit}
                onToggle={() => change("punctuation", !settings.punctuation)}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          ...cardSx,
          py: 2,
          pr: 2,
          pl: 3,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography sx={{ color: colors.textSecondary, fontSize: 14 }}>
          {!roomIsFull ? (
            <>
              Falta{emptySlots > 1 ? "m" : ""}{" "}
              <Box component="strong" sx={{ color: "#ffffff" }}>
                {emptySlots} {emptySlots === 1 ? "jogador" : "jogadores"}
              </Box>{" "}
              para iniciar.
            </>
          ) : isHost ? (
            "Todo mundo chegou. Pode começar!"
          ) : (
            "Todo mundo chegou. Aguardando o anfitrião iniciar."
          )}
        </Typography>

        {isHost && (
          <Button
            variant="contained"
            onClick={onStart}
            disabled={!connected || !roomIsFull}
            sx={{ ...primaryButtonSx, minWidth: 240, px: 3 }}
          >
            {roomIsFull
              ? "Iniciar batalha"
              : `Iniciar batalha (${room.players.length}/${settings.playerLimit})`}
          </Button>
        )}
      </Box>
    </Box>
  );
}
