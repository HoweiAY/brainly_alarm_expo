import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    const update = (value: boolean) => {
      if (mounted) setEnabled(value);
    };

    void AccessibilityInfo.isScreenReaderEnabled().then(update);

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      update,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
