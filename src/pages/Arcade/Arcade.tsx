import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Box, Chip, Container, Stack, Typography } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

import { MARK_COLORS } from "./cifra/cifraLogic";
import { Bomb } from "./pavio/Bomb";

const MONO_FONT = "'JetBrains Mono', ui-monospace, monospace";
const MUTED = "#a0a4ad";

// Miniatura do Órbita: núcleo, órbitas e algumas palavras em volta.
function OrbitaPreview() {
  const words = [
    { text: "cometa", top: "18%", left: "14%", typed: 3 },
    { text: "luz", top: "26%", left: "72%" },
    { text: "planeta", top: "70%", left: "64%" },
    { text: "escudo", top: "74%", left: "12%", special: true },
  ];
  return (
    <Box sx={{ position: "relative", height: "100%", overflow: "hidden" }}>
      {[0.3, 0.55, 0.85].map((k) => (
        <Box
          key={k}
          sx={{
            position: "absolute", left: "50%", top: "50%",
            width: `${k * 100}%`, height: `${k * 100}%`,
            transform: "translate(-50%, -50%)", borderRadius: "50%",
            border: "1px solid rgba(124,77,255,0.16)",
          }}
        />
      ))}
      <Box
        sx={{
          position: "absolute", left: "50%", top: "50%", width: 34, height: 34,
          transform: "translate(-50%, -50%)", borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #d6c8ff, #7c4dff 45%, #3a1f9e)",
          boxShadow: "0 0 0 6px rgba(0,188,212,0.35), 0 0 40px rgba(124,77,255,0.6)",
        }}
      />
      {/* Raio até a palavra travada */}
      <Box
        sx={{
          position: "absolute", left: "26%", top: "21%", width: "30%", height: 2,
          background: "linear-gradient(90deg, rgba(167,139,250,.9), rgba(124,77,255,0))",
          transformOrigin: "left center", transform: "rotate(35deg)",
        }}
      />
      {words.map((word) => (
        <Box
          key={word.text}
          sx={{
            position: "absolute", top: word.top, left: word.left,
            fontFamily: MONO_FONT, fontWeight: 600, fontSize: 14,
            color: word.special ? "#00bcd4" : "#fff",
            px: word.typed || word.special ? 1 : 0, py: 0.25, borderRadius: "6px",
            border: word.typed ? "1px solid #7c4dff" : word.special ? "1px solid #00bcd4" : "none",
            bgcolor: word.typed ? "rgba(124,77,255,0.16)" : word.special ? "rgba(0,188,212,0.1)" : "transparent",
          }}
        >
          {word.typed ? (
            <>
              <Box component="span" sx={{ color: "#a78bfa" }}>{word.text.slice(0, word.typed)}</Box>
              {word.text.slice(word.typed)}
            </>
          ) : (
            word.text
          )}
        </Box>
      ))}
    </Box>
  );
}

// Miniatura da perseguição: texto, cursor do jogador e o perseguidor atrás.
function ChasePreview() {
  return (
    <Stack sx={{ height: "100%", justifyContent: "center", px: 3, gap: 1.5 }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: 16, lineHeight: 1.7, color: "#5d6270" }}>
        <Box component="span" sx={{ color: "#ff5c7a", bgcolor: "rgba(255,92,122,0.12)", borderRadius: "3px" }}>
          o tempo
        </Box>
        <Box component="span" sx={{ color: "#d5d7de" }}> passa rápido quan</Box>
        <Box
          component="span"
          sx={{ display: "inline-block", width: 2, height: 18, bgcolor: "#a78bfa", verticalAlign: "middle", mx: "1px" }}
        />
        do você digita sem parar
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#4caf50" }} />
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 13, color: MUTED }}>
          12 letras à frente · perseguidor a 38 ppm
        </Typography>
      </Stack>
    </Stack>
  );
}

// Miniatura do Pavio: a bomba com a sílaba e uma palavra sendo digitada.
function PavioPreview() {
  return (
    <Stack direction="row" spacing={3} sx={{ height: "100%", alignItems: "center", justifyContent: "center", px: 2 }}>
      <Box sx={{ flexShrink: 0 }}>
        <Bomb syllable="ab" tension={0.15} size={92} />
      </Box>
      <Stack spacing={1}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 20, fontWeight: 700 }}>
          c<Box component="span" sx={{ color: "#a78bfa" }}>ab</Box>o
          <Box component="span" sx={{ color: "#4ade80", fontSize: 14, ml: 1 }}>+3 s</Box>
        </Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 16, color: "#5d6270", textDecoration: "line-through" }}>
          carbo
        </Typography>
      </Stack>
    </Stack>
  );
}

