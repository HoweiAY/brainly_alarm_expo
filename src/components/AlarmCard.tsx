import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { Alarm } from "@/data/types";
import { formatTime, getDaysString } from "@/utils/time";

interface AlarmCardProps {
  alarm: Alarm;
  editEnabled: boolean;
  selected: boolean;
  onToggleEnabled: (alarm: Alarm) => void;
  onPress: (alarm: Alarm) => void;
  onLongPress: (alarm: Alarm) => void;
}

export function AlarmCard({
  alarm,
  editEnabled,
  selected,
  onToggleEnabled,
  onPress,
  onLongPress,
}: AlarmCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(alarm)}
      onLongPress={() => onLongPress(alarm)}
    >
      <View style={styles.left}>
        <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
        <Text style={styles.days}>{getDaysString(alarm.days)}</Text>
      </View>
      {editEnabled ? (
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? <Text style={styles.checkmark}>{"\u2713"}</Text> : null}
        </View>
      ) : (
        <Switch
          value={alarm.enabled}
          onValueChange={() => onToggleEnabled(alarm)}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  cardPressed: {
    backgroundColor: "#f2f2f2",
  },
  left: {
    flexDirection: "column",
    gap: 4,
  },
  time: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  days: {
    fontSize: 12,
    color: "#666666",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: "#208AEF",
  },
  checkmark: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    lineHeight: 18,
  },
});
