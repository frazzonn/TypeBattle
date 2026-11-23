// Gera as tabelas de conjugação do Conjuga.
// Uso: node scripts/build-conjuga.mjs
//
// Verbos: os mais usados da lista do github.com/fserb/pt-br (listas/verbos,
// MIT), pela frequência (ICF). Regulares são conjugados por regra; os
// irregulares comuns estão escritos à mão abaixo. Toda forma gerada é
// conferida com a lista de conjugações do mesmo repositório: verbo com alguma
// forma que não existe lá fica de fora (assim o jogo nunca cobra uma forma errada).
//
// Tempos: presente, pretérito perfeito, pretérito imperfeito, futuro do
// presente, futuro do pretérito (condicional) e presente do subjuntivo, nas
// pessoas eu, tu, ele, nós e eles (sem vós); mais gerúndio e particípio.
//
// Saída: backend/data/conjuga/verbs.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LANGUAGES = join(ROOT, "src/languages");
const OUTPUT = join(ROOT, "backend/data/conjuga/verbs.json");

const DOWNLOADS = {
  "pt_verbos.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/listas/verbos",
  "pt_conj.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/conjuga%C3%A7%C3%B5es",
  "pt_icf.txt": "https://raw.githubusercontent.com/fserb/pt-br/master/icf",
};

// Frequência máxima (ICF) para o verbo entrar: menor = mais comum.
const MAX_ICF = 11.5;

// Verbos que ficam de fora: a palavra é mais usada como substantivo/adjetivo
// ou leva acento no radical que a regra não sabe pôr ("reúno", "proíbo").
const EXCLUDED = new Set([
  "exemplar", "militar", "circular", "postar", "reunir", "proibir", "saudar", "coibir",
  "haver", "chover", "nevar", "precaver", "reaver", "adequar", "averiguar", "enxaguar",
  // defectivos ou com troca de vogal rara (colorir, competir, prevenir, obstruir)
  "colorir", "competir", "prevenir", "obstruir",
]);

export const TENSES = ["presente", "perfeito", "imperfeito", "futuro", "condicional", "subjuntivo"];

