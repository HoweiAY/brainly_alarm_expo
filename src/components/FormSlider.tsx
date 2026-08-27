import { useScreenReaderEnabled } from "@/hooks/useAccessibility";
import { colors, radii, spacing, typography } from "@/theme";
import { useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

interface FormSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 22;
const HIT_PAD = 24;

export function FormSlider({
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
}: FormSliderProps) {
  const screenReaderEnabled = useScreenReaderEnabled();
  const [trackWidth, setTrackWidth] = useState(0);

  const steps = Math.max(0, Math.round((max - min) / step));
  const usable = Math.max(0, trackWidth - THUMB_SIZE);
  const snappedIndex = steps > 0 ? Math.round((value - min) / step) : 0;
  const thumbLeft = steps > 0 ? (snappedIndex / steps) * usable : 0;
  const fillWidth = thumbLeft + THUMB_SIZE / 2;

  const options = useMemo(
    () => Array.from({ length: steps + 1 }, (_, i) => min + i * step),
    [min, step, steps],
  );

  const panResponder = useMemo(() => {
    const applyFraction = (frac: number) => {
      if (trackWidth <= 0 || steps <= 0) return;
      const clamped = Math.max(0, Math.min(1, frac));
      const snapped = min + Math.round(clamped * steps) * step;
      if (snapped !== value) onChange(snapped);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX - THUMB_SIZE / 2;
        applyFraction(usable > 0 ? x / usable : 0);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX - THUMB_SIZE / 2;
        applyFraction(usable > 0 ? x / usable : 0);
      },
    });
  }, [disabled, min, step, steps, value, onChange, trackWidth, usable]);

  if (screenReaderEnabled !== false) {
    return (
      <View style={[styles.optionsRow, disabled && styles.wrapperDisabled]}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={({ pressed }) => [
              styles.optionPill,
              option === value && styles.optionPillSelected,
              pressed && !disabled && styles.optionPillPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: option === value, disabled }}
            accessibilityLabel={`${option} ${option === 1 ? "round" : "rounds"}`}
            disabled={disabled}
            onPress={() => {
              if (option !== value) onChange(option);
            }}
          >
            <Text
              style={[
                styles.optionLabel,
                option === value && styles.optionLabelSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View
      style={[styles.wrapper, disabled && styles.wrapperDisabled]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          disabled && styles.thumbDisabled,
          { left: thumbLeft },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: HIT_PAD * 2,
    justifyContent: "center",
  },
  wrapperDisabled: {
    opacity: 0.4,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  optionPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionPillPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  optionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  optionLabelSelected: {
    color: colors.primaryFg,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    marginTop: -(THUMB_SIZE / 2),
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.primaryFg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumbDisabled: {
    backgroundColor: colors.textMuted,
  },
});
