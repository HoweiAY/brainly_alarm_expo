import { type TileState } from "@/tasks/memoryGame";
import { useMemoryGame } from "@/tasks/useMemoryGame";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { colors, radii, spacing, typography } from "@/theme";

const TILE_COLORS: Record<TileState, string> = {
  DEFAULT: colors.surface,
  SHOWING: colors.primary,
  CORRECT: colors.success,
  INCORRECT: colors.danger,
};

export default function MemoryGameScreen() {
  const dismiss = useAlarmDismissal();
  const { rounds: roundsParam, difficulty: difficultyParam } =
    useLocalSearchParams<{
      rounds?: string;
      difficulty?: string;
    }>();
  const rounds = Number(roundsParam) || 3;
  const difficulty = (difficultyParam ?? "Normal") as
    "Easy" | "Normal" | "Hard";

  const {
    gridItems,
    titleText,
    currentRound,
    gameStarted,
    playerTurn,
    start,
    handleTilePress,
  } = useMemoryGame({
    rounds,
    difficulty,
    onComplete: () => {
      void dismiss();
    },
  });

  const gridSize = Math.round(Math.sqrt(gridItems.length));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Memory</Text>
      </View>
      <View style={styles.column}>
        {gameStarted ? (
          <Text style={styles.round}>
            Round: {currentRound}/{rounds}
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
          <Pressable
            style={({ pressed }) => [
              styles.start,
              pressed && styles.startPressed,
            ]}
            accessibilityRole="button"
            onPress={() => void start()}
          >
            <Text style={styles.startText}>Start</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerText: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  round: {
    ...typography.caption,
    color: colors.textMuted,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },
  grid: {
    flexDirection: "column",
    alignItems: "center",
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tile: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  start: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
  },
  startPressed: {
    backgroundColor: colors.primaryPressed,
  },
  startText: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
});
