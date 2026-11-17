import { checkWord, exampleWords, pickSyllable, type WordRejection } from "../pavio/pavioWords.js";

// Pavio na battle: a bomba passa de mão em mão. Quem está com ela digita uma
// palavra com a sílaba; se acertar, a bomba vai para o próximo. Quando ela
// explode, quem segura perde uma vida; sem vidas, sai. O último que sobrar vence.

export const PAVIO_LIVES = 2;
// O pavio queima um tempo sorteado e escondido; ninguém sabe quando explode.
const FUSE_MIN_MS = 20_000;
const FUSE_MAX_MS = 35_000;
// Quem recebe a bomba quase no fim ganha um tempo mínimo para tentar, mas
// cada bomba só pode ganhar até MAX_EXTRA_MS no total (senão, com respostas
// rápidas, ela nunca explodiria).
const MIN_HOLD_MS = 3_000;
const MAX_EXTRA_MS = 9_000;
// Pausa depois da explosão, para todo mundo ver quem perdeu a vida.
const EXPLOSION_PAUSE_MS = 3_000;
const MAX_TYPED = 30;

export interface PavioState {
  syllable: string | null;
  turnSocketId: string | null;
  lives: Record<string, number>;
  words: Record<string, number>;
  // Ordem em que os jogadores saíram (o primeiro saiu primeiro).
  eliminated: string[];
  bombStartedAt: number | null;
  wordsPlayed: number;
  lastWord: { socketId: string; word: string } | null;
  explosion: { socketId: string; syllable: string; examples: string[]; at: number } | null;
}

interface PavioPlayer {
  socketId: string;
}

export interface PavioRoom {
  code: string;
  status: string;
  players: PavioPlayer[];
  pavio: PavioState | null;
}

export interface PavioHooks {
  update: (room: PavioRoom) => void;
  emit: (room: PavioRoom, event: string, payload: unknown) => void;
  finish: (room: PavioRoom, winnerSocketId: string | null) => void;
}

interface PrivateState {
  used: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  // Quando a bomba atual explode (escondido dos jogadores).
  explodesAt: number;
  // Quanto tempo extra a bomba atual já ganhou com passes no fim.
  extraMs: number;
}

// Palavras já usadas e o timer da bomba ficam só no servidor.
const privateStates = new Map<string, PrivateState>();

function getPrivate(code: string): PrivateState {
  let state = privateStates.get(code);
  if (!state) {
    state = { used: new Set(), timer: null, explodesAt: 0, extraMs: 0 };
    privateStates.set(code, state);
  }
  return state;
}

export function stopPavio(code: string) {
  const state = privateStates.get(code);
  if (state?.timer) clearTimeout(state.timer);
  privateStates.delete(code);
}

function alivePlayers(room: PavioRoom): string[] {
  const pavio = room.pavio;
  if (!pavio) return [];
  return room.players
    .map((player) => player.socketId)
    .filter((id) => (pavio.lives[id] ?? 0) > 0);
}

// Próximo jogador vivo depois de "fromId", na ordem da sala.
function nextAlive(room: PavioRoom, fromId: string | null): string | null {
  const alive = alivePlayers(room);
  if (alive.length === 0) return null;
  const order = room.players.map((player) => player.socketId);
  const start = fromId ? order.indexOf(fromId) : -1;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(start + step + order.length) % order.length];
    if (alive.includes(candidate)) return candidate;
  }
  return alive[0];
}

function lightFuse(room: PavioRoom, hooks: PavioHooks, holder: string) {
  const pavio = room.pavio!;
  const state = getPrivate(room.code);
  if (state.timer) clearTimeout(state.timer);

  pavio.turnSocketId = holder;
  pavio.syllable = pickSyllable(pavio.wordsPlayed, pavio.syllable ?? undefined);
  pavio.bombStartedAt = Date.now();
  pavio.explosion = null;

  const fuse = FUSE_MIN_MS + Math.random() * (FUSE_MAX_MS - FUSE_MIN_MS);
  state.extraMs = 0;
  scheduleExplosion(room, hooks, Date.now() + fuse);
}

