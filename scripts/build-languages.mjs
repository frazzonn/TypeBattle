// Gera as listas de palavras por idioma a partir de src/languages (arquivos brutos).
// Uso: node scripts/build-languages.mjs
//
// Fácil = arquivo base (<idioma>.json), normal = 5k, difícil = 10k. Quando o idioma não tem o
// tamanho exato, sorteia as palavras de uma lista maior (as grandes vêm em
// ordem alfabética, então cortar o começo daria só palavras com "a"); sem
// lista maior, usa a maior que existir. Um idioma pode fixar os arquivos de
// cada dificuldade em "files". Idiomas com "noDifficulty" não têm listas
// suficientes: juntam todas as palavras numa lista só (salva em "easy") e o
// seletor de dificuldade some.
//
// Frases (modo "frases"): scripts/quotes/<código>.json (provérbios, versionados)
// mais src/quotes/<código>.json, no formato da pasta quotes do Monkeytype, se existir.
//
// Saídas:
//   src/data/languages.ts           idiomas disponíveis (sem as palavras)
//   src/data/wordBanks/<código>.json palavras de cada idioma, carregadas sob demanda no front
//   src/data/quotes/<código>.json    frases de cada idioma, também sob demanda
//   backend/src/battle/languageWords.ts tudo junto, para o servidor das batalhas
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const SOURCE_DIR = join(ROOT, "src/languages");
const FRONT_LIST = join(ROOT, "src/data/languages.ts");
const FRONT_BANKS = join(ROOT, "src/data/wordBanks");
const QUOTE_SOURCES = [join(ROOT, "scripts/quotes"), join(ROOT, "src/quotes")];
const FRONT_QUOTES = join(ROOT, "src/data/quotes");
const BACK_FILE = join(ROOT, "backend/src/battle/languageWords.ts");

const LANGUAGES = [
  {
    code: "portuguese",
    label: "Português",
    name: "Português",
    locale: "pt-BR",
    files: { normal: "portuguese_3k", hard: "portuguese_5k" },
  },
  { code: "english", label: "English", name: "Inglês", locale: "en-US" },
  { code: "spanish", label: "Español", name: "Espanhol", locale: "es-ES" },
  { code: "french", label: "Français", name: "Francês", locale: "fr-FR" },
  { code: "german", label: "Deutsch", name: "Alemão", locale: "de-DE" },
  { code: "italian", label: "Italiano", name: "Italiano", locale: "it-IT" },
  { code: "dutch", label: "Nederlands", name: "Holandês", locale: "nl-NL" },
  { code: "polish", label: "Polski", name: "Polonês", locale: "pl-PL" },
  { code: "swedish", label: "Svenska", name: "Sueco", locale: "sv-SE", noDifficulty: true },
  { code: "turkish", label: "Türkçe", name: "Turco", locale: "tr-TR", noDifficulty: true },
  { code: "indonesian", label: "Bahasa Indonesia", name: "Indonésio", locale: "id-ID" },
  { code: "russian", label: "Русский", name: "Russo", locale: "ru-RU", latin: false },
];

const TIERS = { easy: 1000, normal: 5000, hard: 10000 };

