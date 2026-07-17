import { useEffect, useRef, useState } from "react";
import {
  DIFFICULTY_CONFIG,
  PROTOTYPE_DIFFICULTY,
  type TileState,
  evaluateTap,
  generateOrder,
  newGrid,
} from "./memoryGame";

export interface UseMemoryGameOptions {
  rounds: number;
  onComplete: () => void;
}

export interface UseMemoryGameResult {
  gridItems: TileState[];
  titleText: string;
  currentRound: number;
  gameStarted: boolean;
  playerTurn: boolean;
  start: () => Promise<void>;
  handleTilePress: (idx: number) => Promise<void>;
}

export function useMemoryGame({ rounds, onComplete }: UseMemoryGameOptions): UseMemoryGameResult {
  const config = DIFFICULTY_CONFIG[PROTOTYPE_DIFFICULTY];

  const [gridItems, setGridItems] = useState<TileState[]>(() => newGrid(config.gridSize));
  const [titleText, setTitleText] = useState<string>("");
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [playerTurn, setPlayerTurn] = useState<boolean>(false);

  const gridRef = useRef<TileState[]>(gridItems);
  const orderRef = useRef<number[]>([]);
  const playerIndexRef = useRef<number>(0);
  const roundRef = useRef<number>(1);
  const cancelledRef = useRef<boolean>(false);
  const busyRef = useRef<boolean>(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const id = setTimeout(resolve, ms);
      timeoutsRef.current.push(id);
    });

  const setTile = (idx: number, state: TileState) => {
    const next = gridRef.current.slice();
    next[idx] = state;
    gridRef.current = next;
    setGridItems(next);
  };

  const resetGrid = () => {
    const fresh = newGrid(config.gridSize);
    gridRef.current = fresh;
    setGridItems(fresh);
  };

  const start = async () => {
    busyRef.current = true;
    setGameStarted(true);
    setPlayerTurn(false);
    setCurrentRound(roundRef.current);
    setTitleText("Remember the order!");
    resetGrid();

    const order = generateOrder(config);
    orderRef.current = order;
    playerIndexRef.current = 0;

    await delay(500);
    if (cancelledRef.current) return;

    for (const idx of order) {
      await delay(500);
      if (cancelledRef.current) return;
      setTile(idx, "SHOWING");
      await delay(500);
      if (cancelledRef.current) return;
      setTile(idx, "DEFAULT");
    }

    if (cancelledRef.current) return;
    setPlayerTurn(true);
    setTitleText("Click the tiles in order!");
    busyRef.current = false;
  };

  const handleTilePress = async (idx: number) => {
    if (!playerTurn || busyRef.current || gridRef.current[idx] !== "DEFAULT") return;

    const result = evaluateTap(orderRef.current, playerIndexRef.current, idx);

    if (result.correct) {
      setTile(idx, "CORRECT");
      playerIndexRef.current = result.nextPlayerIndex;
      if (result.roundComplete) {
        busyRef.current = true;
        setPlayerTurn(false);
        setTitleText("Correct");
        await delay(1000);
        if (cancelledRef.current) return;
        if (roundRef.current === rounds) {
          onComplete();
          return;
        }
        roundRef.current += 1;
        setCurrentRound(roundRef.current);
        await start();
      }
    } else {
      busyRef.current = true;
      setPlayerTurn(false);
      setTile(idx, "INCORRECT");
      setTitleText("Incorrect");
      await delay(1000);
      if (cancelledRef.current) return;
      await start();
    }
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  return { gridItems, titleText, currentRound, gameStarted, playerTurn, start, handleTilePress };
}
