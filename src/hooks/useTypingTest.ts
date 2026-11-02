import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  generateText,
  loadQuotes,
  loadWordBank,
  pickQuote,
  type Quote,
  type QuoteLength,
  type TextDifficulty,
  type WordBank,
} from "../utils/textGenerator";
import {
  getRecordKey,
  registerResult,
  type RecordResult,
} from "../utils/typingRecords";

export const TIME_OPTIONS = [15, 30, 60];
export const WORD_OPTIONS = [10, 25, 50, 100];

// Tempo: digita até o relógio zerar. Palavras: um número fixo de palavras.
// Frases: uma frase pronta do idioma, do começo ao fim.
// Perseguição: um cursor vem atrás de você, cada vez mais rápido.
export type TestMode = "time" | "words" | "quote" | "chase";

// Perseguição: o perseguidor espera um pouco, sai a 20 PPM e acelera
// 1,5 PPM por segundo (aos 30 s está a 65 PPM; aos 60 s, a 110 PPM).
export const CHASE_DELAY_MS = 2000;
const CHASE_START_PPM = 20;
const CHASE_ACCELERATION = 1.5;

export function getChaserSpeed(milliseconds: number) {
  const seconds = Math.max(0, milliseconds - CHASE_DELAY_MS) / 1000;
  return Math.round(CHASE_START_PPM + CHASE_ACCELERATION * seconds);
}

// Quantas letras o perseguidor já andou (1 palavra = 5 letras).
export function getChaserPosition(milliseconds: number) {
  const seconds = Math.max(0, milliseconds - CHASE_DELAY_MS) / 1000;
  const words =
    (CHASE_START_PPM * seconds + (CHASE_ACCELERATION * seconds ** 2) / 2) / 60;
  return words * 5;
}
export type QuoteLengthFilter = QuoteLength | "all";

interface TypingSettings {
  mode: TestMode;
  time: number;
  wordCount: number;
  quoteLength: QuoteLengthFilter;
  language: string;
  difficulty: TextDifficulty;
  useAccents: boolean;
  useUppercase: boolean;
  usePunctuation: boolean;
}

// Um ponto do gráfico do resultado (o último pode ser uma fração de segundo).
export interface SecondSample {
  second: number;
  ppm: number;
  errors: number;
}

export interface TypingTestResult {
  ppm: number;
  accuracy: number;
  errors: number;
  characters: number;
  // Exato no modo tempo; nos outros, quanto a pessoa levou.
  durationSeconds: number;
  history: SecondSample[];
  // Letra esperada -> quantas vezes errou nela (" " é o espaço).
  missedKeys: Record<string, number>;
  record: RecordResult;
  quote: Quote | null;
}

const SETTINGS_KEY = "typebattle_typing_settings";

