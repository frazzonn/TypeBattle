// Gera o dicionário e as sílabas do Pavio a partir das listas grandes de
// src/languages (dicionário pt_BR do LibreOffice + IME/USP, via Monkeytype).
// A de 550k traz as conjugações dos verbos e palavras como "alameda", que
// faltam na de 320k; as duas entram juntas.
// Uso: node scripts/build-pavio.mjs
//
// As palavras ficam sem acento e sem cedilha, em minúsculas: o jogador pode
// digitar "cabeca" para "cabeça". Só entram palavras de 3 letras ou mais.
//
// Saídas:
//   public/pavio/portuguese.txt            dicionário do jogo solo (baixado pelo navegador)
//   backend/data/pavio/portuguese.txt      o mesmo, para validar na battle
//   src/data/pavio/syllables.json          sílabas por dificuldade
//   backend/data/pavio/syllables.json      o mesmo, para o servidor
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const SOURCES = ["portuguese_550k.json", "portuguese_320k.json"].map((file) =>
  join(ROOT, "src/languages", file),
);
const OUTPUTS = {
  frontWords: join(ROOT, "public/pavio/portuguese.txt"),
  backWords: join(ROOT, "backend/data/pavio/portuguese.txt"),
  frontSyllables: join(ROOT, "src/data/pavio/syllables.json"),
  backSyllables: join(ROOT, "backend/data/pavio/syllables.json"),
};

// Quantas palavras precisam ter a sílaba para ela entrar em cada dificuldade.
// (Calibrado para ~490 mil palavras.)
const TIERS = { easy: 4600, medium: 1300, hard: 280 };

function normalize(word) {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const raw = SOURCES.flatMap((file) => JSON.parse(readFileSync(file, "utf8")).words);
const words = [...new Set(raw.map((word) => normalize(String(word).trim())))]
  .filter((word) => /^[a-z]{3,}$/.test(word))
  .sort();

// Em quantas palavras cada sequência de 2 e 3 letras aparece.
const counts = new Map();
for (const word of words) {
  const seen = new Set();
  for (const size of [2, 3]) {
    for (let i = 0; i + size <= word.length; i += 1) seen.add(word.slice(i, i + size));
  }
  for (const piece of seen) counts.set(piece, (counts.get(piece) ?? 0) + 1);
}

// Sílaba boa de jogar: tem vogal e não parece número romano (xii, lxx).
function playable(piece) {
  return /[aeiou]/.test(piece) && !/^[ivxlcdm]+$/.test(piece);
}

const syllables = { easy: [], medium: [], hard: [] };
for (const [piece, count] of counts) {
  if (!playable(piece)) continue;
  if (count >= TIERS.easy) syllables.easy.push(piece);
  else if (count >= TIERS.medium) syllables.medium.push(piece);
  else if (count >= TIERS.hard) syllables.hard.push(piece);
}
for (const list of Object.values(syllables)) list.sort();

function write(file, content) {
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const wordText = `${words.join("\n")}\n`;
write(OUTPUTS.frontWords, wordText);
write(OUTPUTS.backWords, wordText);
write(OUTPUTS.frontSyllables, JSON.stringify(syllables));
write(OUTPUTS.backSyllables, JSON.stringify(syllables));

console.log(`${words.length} palavras (${(wordText.length / 1024 / 1024).toFixed(1)} MB)`);
console.log(
  `sílabas: ${syllables.easy.length} fáceis, ${syllables.medium.length} médias, ${syllables.hard.length} difíceis`,
);