function scheduleExplosion(room: PavioRoom, hooks: PavioHooks, at: number) {
  const state = getPrivate(room.code);
  if (state.timer) clearTimeout(state.timer);
  state.explodesAt = at;
  state.timer = setTimeout(() => explode(room, hooks), Math.max(0, at - Date.now()));
}

function explode(room: PavioRoom, hooks: PavioHooks) {
  const pavio = room.pavio;
  if (room.status !== "playing" || !pavio?.turnSocketId || !pavio.syllable) return;

  const holder = pavio.turnSocketId;
  pavio.lives[holder] = Math.max(0, (pavio.lives[holder] ?? 0) - 1);
  if (pavio.lives[holder] === 0) pavio.eliminated.push(holder);

  pavio.explosion = {
    socketId: holder,
    syllable: pavio.syllable,
    examples: exampleWords(pavio.syllable),
    at: Date.now(),
  };
  pavio.turnSocketId = null;
  pavio.bombStartedAt = null;
  hooks.update(room);

  const state = getPrivate(room.code);
  state.timer = setTimeout(() => {
    if (room.status !== "playing" || !room.pavio) return;
    const alive = alivePlayers(room);
    if (alive.length <= 1) {
      hooks.finish(room, alive[0] ?? null);
      return;
    }
    // Quem perdeu a vida (e ainda está vivo) recomeça com uma bomba nova.
    lightFuse(room, hooks, alive.includes(holder) ? holder : (nextAlive(room, holder) ?? alive[0]));
    hooks.update(room);
  }, EXPLOSION_PAUSE_MS);
}

export function startPavio(room: PavioRoom, hooks: PavioHooks) {
  stopPavio(room.code);
  const ids = room.players.map((player) => player.socketId);
  room.pavio = {
    syllable: null,
    turnSocketId: null,
    lives: Object.fromEntries(ids.map((id) => [id, PAVIO_LIVES])),
    words: Object.fromEntries(ids.map((id) => [id, 0])),
    eliminated: [],
    bombStartedAt: null,
    wordsPlayed: 0,
    lastWord: null,
    explosion: null,
  };
  lightFuse(room, hooks, ids[Math.floor(Math.random() * ids.length)]);
}

// O que o jogador da vez está digitando aparece para todos.
export function pavioTyping(room: PavioRoom, socketId: string, text: unknown, hooks: PavioHooks) {
  const pavio = room.pavio;
  if (room.status !== "playing" || pavio?.turnSocketId !== socketId) return;
  const typed = typeof text === "string" ? text.slice(0, MAX_TYPED) : "";
  hooks.emit(room, "pavio:typing", { socketId, text: typed });
}

export function pavioSubmit(room: PavioRoom, socketId: string, raw: unknown, hooks: PavioHooks) {
  const pavio = room.pavio;
  if (room.status !== "playing" || !pavio?.syllable || pavio.turnSocketId !== socketId) return;
  if (typeof raw !== "string" || !raw.trim()) return;

  const state = getPrivate(room.code);
  const result = checkWord(raw.slice(0, MAX_TYPED), pavio.syllable, state.used);

  if ("reason" in result) {
    hooks.emit(room, "pavio:rejected", {
      socketId,
      word: raw.slice(0, MAX_TYPED),
      reason: result.reason satisfies WordRejection,
    });
    return;
  }

  state.used.add(result.word);
  pavio.words[socketId] = (pavio.words[socketId] ?? 0) + 1;
  pavio.wordsPlayed += 1;
  pavio.lastWord = { socketId, word: result.word };

  // A bomba continua queimando: só muda de mão e de sílaba. Se estava quase
  // no fim, o próximo ainda ganha um tempo mínimo para tentar.
  pavio.turnSocketId = nextAlive(room, socketId);
  pavio.syllable = pickSyllable(pavio.wordsPlayed, pavio.syllable);
  const missing = Date.now() + MIN_HOLD_MS - state.explodesAt;
  const extra = Math.min(missing, MAX_EXTRA_MS - state.extraMs);
  if (extra > 0) {
    state.extraMs += extra;
    scheduleExplosion(room, hooks, state.explodesAt + extra);
  }
  hooks.emit(room, "pavio:accepted", { socketId, word: result.word });
  hooks.update(room);
}
