import { AlarmCard } from "@/components/AlarmCard";
import { mockAlarms } from "@/data/mockAlarms";
import type { Alarm } from "@/data/types";
import { computeNextAlarm, formatCountdown } from "@/utils/time";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TICK_MS = 60_000;

export default function Home() {
  const router = useRouter();
  const [alarms, setAlarms] = useState<Alarm[]>(() => mockAlarms);
  const [editEnabled, setEditEnabled] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(
    () => formatCountdown(computeNextAlarm(alarms, now)),
    [alarms, now],
  );

  const toggleEnabled = (alarm: Alarm) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === alarm.id ? { ...a, enabled: !a.enabled } : a)),
    );
  };

  const turnAllOnOff = () => {
    setOptionsExpanded(false);
    setAlarms((prev) => {
      const allOn = prev.length > 0 && prev.every((a) => a.enabled);
      return prev.map((a) => ({ ...a, enabled: !allOn }));
    });
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

  const deleteSelected = () => {
    setAlarms((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectedIds(new Set());
    setEditEnabled(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to Brainly Alarm!</Text>
        <Text style={styles.countdown}>{countdown}</Text>
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
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Add alarm"
                onPress={() => router.push("/create-alarm")}
              >
                <Lucide name="plus" size={16} color="#208AEF" />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="More options"
                onPress={() => setOptionsExpanded((v) => !v)}
              >
                <Lucide name="ellipsis-vertical" size={16} color="#208AEF" />
              </Pressable>
            </>
          )}
        </View>
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
      />

      {editEnabled ? (
        <View style={styles.bottomBar}>
          <Pressable
            style={[
              styles.bottomBarButton,
              selectedIds.size === 0 && styles.bottomBarButtonDisabled,
            ]}
            accessibilityRole="button"
            disabled={selectedIds.size === 0}
            onPress={deleteSelected}
          >
            <Lucide name="trash" size={20} />
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
              style={styles.dropdownItem}
              accessibilityRole="button"
              onPress={turnAllOnOff}
            >
              <Text style={styles.dropdownItemText}>Turn all on/off</Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
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
    backgroundColor: "#f7f8fa",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  countdown: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  actionsRowEditing: {
    justifyContent: "space-between",
  },
  actionRowText: {
    color: "#208AEF",
    fontWeight: "600",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2f7",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    position: "absolute",
    top: 120,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    minWidth: 160,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#1a1a1a",
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  separator: {
    height: 8,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  bottomBarButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  bottomBarButtonDisabled: {
    opacity: 0.4,
  },
  bottomBarText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
