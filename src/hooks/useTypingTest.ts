import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  generateText,
  loadWordBank,
  type TextDifficulty,
  type WordBank,
} from "../utils/textGenerator";

export const TIME_OPTIONS = [15, 30, 60];

// Sem as palavras do idioma carregadas, o texto fica vazio até chegarem.
function createTypingText(
  bank: WordBank | null,
  difficulty: TextDifficulty,
  useAccents: boolean,
  useUppercase: boolean,
  usePunctuation: boolean,
  language: string,
) {
  if (!bank) return "";

  return generateText({
    bank,
    difficulty,
    language,
    wordCount: 80,
    useAccents,
    useUppercase,
    usePunctuation,
  });
}

export function useTypingTest() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  const [difficulty, setDifficulty] = useState<TextDifficulty>("easy");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [useAccents, setUseAccents] = useState(false);
  const [useUppercase, setUseUppercase] = useState(false);
  const [usePunctuation, setUsePunctuation] = useState(false);

  const [loadedBank, setLoadedBank] = useState<{
    language: string;
    words: WordBank;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const bank = loadedBank?.language === language ? loadedBank.words : null;

  const [input, setInput] = useState("");
  const [targetText, setTargetText] = useState("");

  useEffect(() => {
    let active = true;

    loadWordBank(language)
      .then((words) => {
        if (!active) return;
        setLoadError(false);
        setLoadedBank({ language, words });
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [language]);

  // Quando as palavras do idioma chegam, gera o primeiro texto.
  if (bank && targetText === "") {
    setTargetText(
      createTypingText(
        bank,
        difficulty,
        useAccents,
        useUppercase,
        usePunctuation,
        language,
      ),
    );
  }

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [totalCharacters, setTotalCharacters] = useState(0);
  const [totalCorrectCharacters, setTotalCorrectCharacters] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  function generateConfiguredText(
    nextDifficulty = difficulty,
    nextAccents = useAccents,
    nextUppercase = useUppercase,
    nextPunctuation = usePunctuation,
    nextLanguage = language,
  ) {
    setTargetText(
      createTypingText(
        bank,
        nextDifficulty,
        nextAccents,
        nextUppercase,
        nextPunctuation,
        nextLanguage,
      ),
    );
  }

  function changeLanguage(value: string) {
    if (isStarted || value === language) return;

    // O texto novo é gerado quando as palavras do idioma terminam de carregar.
    setLanguage(value);
    setInput("");
    setTargetText("");
  }

  function changeDifficulty(value: TextDifficulty) {
    if (isStarted) return;

    setDifficulty(value);
    generateConfiguredText(value);
  }

  function changeAccents(value: boolean) {
    if (isStarted) return;

    setUseAccents(value);
    generateConfiguredText(difficulty, value);
  }

  function changeUppercase(value: boolean) {
    if (isStarted) return;

    setUseUppercase(value);
    generateConfiguredText(difficulty, useAccents, value);
  }

  function changePunctuation(value: boolean) {
    if (isStarted) return;

    setUsePunctuation(value);
    generateConfiguredText(difficulty, useAccents, useUppercase, value);
  }

  function resetTest() {
    setInput("");
    setTargetText(
      createTypingText(
        bank,
        difficulty,
        useAccents,
        useUppercase,
        usePunctuation,
        language,
      ),
    );
    setTimeLeft(selectedTime);
    setIsStarted(false);
    setIsFinished(false);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function changeTime(newTime: number | null) {
    if (newTime === null || isStarted) return;

    setSelectedTime(newTime);
    setTimeLeft(newTime);
    setInput("");
    setIsFinished(false);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    generateConfiguredText();
  }

  useEffect(() => {
    if (!isStarted || isFinished) return;

    const interval = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          setIsStarted(false);
          setIsFinished(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStarted, isFinished]);

  function handleInputChange(value: string) {
    // Ainda carregando as palavras do idioma.
    if (isFinished || !bank || targetText === "") return;

    if (!isStarted && value.length > 0) {
      setIsStarted(true);
    }

    const previousLength = input.length;
    const newCharacters = value.slice(previousLength);

    if (newCharacters.length > 0) {
      let correct = 0;
      let errors = 0;

      for (let i = 0; i < newCharacters.length; i += 1) {
        if (newCharacters[i] === targetText[previousLength + i]) {
          correct += 1;
        } else {
          errors += 1;
        }
      }

      setTotalCharacters((previous) => previous + newCharacters.length);
      setTotalCorrectCharacters((previous) => previous + correct);
      setTotalErrors((previous) => previous + errors);
    }

    // Acrescenta palavras no final sem substituir o texto atual.
    if (targetText.length - value.length < 300) {
      setTargetText(
        (previous) =>
          `${previous} ${createTypingText(
            bank,
            difficulty,
            useAccents,
            useUppercase,
            usePunctuation,
            language,
          )}`,
      );
    }

    setInput(value);
  }

  const elapsedSeconds = selectedTime - timeLeft;

  const ppm = useMemo(() => {
    if (elapsedSeconds <= 0) return 0;

    return Math.round(totalCorrectCharacters / 5 / (elapsedSeconds / 60));
  }, [totalCorrectCharacters, elapsedSeconds]);

  const accuracy = useMemo(() => {
    if (totalCharacters === 0) return 100;
    return Math.round((totalCorrectCharacters / totalCharacters) * 100);
  }, [totalCorrectCharacters, totalCharacters]);

  return {
    selectedTime,
    timeLeft,
    input,
    targetText,
    isStarted,
    isFinished,
    totalCharacters,
    totalErrors,
    ppm,
    accuracy,
    inputRef,
    changeTime,
    resetTest,
    handleInputChange,
    difficulty,
    language,
    isLoadingWords: !bank && !loadError,
    loadError,
    useAccents,
    useUppercase,
    usePunctuation,
    changeDifficulty,
    changeLanguage,
    changeAccents,
    changeUppercase,
    changePunctuation,
  };
}
