import { TaskHeader } from "@/components/TaskHeader";
import { useScreenReaderEnabled } from "@/hooks/useAccessibility";
import { useAlarmDismissal } from "@/hooks/useAlarmDismissal";
import { useSettingsStore } from "@/store/settingsStore";
import { type TileState } from "@/tasks/memoryGame";
import { parseTaskParams } from "@/tasks/params";
import { useMemoryGame } from "@/tasks/useMemoryGame";
import { colors, radii, spacing, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TILE_COLORS: Record<TileState, string> = {
  DEFAULT: colors.surface,
  SHOWING: colors.primary,
  CORRECT: colors.success,
  INCORRECT: colors.danger,
};

export default function MemoryGameScreen() {
  const dismiss = useAlarmDismissal();
  const screenReaderEnabled = useScreenReaderEnabled();
  const showTileNumbersSetting = useSettingsStore(
    (s) => s.settings.showTileNumbers,
  );
  const showTileNumbers =
    screenReaderEnabled === true || showTileNumbersSetting;
  const { rounds: roundsParam, difficulty: difficultyParam } =
    useLocalSearchParams<{
      rounds?: string;
      difficulty?: string;
    }>();
  const { rounds, difficulty } = parseTaskParams(roundsParam, difficultyParam);

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
      <TaskHeader title="Memory" onAutoDismiss={dismiss} />
      <View style={styles.column}>
        {gameStarted ? (
          <Text
            style={styles.round}
            accessibilityLabel={`Round ${currentRound} of ${rounds}`}
          >
            Round: {currentRound}/{rounds}
          </Text>
        ) : null}
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {titleText}
        </Text>
        <View style={styles.grid}>
          {Array.from({ length: gridSize }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: gridSize }).map((_, col) => {
                const index = row * gridSize + col;
                const state = gridItems[index];
                const tileStateLabel =
                  state === "SHOWING"
                    ? "highlighted"
                    : state === "CORRECT"
                      ? "correct"
                      : state === "INCORRECT"
                        ? "incorrect"
                        : "";
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.tile,
                      { backgroundColor: TILE_COLORS[state] },
                    ]}
                    disabled={!playerTurn}
                    accessibilityRole="button"
                    accessibilityLabel={[`Tile ${index + 1}`, tileStateLabel]
                      .filter(Boolean)
                      .join(", ")}
                    accessibilityHint={
                      playerTurn
                        ? "Tap to select this tile"
                        : "Wait for your turn"
                    }
                    accessibilityState={{ disabled: !playerTurn }}
                    onPress={() => {
                      void handleTilePress(index);
                    }}
                  >
                    {showTileNumbers ? (
                      <Text
                        style={styles.tileNumber}
                        importantForAccessibility="no"
                        accessibilityElementsHidden
                      >
                        {index + 1}
                      </Text>
                    ) : null}
                  </Pressable>
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
            accessibilityLabel="Start memory game"
            accessibilityHint="Reveals the tile sequence"
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
    alignItems: "center",
    justifyContent: "center",
  },
  tileNumber: {
    ...typography.bodyEmphasis,
    color: colors.text,
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
