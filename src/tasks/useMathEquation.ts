import { useEffect, useRef, useState } from "react";
import {
  PROTOTYPE_DIFFICULTY,
  evaluateExpression,
  generateEquation,
  parseAnswer,
} from "./mathEquation";

export interface UseMathEquationOptions {
  rounds: number;
  onComplete: () => void;
}

export interface UseMathEquationResult {
  equation: string;
  input: string;
  isCorrect: boolean | null;
  currentRound: number;
  setInput: (text: string) => void;
  submit: () => void;
}

export function useMathEquation({
  rounds,
  onComplete,
}: UseMathEquationOptions): UseMathEquationResult {
  const [equation, setEquation] = useState<string>(() =>
    generateEquation(PROTOTYPE_DIFFICULTY),
  );
  const [input, setInput] = useState<string>("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);

  const roundRef = useRef<number>(1);
  const cancelledRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFeedbackReset = () => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (cancelledRef.current) return;
      setIsCorrect(null);
    }, 1000);
  };

  const submit = () => {
    if (isCorrect !== null) return;

    const expected = evaluateExpression(equation);
    const parsed = parseAnswer(input);

    if (parsed !== null && parsed === expected) {
      setIsCorrect(true);
      if (roundRef.current === rounds) {
        onComplete();
      } else {
        roundRef.current += 1;
        setCurrentRound(roundRef.current);
        setEquation(generateEquation(PROTOTYPE_DIFFICULTY));
      }
    } else {
      setIsCorrect(false);
    }
    setInput("");
    scheduleFeedbackReset();
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    equation,
    input,
    isCorrect,
    currentRound,
    setInput,
    submit,
  };
}
