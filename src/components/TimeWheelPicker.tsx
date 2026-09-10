import { to12Hour, to24Hour } from "@/hooks/useCreateAlarmForm";
import { useAppTranslation } from "@/i18n/useAppTranslation";
import { createThemedStyles, spacing, typography } from "@/theme";
import { useEffect, useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

interface TimeWheelPickerProps {
  hour24: number;
  minute: number;
  onChange: (next: { hour24: number; minute: number }) => void;
  disabled?: boolean;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const PERIODS = ["AM", "PM"] as const;

interface WheelProps {
  data: string[];
  index: number;
  width: number | `${number}%` | undefined;
  onIndexChange: (index: number) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityValueText?: string;
}

function Wheel({
  data,
  index,
  width,
  onIndexChange,
  disabled = false,
  accessibilityLabel,
  accessibilityValueText,
}: WheelProps) {
  const { t } = useAppTranslation();
  const { styles } = useStyles();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: ITEM_HEIGHT * index,
      animated: false,
    });
  }, [index]);

  const handleEnd = (y: number) => {
    if (disabled) return;
    const i = Math.max(
      0,
      Math.min(data.length - 1, Math.round(y / ITEM_HEIGHT)),
    );
    if (i !== index) onIndexChange(i);
  };

  const handleItemPress = (i: number) => {
    if (disabled || i === index) return;
    scrollRef.current?.scrollTo({ y: ITEM_HEIGHT * i, animated: true });
    onIndexChange(i);
  };

  return (
    <View
      style={[styles.wheel, { width: width as ViewStyle["width"] }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValueText ?? data[index] }}
      accessibilityState={{ disabled }}
      accessibilityActions={[
        { name: "increment", label: t("editor.increase") },
        { name: "decrement", label: t("editor.decrease") },
      ]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        if (event.nativeEvent.actionName === "increment") {
          if (index < data.length - 1) onIndexChange(index + 1);
        } else if (event.nativeEvent.actionName === "decrement") {
          if (index > 0) onIndexChange(index - 1);
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wheelContent}
        nestedScrollEnabled
        scrollEnabled={!disabled}
        style={{ height: WHEEL_HEIGHT }}
        onMomentumScrollEnd={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
      >
        {data.map((item, i) => (
          <Pressable
            key={item}
            style={styles.item}
            importantForAccessibility="no"
            accessible={false}
            onPress={() => handleItemPress(i)}
          >
            <Text style={[styles.itemText, i !== index && styles.itemTextDim]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.selectionOverlay} pointerEvents="none" />
    </View>
  );
}

export function TimeWheelPicker({
  hour24,
  minute,
  onChange,
  disabled = false,
}: TimeWheelPickerProps) {
  const { t } = useAppTranslation();
  const { styles } = useStyles();
  const { hour12, period } = to12Hour(hour24);

  const handleHour = (i: number) => {
    onChange({ hour24: to24Hour(i + 1, period), minute });
  };
  const handleMinute = (i: number) => {
    onChange({ hour24, minute: i });
  };
  const handlePeriod = (i: number) => {
    onChange({ hour24: to24Hour(hour12, PERIODS[i]), minute });
  };

  return (
    <View style={styles.row}>
      <Wheel
        data={HOURS_12}
        index={hour12 - 1}
        width={72}
        onIndexChange={handleHour}
        disabled={disabled}
        accessibilityLabel={t("editor.hour")}
      />
      <Text style={styles.colon}>:</Text>
      <Wheel
        data={MINUTES}
        index={minute}
        width={72}
        onIndexChange={handleMinute}
        disabled={disabled}
        accessibilityLabel={t("editor.minute")}
      />
      <Wheel
        data={[...PERIODS]}
        index={period === "AM" ? 0 : 1}
        width={56}
        onIndexChange={handlePeriod}
        disabled={disabled}
        accessibilityLabel={t("editor.period")}
        accessibilityValueText={t(period === "AM" ? "editor.am" : "editor.pm")}
      />
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  wheel: {
    height: WHEEL_HEIGHT,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  wheelContent: {
    paddingVertical: PAD,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    ...typography.numeric,
    color: colors.text,
  },
  itemTextDim: {
    color: colors.textSubtle,
    opacity: 0.5,
  },
  colon: {
    ...typography.numeric,
    color: colors.text,
  },
  selectionOverlay: {
    position: "absolute",
    top: PAD,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
