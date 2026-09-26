import type { AlarmSnapshot } from "@/data/types";
import { useAlarmFiringStore as store } from "@/store/alarmFiringStore";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

let mockPersisted: unknown = null;
const mockPersistActiveAlarm = jest.fn(async (_activation: unknown) => {});

jest.mock("@/data/activeAlarm", () => ({
  persistActiveAlarm: (activation: unknown) =>
    mockPersistActiveAlarm(activation),
  clearPersistedActiveAlarm: async () => {},
  getPersistedActiveAlarm: async () => mockPersisted,
}));

const snapshot: AlarmSnapshot = {
  alarmId: "alarm-1",
  weekday: 0,
  hour: 8,
  minute: 30,
  task: "Random",
  roundCount: 2,
  difficulty: "Normal",
  sound: "Default",
  snooze: true,
  enabled: true,
  isSnoozed: false,
  notificationTitle: "Time to wake up!",
  notificationBody: "Click to disable the alarm.",
};

beforeEach(() => {
  store.setState({ activeSnapshot: null, activatedAt: null, loaded: false });
  mockPersisted = null;
  mockPersistActiveAlarm.mockClear();
});

describe("alarm firing store", () => {
  it("resolves and persists a Random task on activation", async () => {
    const active = store.getState().setActive(snapshot);

    expect(active.task).toBe("Random");
    expect(active.resolvedTask).not.toBe("None");
    expect(store.getState().activeSnapshot).toEqual(active);
    expect(mockPersistActiveAlarm).toHaveBeenCalledWith({
      snapshot: active,
      activatedAt: store.getState().activatedAt,
    });
  });

  it("reuses the draw for a duplicate delivery of the same trigger", async () => {
    const first = store.getState().setActive(snapshot);

    for (let i = 0; i < 20; i++) {
      expect(store.getState().setActive(snapshot).resolvedTask).toBe(
        first.resolvedTask,
      );
    }
  });

  it("draws again after the active alarm is cleared", async () => {
    const random = jest.spyOn(Math, "random");
    random.mockReturnValue(0);
    expect(store.getState().setActive(snapshot).resolvedTask).toBe("Memory");

    store.getState().clearActive();
    random.mockReturnValue(0.99);
    expect(
      store.getState().setActive({ ...snapshot, isSnoozed: true }).resolvedTask,
    ).toBe("Shake phone");
    random.mockRestore();
  });

  it("restores an activation and normalizes its snapshot", async () => {
    const activatedAt = 1_700_000_000_000;
    mockPersisted = {
      snapshot: { ...snapshot, task: "Math" },
      activatedAt,
    };

    await store.getState().init();

    expect(store.getState().activeSnapshot?.resolvedTask).toBe("Math");
    expect(store.getState().activatedAt).toBe(activatedAt);
  });
});
