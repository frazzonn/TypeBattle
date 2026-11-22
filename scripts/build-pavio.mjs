// Gera o dicionário, a lista de palavras comuns e as sílabas do Pavio.
// Uso: node scripts/build-pavio.mjs
//
// Fontes (ficam em src/languages, fora do git; as que faltarem são baixadas):
//   portuguese_550k.json, portuguese_320k.json  dicionário pt_BR do LibreOffice +
//                                                IME/USP, via Monkeytype (já existentes)
//   pt_lexico.txt, pt_conj.txt, pt_icf.txt       github.com/fserb/pt-br (MIT): léxico
//                                                do Dicio, conjugações e a frequência
//                                                (ICF) de ~400 mil palavras em corpus
//   pt_br_50k.txt                                github.com/hermitdave/FrequencyWords
//                                                (CC BY-SA 4.0): 50 mil palavras mais
//                                                usadas em legendas
// Ajustes manuais (no git, um por linha, # comenta):
//   scripts/pavio/extra.txt    palavras que sempre valem
//   scripts/pavio/blocked.txt  palavras que nunca valem nem aparecem como exemplo
//
// As palavras ficam sem acento e sem cedilha, em minúsculas (o jogador pode
// digitar "cabeca" para "cabeça"). Só entram palavras de 3 letras ou mais.
//
// Saídas:
//   public/pavio/portuguese.txt        dicionário do jogo solo (baixado pelo navegador)
//   public/pavio/common.txt            palavras conhecidas, da mais usada para a menos
//   backend/data/pavio/*.txt           os mesmos, para a battle e o ranking
//   src/data/pavio/syllables.json      sílabas por dificuldade
//   backend/data/pavio/syllables.json  o mesmo, para o servidor
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LANGUAGES = join(ROOT, "src/languages");

const DOWNLOADS = {
  "pt_lexico.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/lexico",
  "pt_conj.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/conjuga%C3%A7%C3%B5es",
  "pt_icf.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/icf",
  "pt_br_50k.txt":
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt",
};

const OUTPUTS = {
  frontWords: join(ROOT, "public/pavio/portuguese.txt"),
  backWords: join(ROOT, "backend/data/pavio/portuguese.txt"),
  frontCommon: join(ROOT, "public/pavio/common.txt"),
  backCommon: join(ROOT, "backend/data/pavio/common.txt"),
  frontSyllables: join(ROOT, "src/data/pavio/syllables.json"),
  backSyllables: join(ROOT, "backend/data/pavio/syllables.json"),
};

// ICF: quanto menor, mais comum ("de" = 3, "amiga" = 9, "sufocante" = 14).
// Até aqui a palavra conta como "conhecida": vira exemplo e mede as sílabas.
const COMMON_MAX_ICF = 14;
// Quantas palavras conhecidas precisam ter a sílaba para ela entrar em cada
// dificuldade. Assim até a sílaba difícil tem várias respostas que todo mundo sabe.
const TIERS = { easy: 500, medium: 120, hard: 35 };

