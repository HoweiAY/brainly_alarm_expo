import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

let liveRegion: HTMLDivElement | null = null;

function getLiveRegion(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("role", "status");
    liveRegion.style.position = "absolute";
    liveRegion.style.width = "1px";
    liveRegion.style.height = "1px";
    liveRegion.style.margin = "-1px";
    liveRegion.style.clip = "rect(0,0,0,0)";
    liveRegion.style.overflow = "hidden";
    liveRegion.style.whiteSpace = "nowrap";
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

export function announce(message: string): void {
  if (Platform.OS === "web") {
    const region = getLiveRegion();
    if (region) {
      region.textContent = "";
      region.textContent = message;
      return;
    }
  }
  AccessibilityInfo.announceForAccessibility(message);
}

export function useScreenReaderEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

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
