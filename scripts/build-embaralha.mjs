// Gera as palavras do Embaralha (o desafio diário de formar palavras com 7 letras).
// Uso: node scripts/build-embaralha.mjs   (depois de npm run build:pavio)
//
// Saídas em backend/data/embaralha:
//   words.txt  palavras que contam no desafio: conhecidas (lista do Pavio), de 3
//              a 7 letras, sem nome de lugar nem palavra sensível. Uma por
//              linha: "sem acento com acento".
//   bases.txt  palavras de 7 letras que podem virar o desafio do dia: de
//              dicionário, sem conjugação nem plural, entre as mais conhecidas.
// Palavras que existem mas não estão em words.txt são aceitas como "extras"
// (o servidor confere no dicionário do Pavio), sem contar no total.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  ROOT,
  loadCommon,
  loadConjugatedForms,
  loadExcludedWords,
  loadLexicon,
  loadLibreOffice,
  loadSpellings,
  projectList,
} from "./lib/wordSources.mjs";

const OUT_DIR = join(ROOT, "backend/data/embaralha");
// Só as mais conhecidas contam no desafio e viram base dele (as outras que
// existem valem como "extras").
const WORD_POOL = 15_000;
const BASE_POOL = 12_000;

const [spelled, lexicon, conjugated, excluded, libreOffice] = await Promise.all([
  loadSpellings(),
  loadLexicon(),
  loadConjugatedForms(),
  loadExcludedWords(),
  loadLibreOffice(),
]);
for (const word of projectList("scripts/embaralha/blocked.txt")) excluded.add(word);

const common = loadCommon();
// Precisa ter vogal e estar no dicionário do LibreOffice (tira siglas como "rpm").
const words = common.slice(0, WORD_POOL).filter(
  (word) =>
    word.length >= 3 && word.length <= 7 && /[aeiou]/.test(word) && libreOffice.has(word) && !excluded.has(word),
);
const bases = common
  .slice(0, BASE_POOL)
  .filter(
    (word) =>
      word.length === 7 &&
      !word.endsWith("s") &&
      lexicon.has(word) &&
      libreOffice.has(word) &&
      !conjugated.has(word) &&
      !excluded.has(word),
  );

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "words.txt"), `${words.map((word) => `${word} ${spelled.get(word) ?? word}`).join("\n")}\n`);
writeFileSync(join(OUT_DIR, "bases.txt"), `${bases.join("\n")}\n`);
console.log(`${words.length} palavras e ${bases.length} bases em ${OUT_DIR}`);