function normalize(word) {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function isGameWord(word) {
  return /^[a-z]{3,}$/.test(word);
}

async function source(file) {
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

function lines(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith("#"));
}

function manualList(name) {
  const path = join(ROOT, "scripts/pavio", name);
  if (!existsSync(path)) return [];
  return lines(readFileSync(path, "utf8"))
    .map((line) => normalize(line.split("#")[0]))
    .filter(isGameWord);
}

// ---------------------------------------------------------------- fontes

const dictionary = new Set();
const addAll = (words) => {
  for (const raw of words) {
    const word = normalize(String(raw));
    if (isGameWord(word)) dictionary.add(word);
  }
};

for (const file of ["portuguese_550k.json", "portuguese_320k.json"]) {
  addAll(JSON.parse(await source(file)).words);
}
// Léxico do Dicio e conjugações: palavras de dicionário de verdade, sem os
// nomes próprios que as listas do LibreOffice trazem ("simone", "bristol").
const lexicon = new Set();
for (const file of ["pt_lexico.txt", "pt_conj.txt"]) {
  for (const raw of lines(await source(file))) {
    const word = normalize(raw);
    if (isGameWord(word)) lexicon.add(word);
  }
}
addAll(lexicon);

// Frequência: o menor ICF de cada forma sem acento ("é" e "e" viram "e").
const icf = new Map();
for (const line of lines(await source("pt_icf.txt"))) {
  const [raw, score] = line.split(",");
  const word = normalize(raw);
  const value = Number(score);
  if (!isGameWord(word) || !Number.isFinite(value)) continue;
  if (!(icf.get(word) <= value)) icf.set(word, value);
}

// Legendas: palavras do dia a dia em ordem de uso. Ajuda a achar formas
// flexionadas que faltam nas outras listas ("culpada", "detetives").
const subtitleRank = new Map();
for (const line of lines(await source("pt_br_50k.txt"))) {
  const word = normalize(line.split(" ")[0]);
  if (isGameWord(word) && !subtitleRank.has(word)) subtitleRank.set(word, subtitleRank.size);
}

// ---------------------------------------------------------------- flexões

// Plural de substantivos e adjetivos.
function plurals(word) {
  if (word.endsWith("ao")) return [`${word.slice(0, -2)}oes`, `${word.slice(0, -2)}aes`, `${word}s`];
  if (/[aeiou]$/.test(word)) return [`${word}s`];
  if (/[rz]$/.test(word)) return [`${word}es`];
  if (word.endsWith("m")) return [`${word.slice(0, -1)}ns`];
  if (word.endsWith("il")) return [`${word}s`.replace(/ils$/, "is"), `${word.slice(0, -2)}eis`];
  if (/[aeou]l$/.test(word)) return [`${word.slice(0, -1)}is`];
  return [];
}

// Terminações de adjetivo/particípio em que o feminino é trocar o por a.
const FEMININE_O = /(ad|id|ud|os|ic|iv|eir|inh|zinh|an|in|ent|at|it|ut|ari|ori|esc|eg|et|ur)o$/;

function feminines(word) {
  if (FEMININE_O.test(word)) return [`${word.slice(0, -1)}a`];
  if (/[dst]or$/.test(word)) return [`${word}a`];
  return [];
}

// Formas que a palavra pode ter vindo de (para aceitar flexões vistas em uso).
function possibleBases(word) {
  const bases = [];
  const cut = (n) => word.slice(0, -n);
  if (word.endsWith("s") && /[aeiou]$/.test(cut(1))) bases.push(cut(1));
  if (word.endsWith("es") && /[rzs]$/.test(cut(2))) bases.push(cut(2));
  if (word.endsWith("oes") || word.endsWith("aes")) bases.push(`${cut(3)}ao`);
  if (word.endsWith("ns")) bases.push(`${cut(2)}m`);
  if (word.endsWith("is")) bases.push(`${cut(2)}l`, `${cut(1)}l`);
  if (word.endsWith("eis")) bases.push(`${cut(3)}il`);
  // feminino (e feminino plural) de adjetivo/particípio
  const fem = word.match(/^(.+)a(s?)$/);
  if (fem && FEMININE_O.test(`${fem[1]}o`)) bases.push(`${fem[1]}o`);
  if (word.endsWith("ora") || word.endsWith("oras")) bases.push(word.replace(/oras?$/, "or"));
  // advérbio em -mente
  if (word.endsWith("amente")) bases.push(`${cut(6)}o`);
  if (word.endsWith("mente")) bases.push(cut(5));
  // diminutivo
  const small = word.match(/^(.+?)z?inh([oa])s?$/);
  if (small) bases.push(`${small[1]}${small[2]}`, `${small[1]}o`, `${small[1]}a`, small[1], `${small[1]}e`);
  // quem faz / o que faz: seguir -> seguidor, atender -> atendente
  const agent = word.match(/^(.+)(ad|ed|id)(or|ora|ores|oras)$/);
  if (agent) bases.push(`${agent[1]}${{ ad: "a", ed: "e", id: "i" }[agent[2]]}r`);
  const doer = word.match(/^(.+)(ante|ente|inte)s?$/);
  if (doer) bases.push(`${doer[1]}ar`, `${doer[1]}er`, `${doer[1]}ir`);
  // superlativo
  const most = word.match(/^(.+)issim[oa]s?$/);
  if (most) bases.push(`${most[1]}o`, `${most[1]}e`, most[1]);
  return bases.filter((base) => base.length >= 3);
}

const baseDictionary = new Set(dictionary);

// 1. Palavras usadas de verdade (corpus e legendas) que faltam nos dicionários
//    entram só se forem flexão de uma palavra do dicionário ("culpada",
//    "detetives", "sinceramente"). Sozinho, o corpus traz muito inglês, nome
//    próprio e abreviação.
const attested = new Set([...subtitleRank.keys(), ...icf.keys()]);
for (const word of attested) {
  if (!dictionary.has(word) && possibleBases(word).some((base) => baseDictionary.has(base))) {
    dictionary.add(word);
  }
}

// 2. Conjugação regular dos verbos que as fontes trazem só no infinitivo
//    ("tramar" -> "tramou", "tramava", "tramando"...). Conta como verbo quem
//    tem o pretérito ou o particípio no dicionário ("tramou", "tramado").
//    Os irregulares comuns ("fazer", "ir") já vêm conjugados nas fontes.
const ENDINGS = {
  ar: {
    soft: "o as a amos ais am aste ou astes aram ava avas avamos aveis avam ara aras aramos areis arei arao aremos aria arias ariamos arieis ariam asse asses assemos asseis assem ar ares armos ardes arem ando ado ada ados adas",
    // presente do subjuntivo e 1ª pessoa do pretérito: "fiquei", "pague"
    hard: "e es emos eis em ei",
  },
  er: {
    soft: "e emos eis em i este eu estes eram ia ias iamos ieis iam era eras eramos ereis erei eras erao eremos eria erias eriamos erieis eriam esse esses essemos esseis essem er eres ermos erdes erem endo ido ida idos idas",
    hard: "o a as amos ais am",
  },
  ir: {
    soft: "e imos is em i iste iu istes iram ia ias iamos ieis iam ira iras iramos ireis irei iras irao iremos iria irias iriamos irieis iriam isse isses issemos isseis issem ir ires irmos irdes irem indo ido ida idos idas",
    hard: "o a as amos ais am",
  },
};
// Antes de e (no -ar) ou de a/o (no -er/-ir) a grafia do radical muda:
// ficar -> fiquei, pagar -> paguei, proteger -> protejo.
function hardStem(stem, type) {
  if (type === "ar") return stem.replace(/c$/, "qu").replace(/g$/, "gu");
  return stem.replace(/(?<!u)g$/, "j").replace(/gu$/, "g").replace(/qu$/, "c");
}

let conjugated = 0;
for (const word of baseDictionary) {
  const type = word.slice(-2);
  const endings = ENDINGS[type];
  if (!endings || word.length < 4) continue;
  const stem = word.slice(0, -2);
  const participle = `${stem}${type === "ar" ? "ado" : "ido"}`;
  const preterite = `${stem}${{ ar: "ou", er: "eu", ir: "iu" }[type]}`;
  if (!baseDictionary.has(preterite) && !baseDictionary.has(participle)) continue;
  // Já conjugado nas fontes: não mexe (evita formas erradas dos irregulares).
  const imperfect = `${stem}${type === "ar" ? "ava" : "ia"}`;
  if (baseDictionary.has(imperfect)) continue;

  conjugated += 1;
  for (const ending of endings.soft.split(" ")) dictionary.add(stem + ending);
  for (const ending of endings.hard.split(" ")) dictionary.add(hardStem(stem, type) + ending);
}
console.log(`${conjugated} verbos conjugados pelo script`);

// 3. Palavras conhecidas ganham plural e feminino mesmo sem aparecer no
//    corpus ("vitrine" -> "vitrines", "fofinho" -> "fofinha").
const knownBases = [...dictionary].filter(
  (word) => (icf.get(word) ?? Infinity) <= COMMON_MAX_ICF || subtitleRank.has(word),
);
for (const word of knownBases) {
  for (const female of feminines(word)) {
    dictionary.add(female);
    for (const plural of plurals(female)) dictionary.add(plural);
  }
  for (const plural of plurals(word)) dictionary.add(plural);
}

// 4. Ajustes manuais.
const blocked = new Set(manualList("blocked.txt"));
for (const word of manualList("extra.txt")) dictionary.add(word);
for (const word of blocked) dictionary.delete(word);

const words = [...dictionary].sort();

// ---------------------------------------------------------------- comuns

// Pontuação de "comum" para quem não tem ICF mas aparece nas legendas: usa a
// mesma posição relativa (a 100ª da legenda ganha o 100º menor ICF).
const icfSorted = words
  .map((word) => icf.get(word))
  .filter((score) => score !== undefined)
  .sort((a, b) => a - b);
function commonness(word) {
  const score = icf.get(word);
  const rank = subtitleRank.get(word);
  const fromSubtitles = rank === undefined ? Infinity : (icfSorted[rank] ?? Infinity);
  return Math.min(score ?? Infinity, fromSubtitles);
}

// Exemplo bom é palavra de dicionário (ou flexão dela), não nome próprio.
function isLexiconWord(word) {
  return lexicon.has(word) || possibleBases(word).some((base) => lexicon.has(base));
}

const common = words
  .filter((word) => !blocked.has(word) && isLexiconWord(word))
  .map((word) => [word, commonness(word)])
  .filter(([, score]) => score <= COMMON_MAX_ICF)
  .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
  .map(([word]) => word);

// ---------------------------------------------------------------- sílabas

// Em quantas palavras conhecidas cada sequência de 2 e 3 letras aparece.
const counts = new Map();
for (const word of common) {
  const seen = new Set();
  for (const size of [2, 3]) {
    for (let i = 0; i + size <= word.length; i += 1) seen.add(word.slice(i, i + size));
  }
  // A sílaba sozinha não vale como resposta.
  for (const piece of seen) if (piece !== word) counts.set(piece, (counts.get(piece) ?? 0) + 1);
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

// ---------------------------------------------------------------- saída

function write(file, content) {
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

const wordText = `${words.join("\n")}\n`;
const commonText = `${common.join("\n")}\n`;
write(OUTPUTS.frontWords, wordText);
write(OUTPUTS.backWords, wordText);
write(OUTPUTS.frontCommon, commonText);
write(OUTPUTS.backCommon, commonText);
write(OUTPUTS.frontSyllables, JSON.stringify(syllables));
write(OUTPUTS.backSyllables, JSON.stringify(syllables));

console.log(`${words.length} palavras (${(wordText.length / 1024 / 1024).toFixed(1)} MB)`);
console.log(`${common.length} palavras conhecidas (${(commonText.length / 1024).toFixed(0)} KB)`);
console.log(
  `sílabas: ${syllables.easy.length} fáceis, ${syllables.medium.length} médias, ${syllables.hard.length} difíceis`,
);