const DEFAULT_SETTINGS: TypingSettings = {
  mode: "time",
  time: 30,
  wordCount: 25,
  quoteLength: "all",
  language: DEFAULT_LANGUAGE,
  difficulty: "easy",
  useAccents: false,
  useUppercase: false,
  usePunctuation: false,
};

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// Configurações da última visita; valores inválidos voltam ao padrão.
function loadSettings(): TypingSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) ?? "{}",
    ) as Record<string, unknown> | null;
    if (!saved || typeof saved !== "object") return DEFAULT_SETTINGS;

    const flag = (value: unknown, fallback: boolean) =>
      typeof value === "boolean" ? value : fallback;

    return {
      mode: pick(
        saved.mode,
        ["time", "words", "quote", "chase"],
        DEFAULT_SETTINGS.mode,
      ),
      time: pick(saved.time, TIME_OPTIONS, DEFAULT_SETTINGS.time),
      wordCount: pick(
        saved.wordCount,
        WORD_OPTIONS,
        DEFAULT_SETTINGS.wordCount,
      ),
      quoteLength: pick(
        saved.quoteLength,
        ["all", "short", "medium", "long"],
        DEFAULT_SETTINGS.quoteLength,
      ),
      language: pick(
        saved.language,
        LANGUAGE_OPTIONS.map((option) => option.code),
        DEFAULT_SETTINGS.language,
      ),
      difficulty: pick(
        saved.difficulty,
        ["easy", "normal", "hard"],
        DEFAULT_SETTINGS.difficulty,
      ),
      useAccents: flag(saved.useAccents, DEFAULT_SETTINGS.useAccents),
      useUppercase: flag(saved.useUppercase, DEFAULT_SETTINGS.useUppercase),
      usePunctuation: flag(
        saved.usePunctuation,
        DEFAULT_SETTINGS.usePunctuation,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function calculatePpm(correct: number, milliseconds: number) {
  if (milliseconds <= 0) return 0;
  return Math.round(correct / 5 / (milliseconds / 60_000));
}

function calculateAccuracy(correct: number, characters: number) {
  return characters === 0 ? 100 : Math.round((correct / characters) * 100);
}

export function useTypingTest() {
  const [settings, setSettings] = useState(loadSettings);
  const {
    mode,
    time,
    wordCount,
    quoteLength,
    language,
    difficulty,
    useAccents,
    useUppercase,
    usePunctuation,
  } = settings;

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Sem armazenamento, só não lembra na próxima visita.
    }
  }, [settings]);

  const [loadedBank, setLoadedBank] = useState<{
    language: string;
    words: WordBank;
  } | null>(null);
  const [loadedQuotes, setLoadedQuotes] = useState<{
    language: string;
    quotes: Quote[];
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const bank = loadedBank?.language === language ? loadedBank.words : null;
  const quotes =
    loadedQuotes?.language === language ? loadedQuotes.quotes : null;
  const isQuoteMode = mode === "quote";
  const sourceReady = isQuoteMode ? quotes !== null : bank !== null;
  // Idioma sem frases prontas no modo frases.
  const noQuotes = isQuoteMode && quotes !== null && quotes.length === 0;

  // Palavras e frases ficam em arquivos separados, baixados sob demanda.
  useEffect(() => {
    let active = true;

    const request = isQuoteMode
      ? loadQuotes(language).then((items) => {
          if (active) setLoadedQuotes({ language, quotes: items });
        })
      : loadWordBank(language).then((words) => {
          if (active) setLoadedBank({ language, words });
        });

    request
      .then(() => {
        if (active) setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [language, isQuoteMode]);

  const [input, setInput] = useState("");
  const [targetText, setTargetText] = useState("");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  function buildWords(count: number) {
    if (!bank) return "";

    return generateText({
      bank,
      difficulty,
      language,
      wordCount: count,
      useAccents,
      useUppercase,
      usePunctuation,
    });
  }

  // Texto vazio = gerar um novo assim que as palavras ou frases chegarem.
  if (sourceReady && !noQuotes && targetText === "") {
    if (isQuoteMode) {
      const quote = pickQuote(quotes ?? [], quoteLength, currentQuote?.text);
      setCurrentQuote(quote);
      setTargetText(quote?.text ?? "");
    } else {
      setTargetText(buildWords(mode === "words" ? wordCount : 80));
    }
  }

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<TypingTestResult | null>(null);

  const [totalCharacters, setTotalCharacters] = useState(0);
  const [totalCorrectCharacters, setTotalCorrectCharacters] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  // Letras certas desde o começo, até o primeiro erro (posição na perseguição).
  const [correctPrefix, setCorrectPrefix] = useState(0);

  // Usados ao terminar (no relógio ou na última tecla), sem esperar o estado.
  const totalsRef = useRef({ characters: 0, correct: 0, errors: 0 });
  const missedKeysRef = useRef<Record<string, number>>({});
  const historyRef = useRef<SecondSample[]>([]);
  const lastSampleRef = useRef({ second: 0, errors: 0 });
  // Tempo já corrido antes da última pausa e início do trecho atual.
  const elapsedBeforeRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Volta ao começo; com texto vazio, um novo é gerado.
  function restart() {
    setInput("");
    setTargetText("");
    setIsStarted(false);
    setIsFinished(false);
    setIsPaused(false);
    setElapsedMs(0);
    setResult(null);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);
    setCorrectPrefix(0);

    totalsRef.current = { characters: 0, correct: 0, errors: 0 };
    missedKeysRef.current = {};
    historyRef.current = [];
    lastSampleRef.current = { second: 0, errors: 0 };
    elapsedBeforeRef.current = 0;
    segmentStartRef.current = null;
  }

  function updateSettings(changes: Partial<TypingSettings>) {
    if (isStarted) return;

    setSettings((current) => ({ ...current, ...changes }));
    restart();
  }

  function resetTest() {
    restart();
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function getElapsedNow() {
    const segmentStart = segmentStartRef.current;
    return (
      elapsedBeforeRef.current +
      (segmentStart === null ? 0 : Date.now() - segmentStart)
    );
  }

  function addSample(second: number) {
    const { correct, errors } = totalsRef.current;

    historyRef.current.push({
      second,
      ppm: calculatePpm(correct, second * 1000),
      errors: errors - lastSampleRef.current.errors,
    });
    lastSampleRef.current = { second, errors };
  }

  // Um ponto por segundo completo; no fim, também a fração que sobrou.
  function recordSamples(milliseconds: number, isFinal = false) {
    const seconds = milliseconds / 1000;

    for (
      let second = lastSampleRef.current.second + 1;
      second <= Math.floor(seconds);
      second += 1
    ) {
      addSample(second);
    }

    if (isFinal && seconds - lastSampleRef.current.second > 0.05) {
      addSample(Math.round(seconds * 10) / 10);
    }
  }

  function finish(milliseconds: number) {
    segmentStartRef.current = null;
    recordSamples(milliseconds, true);

    const { characters, correct, errors } = totalsRef.current;
    const finalPpm = calculatePpm(correct, milliseconds);
    const amount = mode === "time" ? time : mode === "words" ? wordCount : null;
    const durationSeconds = Math.round(milliseconds / 100) / 10;
    // Na perseguição o recorde é quanto tempo você aguentou.
    const recordValue = mode === "chase" ? durationSeconds : finalPpm;

    setResult({
      ppm: finalPpm,
      accuracy: calculateAccuracy(correct, characters),
      errors,
      characters,
      durationSeconds,
      history: [...historyRef.current],
      missedKeys: { ...missedKeysRef.current },
      record: registerResult(getRecordKey(mode, amount, language), recordValue),
      quote: currentQuote,
    });
    setElapsedMs(milliseconds);
    setIsStarted(false);
    setIsFinished(true);
  }

  const handleTick = useEffectEvent((milliseconds: number) => {
    const limit = time * 1000;

    if (mode === "time" && milliseconds >= limit) {
      finish(limit);
      return;
    }

    // Perseguição: o perseguidor chegou na sua posição.
    if (
      mode === "chase" &&
      milliseconds > CHASE_DELAY_MS &&
      getChaserPosition(milliseconds) >= correctPrefix
    ) {
      finish(milliseconds);
      return;
    }

    recordSamples(milliseconds);

    // A tela só precisa mudar quando vira o segundo (o contador e o PPM ao
    // vivo são por segundo). Renderizar 10 vezes por segundo disputava com a
    // animação do cursor. Na perseguição, a vantagem muda 4 vezes por
    // segundo; o perseguidor em si é desenhado a cada quadro pelo texto.
    const step = mode === "chase" ? 250 : 1000;
    if (Math.floor(milliseconds / step) !== Math.floor(elapsedMs / step)) {
      setElapsedMs(milliseconds);
    }
  });

  // Conta o tempo em trechos: cada pausa fecha um trecho e guarda o total.
  useEffect(() => {
    if (!isStarted || isFinished || isPaused) return;

    const segmentStart = Date.now();
    segmentStartRef.current = segmentStart;

    const interval = setInterval(() => {
      handleTick(elapsedBeforeRef.current + (Date.now() - segmentStart));
    }, 100);

    return () => {
      clearInterval(interval);

      // Se o teste reiniciou ou terminou, o trecho já foi descartado.
      if (segmentStartRef.current === segmentStart) {
        elapsedBeforeRef.current += Date.now() - segmentStart;
        segmentStartRef.current = null;
      }
    };
  }, [isStarted, isFinished, isPaused]);

  // Trocar de aba, minimizar ou sair da janela pausa o teste.
  useEffect(() => {
    if (!isStarted || isFinished || isPaused) return;

    function pause() {
      setIsPaused(true);
    }

    function pauseWhenHidden() {
      if (document.hidden) pause();
    }

    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("blur", pause);

    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("blur", pause);
    };
  }, [isStarted, isFinished, isPaused]);

  function handleInputChange(value: string) {
    // Ainda carregando as palavras do idioma.
    if (isFinished || !sourceReady || targetText === "") return;

    if (!isStarted && value.length > 0) {
      elapsedBeforeRef.current = 0;
      setIsStarted(true);
    }

    // Voltar a digitar retoma o teste pausado.
    if (isPaused) setIsPaused(false);

    const previousLength = input.length;
    const newCharacters = value.slice(previousLength);

    if (newCharacters.length > 0) {
      let correct = 0;
      let errors = 0;

      for (let i = 0; i < newCharacters.length; i += 1) {
        const expected = targetText[previousLength + i];

        if (newCharacters[i] === expected) {
          correct += 1;
        } else {
          errors += 1;

          if (expected !== undefined) {
            const key = expected.toLocaleLowerCase();
            missedKeysRef.current[key] = (missedKeysRef.current[key] ?? 0) + 1;
          }
        }
      }

      const totals = totalsRef.current;
      totalsRef.current = {
        characters: totals.characters + newCharacters.length,
        correct: totals.correct + correct,
        errors: totals.errors + errors,
      };
      setTotalCharacters(totalsRef.current.characters);
      setTotalCorrectCharacters(totalsRef.current.correct);
      setTotalErrors(totalsRef.current.errors);
    }

    let prefix = 0;
    while (prefix < value.length && value[prefix] === targetText[prefix]) {
      prefix += 1;
    }
    setCorrectPrefix(prefix);

    // Nos modos sem fim, acrescenta palavras sem substituir o texto.
    const endless = mode === "time" || mode === "chase";
    if (endless && targetText.length - value.length < 300) {
      setTargetText((previous) => `${previous} ${buildWords(80)}`);
    }

    setInput(value);

    // Palavras e frases terminam na última letra do texto.
    if (!endless && value.length >= targetText.length) {
      finish(Math.max(getElapsedNow(), 1));
    }
  }

  // Função estável para o texto: o componente de digitação é memorizado e
  // só renderiza de novo quando o texto ou o que foi digitado mudam.
  const inputHandlerRef = useRef(handleInputChange);
  useLayoutEffect(() => {
    inputHandlerRef.current = handleInputChange;
  });
  const onInputChange = useCallback(
    (value: string) => inputHandlerRef.current(value),
    [],
  );

  // Posição do perseguidor agora (lê o relógio, sem esperar o estado).
  const getChaserNow = useCallback(() => {
    const segmentStart = segmentStartRef.current;
    const milliseconds =
      elapsedBeforeRef.current +
      (segmentStart === null ? 0 : Date.now() - segmentStart);
    return getChaserPosition(milliseconds);
  }, []);

  const timeLeft = Math.max(0, Math.ceil((time * 1000 - elapsedMs) / 1000));
  // Abaixo de 1 s o PPM ao vivo oscila demais.
  const ppm =
    elapsedMs < 1000 ? 0 : calculatePpm(totalCorrectCharacters, elapsedMs);
  const accuracy = calculateAccuracy(totalCorrectCharacters, totalCharacters);
  const chaserPosition =
    mode === "chase" && (isStarted || isFinished)
      ? getChaserPosition(elapsedMs)
      : null;

  // Progresso nos modos palavras e frases.
  const totalWords = targetText ? targetText.split(" ").length : 0;
  const typedWords = Math.min(
    totalWords,
    input.split(" ").length - 1 + (input.length >= targetText.length ? 1 : 0),
  );

  return {
    mode,
    selectedTime: time,
    wordCount,
    quoteLength,
    timeLeft,
    elapsedMs,
    chaserPosition,
    getChaserNow,
    chaserSpeed: getChaserSpeed(elapsedMs),
    correctPrefix,
    typedWords,
    totalWords,
    input,
    targetText,
    currentQuote,
    noQuotes,
    isStarted,
    isFinished,
    isPaused,
    result,
    totalCharacters,
    totalErrors,
    ppm,
    accuracy,
    inputRef,
    resetTest,
    handleInputChange: onInputChange,
    difficulty,
    language,
    isLoadingWords: !sourceReady && !loadError,
    loadError,
    useAccents,
    useUppercase,
    usePunctuation,
    changeMode: (value: TestMode) => updateSettings({ mode: value }),
    changeTime: (value: number) => updateSettings({ time: value }),
    changeWordCount: (value: number) => updateSettings({ wordCount: value }),
    changeQuoteLength: (value: QuoteLengthFilter) =>
      updateSettings({ quoteLength: value }),
    changeLanguage: (value: string) => {
      if (value !== language) updateSettings({ language: value });
    },
    changeDifficulty: (value: TextDifficulty) =>
      updateSettings({ difficulty: value }),
    changeAccents: (value: boolean) => updateSettings({ useAccents: value }),
    changeUppercase: (value: boolean) =>
      updateSettings({ useUppercase: value }),
    changePunctuation: (value: boolean) =>
      updateSettings({ usePunctuation: value }),
  };
}
