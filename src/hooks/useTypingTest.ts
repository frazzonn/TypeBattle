import { useEffect, useMemo, useRef, useState } from "react";

const TEXTS = [
  "A prática constante ajuda a melhorar a velocidade e a precisão na digitação.",
  "A tecnologia está presente em diferentes áreas e facilita muitas tarefas do dia a dia.",
  "Aprender programação exige prática, paciência e vontade de resolver problemas.",
  "O desenvolvimento de software envolve planejamento, criatividade, testes e trabalho em equipe.",
  "Quanto mais você pratica, mais natural e rápida fica a sua digitação.",
  "A engenharia de software busca criar soluções eficientes, organizadas e fáceis de manter.",
  "Estudar todos os dias, mesmo por pouco tempo, pode trazer grandes resultados no futuro.",
  "Um bom programador não precisa saber tudo, mas precisa saber pesquisar e aprender.",
  "Resolver problemas é uma das principais habilidades de quem trabalha com tecnologia.",
  "Pequenas melhorias feitas todos os dias podem gerar grandes resultados ao longo do tempo.",
];

export const TIME_OPTIONS = [15, 30, 60];

export function useTypingTest() {
  const [selectedTime, setSelectedTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  const [input, setInput] = useState("");
  const [textIndex, setTextIndex] = useState(0);

  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Dados acumulados durante todo o teste.
  const [totalCharacters, setTotalCharacters] = useState(0);

  const [totalCorrectCharacters, setTotalCorrectCharacters] = useState(0);

  const [totalErrors, setTotalErrors] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const targetText = TEXTS[textIndex];

  // Troca para o próximo texto.
  function changeText() {
    setTextIndex((previous) => (previous + 1) % TEXTS.length);
  }

  // Reinicia o teste.
  function resetTest() {
    setInput("");
    setTimeLeft(selectedTime);

    setIsStarted(false);
    setIsFinished(false);

    setTotalCharacters(0);
    setTotalCorrectCharacters(0);
    setTotalErrors(0);

    changeText();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  // Permite escolher o tempo antes de iniciar.
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
  }

  // Controla o cronômetro.
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

  // Registra cada caractere digitado.
  function handleInputChange(value: string) {
    if (isFinished) {
      return;
    }

    if (!isStarted && value.length > 0) {
      setIsStarted(true);
    }

    const previousLength = input.length;

    // Considera somente os caracteres novos.
    const newCharacters = value.slice(previousLength);

    if (newCharacters.length > 0) {
      let correct = 0;
      let errors = 0;

      for (let i = 0; i < newCharacters.length; i++) {
        const targetIndex = previousLength + i;

        if (newCharacters[i] === targetText[targetIndex]) {
          correct++;
        } else {
          errors++;
        }
      }

      setTotalCharacters((previous) => previous + newCharacters.length);

      setTotalCorrectCharacters((previous) => previous + correct);

      setTotalErrors((previous) => previous + errors);
    }

    // Quando termina um texto, passa automaticamente para outro.
    if (value.length >= targetText.length) {
      setInput("");
      changeText();
      return;
    }

    setInput(value);
  }

  const elapsedSeconds = selectedTime - timeLeft;

  // Calcula a velocidade média do teste inteiro.
  const ppm = useMemo(() => {
    if (elapsedSeconds <= 0) {
      return 0;
    }

    const minutes = elapsedSeconds / 60;

    return Math.round(totalCharacters / 5 / minutes);
  }, [totalCharacters, elapsedSeconds]);

  // Calcula a precisão total.
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