// Miniatura da Cifra: três palpites com as dicas.
function CifraPreview() {
  const rows: [string, string][] = [
    ["carta", "..vvv"],
    ["parte", "vpvv."],
    ["porta", "vvvvv"],
  ];
  const color = { v: MARK_COLORS.correct, p: MARK_COLORS.present, ".": MARK_COLORS.absent } as const;
  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
      {rows.map(([word, marks]) => (
        <Stack key={word} direction="row" spacing={0.75}>
          {[...word].map((letter, i) => {
            const mark = color[marks[i] as keyof typeof color];
            return (
              <Box
                key={i}
                sx={{
                  width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: "6px",
                  bgcolor: mark.bg, color: mark.color, fontFamily: MONO_FONT, fontWeight: 800,
                  fontSize: 18, textTransform: "uppercase",
                }}
              >
                {letter}
              </Box>
            );
          })}
        </Stack>
      ))}
    </Stack>
  );
}

// Miniatura do Embaralha: as letras do dia e palavras achadas.
function EmbaralhaPreview() {
  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Stack direction="row" spacing={0.75}>
        {[..."ntraeco"].map((letter, i) => (
          <Box
            key={i}
            sx={{
              width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: "8px",
              bgcolor: "#7c4dff", color: "#fff",
              fontFamily: MONO_FONT, fontWeight: 800, fontSize: 17, textTransform: "uppercase",
            }}
          >
            {letter}
          </Box>
        ))}
      </Stack>
      <Stack direction="row" spacing={0.75}>
        {["cante", "canto", "·····"].map((word, i) => (
          <Box
            key={i}
            sx={{
              px: 1, py: 0.25, borderRadius: "6px", fontFamily: MONO_FONT, fontSize: 13, fontWeight: 700,
              textTransform: "uppercase", border: "1px solid",
              borderColor: i < 2 ? "rgba(124,77,255,.45)" : "#2e3240",
              bgcolor: i < 2 ? "rgba(124,77,255,.18)" : "transparent", color: i < 2 ? "#e4dcff" : "#4a4f5e",
            }}
          >
            {word}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

// Miniatura do Conjuga: o verbo e um pedaço da tabela.
function ConjugaPreview() {
  const rows: [string, string | null][] = [["eu", "corro"], ["tu", "corres"], ["ele", null], ["nós", "corremos"]];
  return (
    <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", gap: 1.25 }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: 24, letterSpacing: ".06em" }}>CORRER</Typography>
      <Stack spacing={0.5} sx={{ width: 190 }}>
        {rows.map(([person, form]) => (
          <Stack key={person} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography sx={{ width: 34, fontSize: 12, color: MUTED, textAlign: "right" }}>{person}</Typography>
            <Box
              sx={{
                flex: 1, px: 1, py: 0.25, borderRadius: "6px", fontFamily: MONO_FONT, fontSize: 13, fontWeight: 700,
                border: "1px solid", borderStyle: form ? "solid" : "dashed",
                borderColor: form ? "rgba(124,77,255,.55)" : "#2e3240",
                bgcolor: form ? "rgba(124,77,255,.18)" : "transparent", color: "#eee7ff", minHeight: 22,
              }}
            >
              {form ?? ""}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

interface GameCardProps {
  to: string;
  title: string;
  badge?: string;
  description: string;
  details: string[];
  preview: ReactNode;
}

// O card inteiro é um link para o jogo.
function GameCard({ to, title, badge, description, details, preview }: GameCardProps) {
  return (
    <Box
      component={Link}
      to={to}
      aria-label={`Jogar ${title}`}
      sx={{
        display: "flex", flexDirection: "column", minWidth: 0,
        color: "inherit", textDecoration: "none", cursor: "pointer",
        bgcolor: "#181b21", border: "1px solid #23262e", borderRadius: "14px", overflow: "hidden",
        transition: "border-color 180ms ease, transform 180ms ease",
        "&:hover": { borderColor: "rgba(167,139,250,0.4)", transform: "translateY(-2px)" },
        "&:hover .play-button": { bgcolor: "#8a60ff" },
        "&:focus-visible": { outline: "2px solid #a78bfa", outlineOffset: 3 },
      }}
    >
      <Box sx={{ height: 190, bgcolor: "#12141a", borderBottom: "1px solid #23262e" }}>{preview}</Box>
      <Stack spacing={1.5} sx={{ p: 3, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {badge && (
            <Chip
              label={badge}
              size="small"
              sx={{ bgcolor: "rgba(124,77,255,0.18)", color: "#d6c8ff", fontWeight: 700, height: 22 }}
            />
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: MUTED }}>
          {description}
        </Typography>
        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.25, color: MUTED, fontSize: 14 }}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </Stack>
        <Box sx={{ flex: 1 }} />
        {/* Só visual: o clique é do card inteiro (link dentro de link não vale). */}
        <Box
          className="play-button"
          aria-hidden="true"
          sx={{
            alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 0.75,
            px: 2.5, py: 0.9, borderRadius: "10px", bgcolor: "primary.main", color: "#fff",
            fontWeight: 600, fontSize: 14, transition: "background-color 180ms ease",
          }}
        >
          <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />
          Jogar
        </Box>
      </Stack>
    </Box>
  );
}

export function Arcade() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4} sx={{ maxWidth: 1180, mx: "auto" }}>
        <Stack spacing={1}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.02em", fontSize: { xs: 32, md: 44 } }}>
            Arcade
          </Typography>
          <Typography sx={{ color: MUTED, maxWidth: "60ch" }}>
            Modos de jogo para treinar digitação de um jeito diferente. Cada um guarda seu próprio
            recorde.
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 3 }}>
          <GameCard
            to="/arcade/cifra"
            title="Cifra"
            badge="Novo"
            description="Descubra a palavra de 5 letras pelas dicas de cada palpite, com o relógio correndo."
            details={[
              "Diária com 1, 2 ou 4 palavras, igual para todo mundo",
              "Contra o relógio: cada acerto soma tempo; errou, acabou",
              "Ranking do dia e ranking do Arcade",
            ]}
            preview={<CifraPreview />}
          />
          <GameCard
            to="/arcade/embaralha"
            title="Embaralha"
            badge="Diário"
            description="Sete letras embaralhadas por dia. Forme o máximo de palavras com elas."
            details={[
              "Palavras de 3 letras ou mais, cada letra uma vez",
              "Uma das palavras usa todas as letras",
              "Desafio novo todo dia, igual para todo mundo",
            ]}
            preview={<EmbaralhaPreview />}
          />
          <GameCard
            to="/arcade/conjuga"
            title="Conjuga"
            badge="Novo"
            description="Aparece um verbo: digite as conjugações dele antes do tempo acabar."
            details={[
              "Presente, pretéritos, futuros, subjuntivo, gerúndio e particípio",
              "Completar um tempo ou o verbo inteiro soma tempo",
              "Verbos regulares e irregulares",
            ]}
            preview={<ConjugaPreview />}
          />
          <GameCard
            to="/arcade/pavio"
            title="Pavio"
            description="A bomba mostra duas ou três letras. Escreva uma palavra que tenha essas letras juntas antes que o pavio acabe."
            details={[
              "Solo: começa com 60 s e cada palavra soma tempo",
              "Com amigos na battle: 2 vidas, o último que sobrar vence",
              "Acento é opcional: cabeca vale por cabeça",
            ]}
            preview={<PavioPreview />}
          />
          <GameCard
            to="/arcade/orbita"
            title="Órbita"
            description="As palavras vêm em espiral até o núcleo. Digite cada uma para destruí-la antes que ela encoste nele."
            details={[
              "3 escudos; palavras em ciano devolvem um",
              "Combo até x3 por acertos seguidos",
              "Ondas cada vez mais rápidas",
            ]}
            preview={<OrbitaPreview />}
          />
          <GameCard
            to="/arcade/perseguicao"
            title="Perseguição"
            description="Um perseguidor sai atrás de você e acelera a cada segundo. Aguente o máximo que conseguir sem ser alcançado."
            details={[
              "Começa a 20 PPM e acelera 1,5 PPM por segundo",
              "Palavra errada deixa o perseguidor mais perto",
              "Recorde em segundos aguentados",
            ]}
            preview={<ChasePreview />}
          />
        </Box>
      </Stack>
    </Container>
  );
}
