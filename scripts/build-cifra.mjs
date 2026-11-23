// Gera as respostas da Cifra (palavras de 5 letras que podem ser sorteadas).
// Uso: node scripts/build-cifra.mjs   (depois de npm run build:pavio)
//
// Resposta boa é palavra conhecida e de dicionário: entra se estiver no
// léxico do Dicio, no dicionário do LibreOffice (tira termos em inglês como
// "input") e na lista de palavras conhecidas do Pavio. Fica de fora:
//   - forma conjugada ("jogue", "estou"); o infinitivo continua valendo;
//   - nome de cidade, estado e país e palavra sensível ou ofensiva;
//   - o que estiver em scripts/cifra/blocked.txt.
// Os palpites aceitos são todas as palavras de 5 letras do dicionário do
// Pavio (o servidor lê backend/data/pavio/portuguese.txt).
//
// Saída: backend/data/cifra/answers.txt, uma por linha: "sem acento com acento",
// da mais conhecida para a menos.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

const OUTPUT = join(ROOT, "backend/data/cifra/answers.txt");
// Quantas respostas no máximo (as mais conhecidas primeiro).
const MAX_ANSWERS = 1000;

const isFive = (word) => /^[a-z]{5}$/.test(word);

const [spelled, lexicon, conjugated, excluded, libreOffice] = await Promise.all([
  loadSpellings(),
  loadLexicon(),
  loadConjugatedForms(),
  loadExcludedWords(),
  loadLibreOffice(),
]);
for (const word of projectList("scripts/cifra/blocked.txt")) excluded.add(word);

const answers = loadCommon()
  .filter(
    (word) =>
      isFive(word) && lexicon.has(word) && libreOffice.has(word) && !conjugated.has(word) && !excluded.has(word),
  )
  .slice(0, MAX_ANSWERS);

if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${answers.map((word) => `${word} ${spelled.get(word) ?? word}`).join("\n")}\n`);
console.log(`${answers.length} respostas em ${OUTPUT}`);