function normalize(word) {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

async function source(file) {
  const path = join(LANGUAGES, file);
  if (!existsSync(path)) {
    console.log(`baixando ${file}...`);
    const response = await fetch(DOWNLOADS[file]);
    if (!response.ok) throw new Error(`Falha ao baixar ${file}: ${response.status}`);
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, "utf8");
}

const lines = (text) => text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const words = (text) => text.trim().split(/\s+/);

// ---------------------------------------------------------------- regulares

// Radical com a grafia ajustada antes de e (no -ar) ou de a/o (no -er/-ir):
// ficar -> fique, pagar -> pague, começar -> comece, conhecer -> conheço,
// proteger -> protejo, distinguir -> distingo.
function softStem(stem, type) {
  if (type === "ar") return stem.replace(/c$/, "qu").replace(/g$/, "gu").replace(/ç$/, "c");
  return stem.replace(/c$/, "ç").replace(/(?<!u)g$/, "j").replace(/gu$/, "g").replace(/qu$/, "c");
}

function regular(verb) {
  const type = verb.slice(-2);
  const stem = verb.slice(0, -2);
  const soft = softStem(stem, type);
  const fut = (endings) => words(endings).map((ending) => verb + ending);

  if (type === "ar") {
    // -ear: passeio, passeias... / passeie
    if (stem.endsWith("e")) {
      return {
        presente: words(`${stem}io ${stem}ias ${stem}ia ${stem}amos ${stem}iam`),
        perfeito: words(`${stem}ei ${stem}aste ${stem}ou ${stem}amos ${stem}aram`),
        imperfeito: words(`${stem}ava ${stem}avas ${stem}ava ${stem}ávamos ${stem}avam`),
        futuro: fut("ei ás á emos ão"),
        condicional: fut("ia ias ia íamos iam"),
        subjuntivo: words(`${stem}ie ${stem}ies ${stem}ie ${stem}emos ${stem}iem`),
        gerundio: `${stem}ando`,
        participio: `${stem}ado`,
      };
    }
    return {
      presente: words(`${stem}o ${stem}as ${stem}a ${stem}amos ${stem}am`),
      perfeito: words(`${soft}ei ${stem}aste ${stem}ou ${stem}amos ${stem}aram`),
      imperfeito: words(`${stem}ava ${stem}avas ${stem}ava ${stem}ávamos ${stem}avam`),
      futuro: fut("ei ás á emos ão"),
      condicional: fut("ia ias ia íamos iam"),
      subjuntivo: words(`${soft}e ${soft}es ${soft}e ${soft}emos ${soft}em`),
      gerundio: `${stem}ando`,
      participio: `${stem}ado`,
    };
  }

  if (type === "er") {
    return {
      presente: words(`${soft}o ${stem}es ${stem}e ${stem}emos ${stem}em`),
      perfeito: words(`${stem}i ${stem}este ${stem}eu ${stem}emos ${stem}eram`),
      imperfeito: words(`${stem}ia ${stem}ias ${stem}ia ${stem}íamos ${stem}iam`),
      futuro: fut("ei ás á emos ão"),
      condicional: fut("ia ias ia íamos iam"),
      subjuntivo: words(`${soft}a ${soft}as ${soft}a ${soft}amos ${soft}am`),
      gerundio: `${stem}endo`,
      participio: `${stem}ido`,
    };
  }

  // -uir (incluir, contribuir): inclui, incluímos, incluí...
  if (stem.endsWith("u") && !stem.endsWith("gu") && !stem.endsWith("qu")) {
    return {
      presente: words(`${stem}o ${stem}is ${stem}i ${stem}ímos ${stem}em`),
      perfeito: words(`${stem}í ${stem}íste ${stem}iu ${stem}ímos ${stem}íram`),
      imperfeito: words(`${stem}ía ${stem}ías ${stem}ía ${stem}íamos ${stem}íam`),
      futuro: fut("ei ás á emos ão"),
      condicional: fut("ia ias ia íamos iam"),
      subjuntivo: words(`${stem}a ${stem}as ${stem}a ${stem}amos ${stem}am`),
      gerundio: `${stem}indo`,
      participio: `${stem}ído`,
    };
  }
  // -air (sair, atrair): saio, sais, sai, saímos, saem
  if (stem.endsWith("a")) {
    return {
      presente: words(`${stem}io ${stem}is ${stem}i ${stem}ímos ${stem}em`),
      perfeito: words(`${stem}í ${stem}íste ${stem}iu ${stem}ímos ${stem}íram`),
      imperfeito: words(`${stem}ía ${stem}ías ${stem}ía ${stem}íamos ${stem}íam`),
      futuro: fut("ei ás á emos ão"),
      condicional: fut("ia ias ia íamos iam"),
      subjuntivo: words(`${stem}ia ${stem}ias ${stem}ia ${stem}iamos ${stem}iam`),
      gerundio: `${stem}indo`,
      participio: `${stem}ído`,
    };
  }
  // -uzir (conduzir, produzir): conduz, sem o e final
  const third = stem.endsWith("uz") ? stem : `${stem}e`;
  return {
    presente: words(`${soft}o ${stem}es ${third} ${stem}imos ${stem}em`),
    perfeito: words(`${stem}i ${stem}iste ${stem}iu ${stem}imos ${stem}iram`),
    imperfeito: words(`${stem}ia ${stem}ias ${stem}ia ${stem}íamos ${stem}iam`),
    futuro: fut("ei ás á emos ão"),
    condicional: fut("ia ias ia íamos iam"),
    subjuntivo: words(`${soft}a ${soft}as ${soft}a ${soft}amos ${soft}am`),
    gerundio: `${stem}indo`,
    participio: `${stem}ido`,
  };
}

// ---------------------------------------------------------------- irregulares

// Tabela completa: cada tempo com 5 formas, depois gerúndio e particípio.
function table(spec) {
  const [presente, perfeito, imperfeito, futuro, condicional, subjuntivo, rest] = spec.split("|").map((part) => part.trim());
  const [gerundio, participio] = words(rest);
  return {
    presente: words(presente),
    perfeito: words(perfeito),
    imperfeito: words(imperfeito),
    futuro: words(futuro),
    condicional: words(condicional),
    subjuntivo: words(subjuntivo),
    gerundio,
    participio,
  };
}

// Só alguns tempos mudam: o resto vem da regra.
function patch(verb, changes) {
  const base = regular(verb);
  for (const [tense, forms] of Object.entries(changes)) {
    base[tense] = tense === "gerundio" || tense === "participio" ? forms : words(forms);
  }
  return base;
}

// Prefixo em todas as formas (manter, obter, compor...).
function prefixed(prefix, base, fix = {}) {
  const out = {};
  for (const [tense, forms] of Object.entries(base)) {
    out[tense] = Array.isArray(forms) ? forms.map((form) => prefix + form) : prefix + forms;
  }
  for (const [tense, forms] of Object.entries(fix)) out[tense] = words(forms);
  return out;
}

const IRREGULAR = {};

IRREGULAR.ser = table(`sou és é somos são | fui foste foi fomos foram | era eras era éramos eram |
  serei serás será seremos serão | seria serias seria seríamos seriam | seja sejas seja sejamos sejam | sendo sido`);
IRREGULAR.estar = table(`estou estás está estamos estão | estive estiveste esteve estivemos estiveram |
  estava estavas estava estávamos estavam | estarei estarás estará estaremos estarão |
  estaria estarias estaria estaríamos estariam | esteja estejas esteja estejamos estejam | estando estado`);
IRREGULAR.ter = table(`tenho tens tem temos têm | tive tiveste teve tivemos tiveram | tinha tinhas tinha tínhamos tinham |
  terei terás terá teremos terão | teria terias teria teríamos teriam | tenha tenhas tenha tenhamos tenham | tendo tido`);
for (const prefix of ["man", "ob", "con", "de", "re", "entre", "abs"]) {
  IRREGULAR[`${prefix}ter`] = prefixed(prefix, IRREGULAR.ter, {
    presente: `${prefix}tenho ${prefix}téns ${prefix}tém ${prefix}temos ${prefix}têm`,
  });
}
IRREGULAR.ir = table(`vou vais vai vamos vão | fui foste foi fomos foram | ia ias ia íamos iam |
  irei irás irá iremos irão | iria irias iria iríamos iriam | vá vás vá vamos vão | indo ido`);
IRREGULAR.vir = table(`venho vens vem vimos vêm | vim vieste veio viemos vieram | vinha vinhas vinha vínhamos vinham |
  virei virás virá viremos virão | viria virias viria viríamos viriam | venha venhas venha venhamos venham | vindo vindo`);
for (const prefix of ["con", "inter", "pro", "pre", "sobre"]) {
  IRREGULAR[`${prefix}vir`] = prefixed(prefix, IRREGULAR.vir, {
    presente: `${prefix}venho ${prefix}véns ${prefix}vém ${prefix}vimos ${prefix}vêm`,
  });
}
IRREGULAR.fazer = table(`faço fazes faz fazemos fazem | fiz fizeste fez fizemos fizeram | fazia fazias fazia fazíamos faziam |
  farei farás fará faremos farão | faria farias faria faríamos fariam | faça faças faça façamos façam | fazendo feito`);
for (const prefix of ["des", "re", "satis"]) IRREGULAR[`${prefix}fazer`] = prefixed(prefix, IRREGULAR.fazer);
IRREGULAR.dizer = table(`digo dizes diz dizemos dizem | disse disseste disse dissemos disseram | dizia dizias dizia dizíamos diziam |
  direi dirás dirá diremos dirão | diria dirias diria diríamos diriam | diga digas diga digamos digam | dizendo dito`);
for (const prefix of ["contra", "pre"]) IRREGULAR[`${prefix}dizer`] = prefixed(prefix, IRREGULAR.dizer);
IRREGULAR.poder = patch("poder", {
  presente: "posso podes pode podemos podem",
  perfeito: "pude pudeste pôde pudemos puderam",
  subjuntivo: "possa possas possa possamos possam",
});
IRREGULAR.querer = patch("querer", {
  presente: "quero queres quer queremos querem",
  perfeito: "quis quiseste quis quisemos quiseram",
  subjuntivo: "queira queiras queira queiramos queiram",
});
IRREGULAR.saber = patch("saber", {
  presente: "sei sabes sabe sabemos sabem",
  perfeito: "soube soubeste soube soubemos souberam",
  subjuntivo: "saiba saibas saiba saibamos saibam",
});
IRREGULAR.caber = patch("caber", {
  presente: "caibo cabes cabe cabemos cabem",
  perfeito: "coube coubeste coube coubemos couberam",
  subjuntivo: "caiba caibas caiba caibamos caibam",
});
IRREGULAR.ver = table(`vejo vês vê vemos veem | vi viste viu vimos viram | via vias via víamos viam |
  verei verás verá veremos verão | veria verias veria veríamos veriam | veja vejas veja vejamos vejam | vendo visto`);
for (const prefix of ["pre", "re"]) IRREGULAR[`${prefix}ver`] = prefixed(prefix, IRREGULAR.ver);
IRREGULAR.dar = table(`dou dás dá damos dão | dei deste deu demos deram | dava davas dava dávamos davam |
  darei darás dará daremos darão | daria darias daria daríamos dariam | dê dês dê demos deem | dando dado`);
IRREGULAR["pôr"] = table(`ponho pões põe pomos põem | pus puseste pôs pusemos puseram | punha punhas punha púnhamos punham |
  porei porás porá poremos porão | poria porias poria poríamos poriam | ponha ponhas ponha ponhamos ponham | pondo posto`);
for (const prefix of ["com", "pro", "im", "dis", "ex", "su", "re", "o", "de", "sobre", "pres", "trans"]) {
  IRREGULAR[`${prefix}por`] = prefixed(prefix, IRREGULAR["pôr"], {
    perfeito: `${prefix}pus ${prefix}puseste ${prefix}pôs ${prefix}pusemos ${prefix}puseram`,
  });
}
IRREGULAR.trazer = table(`trago trazes traz trazemos trazem | trouxe trouxeste trouxe trouxemos trouxeram |
  trazia trazias trazia trazíamos traziam | trarei trarás trará traremos trarão |
  traria trarias traria traríamos trariam | traga tragas traga tragamos tragam | trazendo trazido`);
IRREGULAR.ler = table(`leio lês lê lemos leem | li leste leu lemos leram | lia lias lia líamos liam |
  lerei lerás lerá leremos lerão | leria lerias leria leríamos leriam | leia leias leia leiamos leiam | lendo lido`);
IRREGULAR.reler = prefixed("re", IRREGULAR.ler);
IRREGULAR.crer = table(`creio crês crê cremos creem | cri creste creu cremos creram | cria crias cria críamos criam |
  crerei crerás crerá creremos crerão | creria crerias creria creríamos creriam | creia creias creia creiamos creiam | crendo crido`);
IRREGULAR.rir = table(`rio ris ri rimos riem | ri riste riu rimos riram | ria rias ria ríamos riam |
  rirei rirás rirá riremos rirão | riria ririas riria riríamos ririam | ria rias ria riamos riam | rindo rido`);
IRREGULAR.sorrir = prefixed("sor", IRREGULAR.rir);
IRREGULAR.ouvir = patch("ouvir", { presente: "ouço ouves ouve ouvimos ouvem", subjuntivo: "ouça ouças ouça ouçamos ouçam" });
IRREGULAR.perder = patch("perder", { presente: "perco perdes perde perdemos perdem", subjuntivo: "perca percas perca percamos percam" });
IRREGULAR.valer = patch("valer", { presente: "valho vales vale valemos valem", subjuntivo: "valha valhas valha valhamos valham" });
for (const verb of ["pedir", "despedir", "impedir", "medir"]) {
  const stem = verb.slice(0, -3);
  const c = `${stem}ç`;
  IRREGULAR[verb] = patch(verb, {
    presente: `${c}o ${stem}des ${stem}de ${stem}dimos ${stem}dem`,
    subjuntivo: `${c}a ${c}as ${c}a ${c}amos ${c}am`,
  });
}
// Troca de vogal só na 1ª pessoa do presente e no subjuntivo (sentir -> sinto).
const VOWEL_SWAP = {
  sentir: "sint", consentir: "consint", mentir: "mint", ressentir: "ressint",
  servir: "sirv", preferir: "prefir", referir: "refir", sugerir: "sugir", ferir: "fir",
  inserir: "insir", transferir: "transfir", conferir: "confir", interferir: "interfir",
  digerir: "digir", vestir: "vist", investir: "invist", repetir: "repit", refletir: "reflit",
  divertir: "divirt", advertir: "advirt", seguir: "sig", conseguir: "consig", perseguir: "persig",
  prosseguir: "prossig", dormir: "durm", cobrir: "cubr", descobrir: "descubr", tossir: "tuss",
};
for (const [verb, stem] of Object.entries(VOWEL_SWAP)) {
  const base = regular(verb);
  base.presente[0] = `${stem}o`;
  base.subjuntivo = words(`${stem}a ${stem}as ${stem}a ${stem}amos ${stem}am`);
  IRREGULAR[verb] = base;
}
// u -> o na 2ª e 3ª pessoas e em eles (subir -> sobes, sobe, sobem).
for (const verb of ["subir", "sumir", "consumir", "acudir", "sacudir", "cuspir", "fugir"]) {
  const base = regular(verb);
  const stem = verb.slice(0, -2);
  const swapped = stem.replace(/u([^u]*)$/, "o$1");
  base.presente[1] = `${swapped}es`;
  base.presente[2] = `${swapped}e`;
  base.presente[4] = `${swapped}em`;
  if (verb === "fugir") {
    base.presente[0] = "fujo";
    base.subjuntivo = words("fuja fujas fuja fujamos fujam");
  }
  IRREGULAR[verb] = base;
}
for (const prefix of ["cons", "des"]) {
  const verb = `${prefix}truir`;
  IRREGULAR[verb] = patch(verb, {
    presente: `${prefix}truo ${prefix}tróis ${prefix}trói ${prefix}truímos ${prefix}troem`,
  });
}
for (const verb of ["odiar", "ansiar", "remediar", "incendiar", "mediar", "intermediar"]) {
  const stem = verb.slice(0, -3);
  IRREGULAR[verb] = patch(verb, {
    presente: `${stem}eio ${stem}eias ${stem}eia ${stem}iamos ${stem}eiam`,
    subjuntivo: `${stem}eie ${stem}eies ${stem}eie ${stem}iemos ${stem}eiem`,
  });
}

// Particípio irregular (o resto segue a regra ou a tabela acima).
const PARTICIPLES = {
  abrir: "aberto", cobrir: "coberto", descobrir: "descoberto", escrever: "escrito",
  descrever: "descrito", inscrever: "inscrito",
};
for (const [verb, participle] of Object.entries(PARTICIPLES)) {
  IRREGULAR[verb] = { ...(IRREGULAR[verb] ?? regular(verb)), participio: participle };
}

// ---------------------------------------------------------------- montagem

const conjugated = new Set(lines(await source("pt_conj.txt")).map(normalize));
const icf = new Map();
for (const line of lines(await source("pt_icf.txt"))) {
  const [raw, score] = line.split(",");
  const word = normalize(raw);
  const value = Number(score);
  if (!(icf.get(word) <= value)) icf.set(word, value);
}

const verbs = lines(await source("pt_verbos.txt")).map((raw) => raw.toLowerCase());
const chosen = [];
const rejected = [];
const irregularKeys = new Set(Object.keys(IRREGULAR).map(normalize));

for (const verb of verbs) {
  const key = normalize(verb);
  if (EXCLUDED.has(key) || !/(ar|er|ir|or)$/.test(key)) continue;
  if ((icf.get(key) ?? Infinity) > MAX_ICF && !irregularKeys.has(key)) continue;
  if (key.endsWith("or") && !IRREGULAR[verb] && !IRREGULAR[key]) continue;

  const forms = IRREGULAR[verb] ?? IRREGULAR[key] ?? regular(verb);
  const all = [...TENSES.flatMap((tense) => forms[tense]), forms.gerundio, forms.participio];
  const missing = all.filter((form) => !conjugated.has(normalize(form)));
  if (missing.length > 0) {
    rejected.push(`${verb}: ${missing.join(", ")}`);
    continue;
  }
  chosen.push({ verb, irregular: Boolean(IRREGULAR[verb] ?? IRREGULAR[key]), ...forms });
}

if (!existsSync(dirname(OUTPUT))) mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(chosen)}\n`);
console.log(`${chosen.length} verbos (${chosen.filter((v) => v.irregular).length} irregulares) em ${OUTPUT}`);
console.log(`${rejected.length} verbos recusados (forma que não bate com a lista):`);
for (const line of rejected) console.log(`  ${line}`);
