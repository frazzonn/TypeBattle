// Fontes de palavras usadas pelos geradores da Cifra e do Embaralha.
// Os arquivos ficam em src/languages (fora do git); os que faltarem são baixados.
//   pt_lexico, pt_conj, pt_icf e listas/*: github.com/fserb/pt-br (MIT)
//   pt_br_50k: github.com/hermitdave/FrequencyWords (CC BY-SA 4.0)
//   portuguese_550k/320k: dicionário do LibreOffice + IME/USP, via Monkeytype
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LANGUAGES = join(ROOT, "src/languages");

const DOWNLOADS = {
  "pt_lexico.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/lexico",
  "pt_icf.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/icf",
  "pt_br_50k.txt":
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt",
  "pt_conj.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/conjuga%C3%A7%C3%B5es",
  "pt_municipios-br.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/listas/municipios-br",
  "pt_estados-br.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/listas/estados-br",
  "pt_paises.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/listas/paises",
  "pt_negativas.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/listas/negativas",
};

export function normalize(word) {
  return String(word).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

export async function source(file) {
  const path = join(LANGUAGES, file);
  if (!existsSync(path)) {
    const url = DOWNLOADS[file];
    if (!url) throw new Error(`Fonte não encontrada: ${path}`);
    console.log(`baixando ${file}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar ${url}: ${response.status}`);
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, "utf8");
}

// Lista do projeto (um por linha, # comenta), normalizada.
export function projectList(path) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return [];
  return lines(readFileSync(full, "utf8")).map((line) => normalize(line.split("#")[0])).filter(Boolean);
}

// Grafia com acento mais usada de cada palavra ("opcao" -> "opção",
// "muita" -> "muita" e não "muitá"). Considera o léxico, o ICF e as legendas;
// quem aparece nas legendas ganha, depois o menor ICF.
export async function loadSpellings() {
  const usage = new Map();
  for (const line of lines(await source("pt_icf.txt"))) {
    const [raw, score] = line.split(",");
    usage.set(raw.toLowerCase(), Number(score));
  }
  const subtitles = new Map();
  for (const line of lines(await source("pt_br_50k.txt"))) {
    const raw = line.split(" ")[0].toLowerCase();
    if (!subtitles.has(raw)) subtitles.set(raw, subtitles.size);
  }
  const rarity = (spelling) => {
    const rank = subtitles.get(spelling);
    if (rank !== undefined) return rank;
    const score = usage.get(spelling);
    return score === undefined ? Infinity : 1e6 + score;
  };

  const best = new Map();
  const consider = (raw) => {
    const spelling = raw.toLowerCase();
    const word = normalize(spelling);
    if (!/^[a-z]+$/.test(word)) return;
    const current = best.get(word);
    if (!current || rarity(spelling) < rarity(current)) best.set(word, spelling);
  };
  for (const raw of lines(await source("pt_lexico.txt"))) consider(raw);
  for (const raw of usage.keys()) consider(raw);
  for (const raw of subtitles.keys()) consider(raw);
  return best;
}

// Palavras do léxico do Dicio (sem as conjugações).
export async function loadLexicon() {
  return new Set(lines(await source("pt_lexico.txt")).map(normalize));
}

// Formas conjugadas, menos o infinitivo.
export async function loadConjugatedForms() {
  return new Set(
    lines(await source("pt_conj.txt"))
      .map(normalize)
      .filter((word) => !/(ar|er|ir|or)$/.test(word)),
  );
}

// Nomes de cidade, estado e país e palavras sensíveis.
export async function loadExcludedWords() {
  const excluded = new Set();
  for (const file of ["pt_municipios-br.txt", "pt_estados-br.txt", "pt_paises.txt", "pt_negativas.txt"]) {
    for (const line of lines(await source(file))) {
      for (const part of normalize(line).split(/[^a-z]+/)) if (part) excluded.add(part);
    }
  }
  return excluded;
}

// Dicionário do LibreOffice + IME/USP (tira termos em inglês como "input").
export async function loadLibreOffice() {
  const set = new Set();
  for (const file of ["portuguese_550k.json", "portuguese_320k.json"]) {
    for (const raw of JSON.parse(await source(file)).words) set.add(normalize(raw));
  }
  return set;
}

// Palavras conhecidas do Pavio, da mais usada para a menos.
export function loadCommon() {
  return lines(readFileSync(join(ROOT, "backend/data/pavio/common.txt"), "utf8"));
}
