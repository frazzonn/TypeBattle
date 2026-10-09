import { useEffect, useMemo, useRef, useState } from "react";
import { generateText } from "../utils/textGenerator";

export const TIME_OPTIONS = [15, 30, 60];

// Gera um texto novo usando o gerador que criamos.
function createTypingText() {
  return generateText({
    difficulty: "normal",
    wordCount: 80,
    useAccents: false,
    useUppercase: false,
    usePunctuation: false,
  });
}

export function useTypingTest() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  const [input, setInput] = useState("");
  const [targetText, setTargetText] = useState(createTypingText);

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Estatísticas acumuladas durante o teste inteiro.
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [totalCorrectCharacters, setTotalCorrectCharacters] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Gera outro texto quando o atual termina.
  function changeText() {
    setTargetText(createTypingText());
  }

  // Limpa as estatísticas e prepara uma nova tentativa.
  function resetTest() {
    setInput("");
    setTimeLeft(selectedTime);

    setIsStarted(false);
    setIsFinished(false);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    changeText();

    // Deixa o campo pronto para começar novamente.
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  // Permite escolher a duração antes de iniciar.
  function changeTime(newTime: number | null) {
    if (newTime === null || isStarted) {
      return;
    }

    setSelectedTime(newTime);
    setTimeLeft(newTime);

    setInput("");
    setIsFinished(false);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    changeText();
  }

  // Controla o cronômetro do teste.
  useEffect(() => {
    if (!isStarted || isFinished) {
      return;
    }

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
    if (isFinished) {
      return;
    }

    // O cronômetro começa no primeiro caractere digitado.
    if (!isStarted && value.length > 0) {
      setIsStarted(true);
    }

    const previousLength = input.length;

    // Conta somente os caracteres adicionados nesta alteração.
    const newCharacters = value.slice(previousLength);

    if (newCharacters.length > 0) {
      let correct = 0;
      let errors = 0;

      for (let i = 0; i < newCharacters.length; i += 1) {
        const targetIndex = previousLength + i;
        const typedCharacter = newCharacters[i];
        const expectedCharacter = targetText[targetIndex];

        if (typedCharacter === expectedCharacter) {
          correct += 1;
        } else {
          errors += 1;
        }
      }

      setTotalCharacters((previous) => previous + newCharacters.length);
      setTotalCorrectCharacters((previous) => previous + correct);
      setTotalErrors((previous) => previous + errors);
    }

    // Ao completar o texto, prepara palavras aleatórias novas.
    if (value.length >= targetText.length) {
      setInput("");
      changeText();
      return;
    }

    // Também permite apagar caracteres para corrigir a digitação.
    setInput(value);
  }

  const elapsedSeconds = selectedTime - timeLeft;

  // PPM médio: cinco caracteres equivalem a uma palavra.
  const ppm = useMemo(() => {
    if (elapsedSeconds <= 0) {
      return 0;
    }

    const elapsedMinutes = elapsedSeconds / 60;

    return Math.round(totalCharacters / 5 / elapsedMinutes);
  }, [totalCharacters, elapsedSeconds]);

  // Precisão baseada nos caracteres corretos digitados.
  const accuracy = useMemo(() => {
    if (totalCharacters === 0) {
      return 100;
    }

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
  };
}
