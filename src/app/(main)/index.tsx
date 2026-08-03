import { AlarmCard } from "@/components/AlarmCard";
import { cancelAlarm, setAlarm } from "@/alarms/scheduling";
import { findConflictingAlarm } from "@/alarms/conflicts";
import type { Alarm } from "@/data/types";
import { useAlarmStore } from "@/store/alarmStore";
import { colors, radii, spacing, typography } from "@/theme";
import { computeNextAlarm, formatCountdown, formatTime } from "@/utils/time";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TICK_MS = 60_000;

export default function Home() {
  const router = useRouter();
  const alarms = useAlarmStore((s) => s.alarms);
  const [editEnabled, setEditEnabled] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    useAlarmStore.getState().loadAlarms();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(
    () => formatCountdown(computeNextAlarm(alarms, now)),
    [alarms, now],
  );

  const toggleEnabled = (alarm: Alarm) => {
    if (!alarm.enabled) {
      const conflict = findConflictingAlarm(alarms, alarm, alarm.id);
      if (conflict) {
        Alert.alert(
          "Alarm already set",
          `An alarm with the same time (${formatTime(alarm.hour, alarm.minute)}) has already been set.`,
        );
        return;
      }
    }
    const next = { ...alarm, enabled: !alarm.enabled };
    void (async () => {
      try {
        await useAlarmStore.getState().updateAlarm(next);
        if (next.enabled) await setAlarm(next);
        else await cancelAlarm(next);
      } catch (e) {
        console.error("toggleEnabled failed", e);
        Alert.alert("Error", "Could not update the alarm. Please try again.");
      }
    })();
  };

  const turnAllOnOff = async () => {
    setOptionsExpanded(false);
    const allOn = alarms.length > 0 && alarms.every((a) => a.enabled);
    const store = useAlarmStore.getState();
    if (allOn) {
      const results = await Promise.allSettled(
        alarms.map(async (a) => {
          const next = { ...a, enabled: false };
          await store.updateAlarm(next);
          await cancelAlarm(next);
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        Alert.alert(
          "Error",
          `Could not update ${failed} alarm${failed > 1 ? "s" : ""}. Please try again.`,
        );
      }
      return;
    }
    let skipped = 0;
    const results = await Promise.allSettled(
      alarms.map(async (a) => {
        if (a.enabled) return;
        const conflict = findConflictingAlarm(alarms, a, a.id);
        if (conflict) {
          skipped += 1;
          return;
        }
        const next = { ...a, enabled: true };
        await store.updateAlarm(next);
        await setAlarm(next);
      }),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      Alert.alert(
        "Error",
        `Could not update ${failed} alarm${failed > 1 ? "s" : ""}. Please try again.`,
      );
    }
    if (skipped > 0) {
      Alert.alert(
        "Alarm already set",
        `${skipped} alarm${skipped > 1 ? "s" : ""} not enabled — same time as an existing alarm.`,
      );
    }
  };

  const enterEdit = () => {
    setOptionsExpanded(false);
    setEditEnabled(true);
  };

  const toggleSelection = (alarm: Alarm) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(alarm.id)) next.delete(alarm.id);
      else next.add(alarm.id);
      return next;
    });
  };

  const handlePressCard = (alarm: Alarm) => {
    if (editEnabled) {
      toggleSelection(alarm);
      return;
    }
    router.push(`/create-alarm/${alarm.id}`);
  };

  const handleLongPressCard = (alarm: Alarm) => {
    if (!editEnabled) setEditEnabled(true);
    toggleSelection(alarm);
  };

  const cancelEdit = () => {
    setEditEnabled(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === alarms.length) return new Set();
      return new Set(alarms.map((a) => a.id));
    });
  };

  const performDelete = async () => {
    const store = useAlarmStore.getState();
    const results = await Promise.allSettled(
      [...selectedIds].map(async (id) => {
        await cancelAlarm({ id });
        await store.deleteAlarm({ id });
      }),
    );
    setSelectedIds(new Set());
    setEditEnabled(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      Alert.alert(
        "Error",
        `Could not delete ${failed} alarm${failed > 1 ? "s" : ""}. Please try again.`,
      );
    }
  };

  const deleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      "Delete alarms?",
      `Delete ${count} alarm${count > 1 ? "s" : ""}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to Brainly Alarm!</Text>
        <Text style={styles.countdown}>{countdown}</Text>
      </View>

      <View style={styles.listContainer}>
        <View
          style={[styles.actionsRow, editEnabled && styles.actionsRowEditing]}
        >
          {editEnabled ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel edit"
                onPress={cancelEdit}
              >
                <Text style={styles.actionRowText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  selectedIds.size === alarms.length && alarms.length > 0
                    ? "Unselect all"
                    : "Select all"
                }
                onPress={selectAll}
              >
                <Text style={styles.actionRowText}>
                  {selectedIds.size === alarms.length && alarms.length > 0
                    ? "Unselect all"
                    : "Select all"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add alarm"
                onPress={() => router.push("/create-alarm")}
              >
                <Lucide name="plus" size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="More options"
                onPress={() => setOptionsExpanded((v) => !v)}
              >
                <Lucide
                  name="ellipsis-vertical"
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            </>
          )}
        </View>
        <FlatList
          data={alarms}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              editEnabled={editEnabled}
              selected={selectedIds.has(item.id)}
              onToggleEnabled={toggleEnabled}
              onPress={handlePressCard}
              onLongPress={handleLongPressCard}
            />
          )}
          ListEmptyComponent={
            editEnabled ? null : (
              <View style={styles.emptyState}>
                <Lucide
                  name="alarm-clock-off"
                  size={48}
                  color={colors.textSubtle}
                />
                <Text style={styles.emptyTitle}>No alarms yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add your first alarm to get started.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.emptyButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add alarm"
                  onPress={() => router.push("/create-alarm")}
                >
                  <Lucide name="plus" size={20} color={colors.primaryFg} />
                  <Text style={styles.emptyButtonText}>Create alarm</Text>
                </Pressable>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      </View>

      {editEnabled ? (
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [
              styles.bottomBarButton,
              selectedIds.size === 0 && styles.bottomBarButtonDisabled,
              pressed && styles.bottomBarButtonPressed,
            ]}
            accessibilityRole="button"
            disabled={selectedIds.size === 0}
            onPress={deleteSelected}
          >
            <Lucide name="trash" size={20} color={colors.danger} />
            <Text style={styles.bottomBarText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      {optionsExpanded ? (
        <>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            onPress={() => setOptionsExpanded(false)}
          />
          <View style={styles.dropdown}>
            <Pressable
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
              onPress={turnAllOnOff}
            >
              <Text style={styles.dropdownItemText}>Turn all on/off</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.dropdownItem,
                pressed && styles.dropdownItemPressed,
              ]}
              accessibilityRole="button"
              onPress={enterEdit}
            >
              <Text style={styles.dropdownItemText}>Edit</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  countdown: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  actionsRowEditing: {
    justifyContent: "space-between",
  },
  actionRowText: {
    ...typography.bodyEmphasis,
    color: colors.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backdrop,
  },
  dropdown: {
    position: "absolute",
    top: 120,
    right: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    minWidth: 180,
    paddingVertical: spacing.xs,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginHorizontal: spacing.xs,
  },
  dropdownItemPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  emptyButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  emptyButtonText: {
    ...typography.bodyEmphasis,
    color: colors.primaryFg,
  },
  separator: {
    height: spacing.sm,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bottomBarButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.md,
  },
  bottomBarButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  bottomBarButtonDisabled: {
    opacity: 0.4,
  },
  bottomBarText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
});
