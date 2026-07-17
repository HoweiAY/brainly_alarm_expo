import { PROTOTYPE_ROUNDS, type TileState } from "@/tasks/memoryGame";
import { useMemoryGame } from "@/tasks/useMemoryGame";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TILE_COLORS: Record<TileState, string> = {
  DEFAULT: "#BDBDBD",
  SHOWING: "#FFEB3B",
  CORRECT: "#4CAF50",
  INCORRECT: "#F44336",
};

export default function MemoryGameScreen() {
  const router = useRouter();
  const { rounds, difficulty } = useLocalSearchParams<{
    rounds?: string;
    difficulty?: string;
  }>();
  void rounds;
  void difficulty;

  const {
    gridItems,
    titleText,
    currentRound,
    gameStarted,
    playerTurn,
    start,
    handleTilePress,
  } = useMemoryGame({
    rounds: PROTOTYPE_ROUNDS,
    onComplete: () => {
      router.dismissAll();
      router.replace("/(main)");
    },
  });

  const gridSize = Math.round(Math.sqrt(gridItems.length));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.column}>
        {gameStarted ? (
          <Text style={styles.round}>
            Round: {currentRound}/{PROTOTYPE_ROUNDS}
          </Text>
        ) : null}
        <Text style={styles.title}>{titleText}</Text>
        <View style={styles.grid}>
          {Array.from({ length: gridSize }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: gridSize }).map((_, col) => {
                const index = row * gridSize + col;
                const state = gridItems[index];
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.tile,
                      { backgroundColor: TILE_COLORS[state] },
                    ]}
                    disabled={!playerTurn}
                    onPress={() => {
                      void handleTilePress(index);
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
        {!gameStarted ? (
          <Button title="Start" onPress={() => void start()} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  round: {
    fontSize: 16,
    color: "#555",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  grid: {
    flexDirection: "column",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
  },
  tile: {
    width: 64,
    height: 64,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
});