function readWords(file) {
  const data = JSON.parse(readFileSync(join(SOURCE_DIR, file), "utf8"));
  const seen = new Set();

  // Só palavras simples: letras e marcas, sem espaço, número ou símbolo.
  return data.words
    .map((word) => String(word).trim())
    .filter((word) => /^[\p{L}\p{M}]+$/u.test(word))
    .filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Listas "<idioma>_<N>k.json" disponíveis, da menor para a maior.
function findSizedLists(code) {
  const pattern = new RegExp(`^${code}_(\\d+)k\\.json$`);

  return readdirSync(SOURCE_DIR)
    .map((file) => ({ file, match: file.match(pattern) }))
    .filter(({ match }) => match)
    .map(({ file, match }) => ({ file, size: Number(match[1]) * 1000 }))
    .sort((a, b) => a.size - b.size);
}

// Sorteio com semente fixa, para o resultado não mudar a cada geração.
function seededShuffle(words, seedText) {
  let seed = [...seedText].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...words];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function buildTier(code, tier, target, lists) {
  const exact = lists.find((list) => list.size === target);
  if (exact) return { source: exact.file, words: readWords(exact.file) };

  const bigger = lists.find((list) => list.size > target);
  if (bigger) {
    const words = seededShuffle(readWords(bigger.file), `${code}-${tier}`).slice(0, target);
    return { source: `${bigger.file} (sorteio de ${target})`, words };
  }

  const biggest = lists.at(-1);
  if (biggest) return { source: biggest.file, words: readWords(biggest.file) };

  return { source: `${code}.json`, words: readWords(`${code}.json`) };
}

function mergeLists(files) {
  const seen = new Set();
  return files
    .flatMap((file) => readWords(file))
    .filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const banks = LANGUAGES.map(({ files, noDifficulty, ...language }) => {
  const lists = findSizedLists(language.code);
  const bank = {};

  console.log(`${language.code}:`);
  if (noDifficulty) {
    const sources = lists.length ? lists.map((list) => list.file) : [`${language.code}.json`];
    bank.easy = mergeLists(sources);
    console.log(`  única  ${String(bank.easy.length).padStart(5)} palavras  ← ${sources.join(" + ")}`);
  } else {
    // O fácil usa o arquivo base do idioma (<idioma>.json, as ~200 palavras mais comuns).
    const tierFiles = { easy: language.code, ...files };
    for (const [tier, target] of Object.entries(TIERS)) {
      const { source, words } = tierFiles[tier]
        ? { source: `${tierFiles[tier]}.json`, words: readWords(`${tierFiles[tier]}.json`) }
        : buildTier(language.code, tier, target, lists);
      bank[tier] = words;
      console.log(`  ${tier.padEnd(6)} ${String(words.length).padStart(5)} palavras  ← ${source}`);
    }
  }

  return { ...language, latin: language.latin ?? true, hasDifficulty: !noDifficulty, ...bank };
});

// Tamanho da frase pelo número de caracteres (mesmos cortes do Monkeytype).
function quoteLength(text) {
  if (text.length <= 100) return "short";
  if (text.length <= 300) return "medium";
  return "long";
}

// Troca aspas curvas, travessões e afins pelo que existe no teclado.
function cleanQuoteText(text) {
  return String(text)
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″«»]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function readQuotes(code) {
  const seen = new Set();
  const quotes = [];

  for (const dir of QUOTE_SOURCES) {
    const file = join(dir, `${code}.json`);
    if (!existsSync(file)) continue;

    for (const quote of JSON.parse(readFileSync(file, "utf8")).quotes ?? []) {
      const text = cleanQuoteText(quote.text);
      // Frases muito curtas, enormes ou com caracteres fora do teclado ficam de fora.
      if (text.length < 15 || text.length > 600 ||/[^\p{L}\p{M}\p{N}\p{P} $+<=>^`|~]/u.test(text)) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      quotes.push({ text, source: cleanQuoteText(quote.source ?? ""), length: quoteLength(text) });
    }
  }

  return quotes;
}

if (!existsSync(FRONT_QUOTES)) mkdirSync(FRONT_QUOTES, { recursive: true });

for (const language of banks) {
  const quotes = readQuotes(language.code);
  language.hasQuotes = quotes.length > 0;
  if (quotes.length) {
    writeFileSync(join(FRONT_QUOTES, `${language.code}.json`), JSON.stringify(quotes));
    console.log(`${language.code}: ${quotes.length} frases`);
  }
}

const header = "// Arquivo gerado por scripts/build-languages.mjs. Não edite à mão.\n";
const languageInfo = banks.map(({ code, label, name, locale, latin, hasDifficulty, hasQuotes }) => ({
  code,
  label,
  name,
  locale,
  latin,
  hasDifficulty,
  hasQuotes,
}));

if (!existsSync(FRONT_BANKS)) mkdirSync(FRONT_BANKS, { recursive: true });

for (const { code, easy, normal, hard } of banks) {
  // JSON.stringify omite normal/hard dos idiomas sem dificuldade.
  writeFileSync(join(FRONT_BANKS, `${code}.json`), JSON.stringify({ easy, normal, hard }));
}

writeFileSync(
  FRONT_LIST,
  `${header}
export interface LanguageInfo {
  code: string;
  // Nome no próprio idioma (o que aparece) e em português (para a busca).
  label: string;
  name: string;
  locale: string;
  latin: boolean;
  // false: o idioma tem uma lista só e o seletor de dificuldade some.
  hasDifficulty: boolean;
  // true: há frases prontas para o modo "frases".
  hasQuotes: boolean;
}

export const DEFAULT_LANGUAGE = "portuguese";

export const LANGUAGES: readonly LanguageInfo[] = ${JSON.stringify(languageInfo, null, 2)};
`,
);

writeFileSync(
  BACK_FILE,
  `${header}
export interface LanguageWordList {
  code: string;
  label: string;
  name: string;
  locale: string;
  latin: boolean;
  // false: só existe "easy", com todas as palavras do idioma.
  hasDifficulty: boolean;
  easy: readonly string[];
  normal?: readonly string[];
  hard?: readonly string[];
}

export const DEFAULT_LANGUAGE = "portuguese";

export const LANGUAGE_WORDS: readonly LanguageWordList[] = ${JSON.stringify(banks.map(({ hasQuotes, ...bank }) => bank))};
`,
);
