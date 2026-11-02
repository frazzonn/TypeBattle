// Melhor PPM por modo, guardado no navegador. Para quem está logado, os
// recordes do modo tempo também vêm do histórico salvo no servidor.
const RECORDS_KEY = "typebattle_records";

type Records = Record<string, number>;

export interface RecordResult {
  // Recorde anterior neste modo (null na primeira vez).
  previous: number | null;
  isNew: boolean;
}

function readRecords(): Records {
  try {
    const value = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? "{}");
    return value && typeof value === "object" ? (value as Records) : {};
  } catch {
    return {};
  }
}

function writeRecords(records: Records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // Sem armazenamento o teste funciona, só não lembra o recorde.
  }
}

// Ex.: "time-30-portuguese", "words-25-english", "quote-portuguese".
export function getRecordKey(
  mode: string,
  amount: number | null,
  language: string,
) {
  return amount === null
    ? `${mode}-${language}`
    : `${mode}-${amount}-${language}`;
}

// Compara com o recorde atual e guarda o novo, se for maior.
export function registerResult(key: string, ppm: number): RecordResult {
  const records = readRecords();
  const previous = typeof records[key] === "number" ? records[key] : null;
  const isNew = ppm > 0 && (previous === null || ppm > previous);

  if (isNew) writeRecords({ ...records, [key]: ppm });

  return { previous, isNew };
}

// Junta os melhores resultados do histórico da conta aos recordes locais.
export function mergeServerRecords(
  results: { ppm: number; duration: number; language?: string }[],
) {
  const records = readRecords();
  let changed = false;

  for (const result of results) {
    const key = getRecordKey(
      "time",
      result.duration,
      result.language ?? "portuguese",
    );

    if (result.ppm > (records[key] ?? -1)) {
      records[key] = result.ppm;
      changed = true;
    }
  }

  if (changed) writeRecords(records);
}
