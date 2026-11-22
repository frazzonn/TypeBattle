// Gera as respostas da Cifra (palavras de 5 letras que podem ser sorteadas).
// Uso: node scripts/build-cifra.mjs   (depois de npm run build:pavio)
//
// Resposta boa é palavra conhecida e de dicionário: entra se estiver no
// léxico do Dicio (com acento, para mostrar no fim), no dicionário do
// LibreOffice (tira termos em inglês como "input") e na lista de palavras
// conhecidas do Pavio. Fica de fora:
//   - forma conjugada ("jogue", "estou"); o infinitivo continua valendo;
//   - nome de cidade, estado e país (listas do github.com/fserb/pt-br);
//   - palavra sensível ou ofensiva (lista "negativas" do mesmo repositório);
//   - o que estiver em scripts/cifra/blocked.txt.
// Os palpites aceitos são todas as palavras de 5 letras do dicionário do
// Pavio (o servidor lê backend/data/pavio/portuguese.txt).
//
// Saída: backend/data/cifra/answers.txt, uma por linha: "sem acento com acento",
// da mais conhecida para a menos.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LANGUAGES = join(ROOT, "src/languages");
const OUTPUT = join(ROOT, "backend/data/cifra/answers.txt");

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

// Quantas respostas no máximo (as mais conhecidas primeiro).
const MAX_ANSWERS = 1000;

function normalize(word) {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
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
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

const isFive = (word) => /^[a-z]{5}$/.test(word);

// Grafia de cada palavra do léxico. Quando há mais de uma ("braco" e
// "braço"), fica a mais usada segundo a frequência (ICF: menor = mais comum).
const usage = new Map();
for (const line of lines(await source("pt_icf.txt"))) {
  const [raw, score] = line.split(",");
  usage.set(raw.toLowerCase(), Number(score));
}
// As legendas também contam: lá aparece "muita", que falta no ICF.
const subtitles = new Map();
for (const line of lines(await source("pt_br_50k.txt"))) {
  const raw = line.split(" ")[0].toLowerCase();
  if (!subtitles.has(raw)) subtitles.set(raw, subtitles.size);
}
// Menor = mais usada. Quem aparece nas legendas ganha de quem não aparece.
function rarity(spelling) {
  const rank = subtitles.get(spelling);
  if (rank !== undefined) return rank;
  const score = usage.get(spelling);
  return score === undefined ? Infinity : 1e6 + score;
}
const spelled = new Map();
for (const raw of lines(await source("pt_lexico.txt"))) {
  const word = normalize(raw);
  if (!isFive(word)) continue;
  // A forma sem acento também concorre ("muita" é mais usada que "muitá").
  for (const spelling of [raw.toLowerCase(), word]) {
    const current = spelled.get(word);
    if (spelling === word && rarity(word) === Infinity) continue;
    if (!current || rarity(spelling) < rarity(current)) {
      spelled.set(word, spelling);
    }
  }
}

// Formas conjugadas (menos o infinitivo).
const conjugated = new Set(
  lines(await source("pt_conj.txt")).map(normalize).filter((word) => isFive(word) && !/(ar|er|ir|or)$/.test(word)),
);

// Nomes de lugares e palavras sensíveis: cada linha pode ter várias palavras.
const excluded = new Set();
for (const file of ["pt_municipios-br.txt", "pt_estados-br.txt", "pt_paises.txt", "pt_negativas.txt"]) {
  for (const line of lines(await source(file))) {
    for (const part of normalize(line).split(/[^a-z]+/)) if (isFive(part)) excluded.add(part);
  }
}
const blockedPath = join(ROOT, "scripts/cifra/blocked.txt");
if (existsSync(blockedPath)) {
  for (const line of lines(readFileSync(blockedPath, "utf8"))) excluded.add(normalize(line.split("#")[0]));
}

// Dicionário do LibreOffice + IME/USP (o mesmo de onde vem o do Pavio).
const libreOffice = new Set();
for (const file of ["portuguese_550k.json", "portuguese_320k.json"]) {
  for (const raw of JSON.parse(await source(file)).words) libreOffice.add(normalize(String(raw)));
}

const common = lines(readFileSync(join(ROOT, "backend/data/pavio/common.txt"), "utf8"));
const answers = common
  .filter((word) => isFive(word) && spelled.has(word) && libreOffice.has(word) && !conjugated.has(word) && !excluded.has(word))
  .slice(0, MAX_ANSWERS);

if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${answers.map((word) => `${word} ${spelled.get(word)}`).join("\n")}\n`);
console.log(`${answers.length} respostas em ${OUTPUT}`);
