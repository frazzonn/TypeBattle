import { useEffect, useMemo, useRef, useState } from "react";
import { generateText, type TextDifficulty } from "../utils/textGenerator";

export const TIME_OPTIONS = [15, 30, 60];

function createTypingText(
  difficulty: TextDifficulty,
  useAccents: boolean,
  useUppercase: boolean,
  usePunctuation: boolean,
) {
  return generateText({
    difficulty,
    wordCount: 80,
    useAccents,
    useUppercase,
    usePunctuation,
  });
}

export function useTypingTest() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  const [difficulty, setDifficulty] = useState<TextDifficulty>("normal");
  const [useAccents, setUseAccents] = useState(false);
  const [useUppercase, setUseUppercase] = useState(false);
  const [usePunctuation, setUsePunctuation] = useState(false);

  const [input, setInput] = useState("");
  const [targetText, setTargetText] = useState(() =>
    createTypingText("normal", false, false, false),
  );

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
  ) {
    setTargetText(
      createTypingText(
        nextDifficulty,
        nextAccents,
        nextUppercase,
        nextPunctuation,
      ),
    );
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
      createTypingText(difficulty, useAccents, useUppercase, usePunctuation),
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
    if (isFinished) return;

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
            difficulty,
            useAccents,
            useUppercase,
            usePunctuation,
          )}`,
      );
    }

    setInput(value);
  }

  const elapsedSeconds = selectedTime - timeLeft;

  const ppm = useMemo(() => {
    if (elapsedSeconds <= 0) return 0;
    return Math.round(totalCharacters / 5 / (elapsedSeconds / 60));
  }, [totalCharacters, elapsedSeconds]);

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
    useAccents,
    useUppercase,
    usePunctuation,
    changeDifficulty,
    changeAccents,
    changeUppercase,
    changePunctuation,
  };
}
