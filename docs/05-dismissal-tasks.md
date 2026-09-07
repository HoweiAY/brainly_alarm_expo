# Dismissal Tasks Specification

This document specifies the three alarm-dismissal tasks and the "None" no-task option. Each task is a self-contained Jetpack Compose screen under `components/tasks/` in the upstream repository at **https://github.com/HoweiAY/brainly-alarm** (the original Kotlin source is not vendored in this repo). All tasks share the same completion contract:

```kotlin
fun handleTaskCompleted() {
  stopAlarmSound()
  alarmViewModel.onAlarmDismissed(context)   // returns to Home
}
```

Each task receives:

- `difficulty: String` — one of `taskDifficulties` (`"Easy"`, `"Normal"`, `"Hard"`).
- `rounds: Int` — 1..5.
- `context: Context` — application context (used to construct `AlarmViewModel`).
- `stopAlarmSound: () -> Unit` — closure from `MainActivity` that stops the looping ringtone.

Only `MemoryGame` and `MathEquation` use `difficulty` and `rounds`. `PhoneShaking` ignores both.

---

## 1. Memory Game — `components/tasks/MemoryGame.kt`

A Simon-style sequence-memory game.

### 1.1 Setup by Difficulty

| Difficulty | Grid size        | Tiles in sequence per round |
| ---------- | ---------------- | --------------------------- |
| `Easy`     | 3 × 3 (9 tiles)  | 4                           |
| `Normal`   | 3 × 3 (9 tiles)  | 5                           |
| `Hard`     | 4 × 4 (16 tiles) | 6                           |
| (other)    | 0 (degenerate)   | 0                           |

### 1.2 State Machine

Per-tile `TileState` enum:

| State       | Tile color | Meaning                                                           |
| ----------- | ---------- | ----------------------------------------------------------------- |
| `DEFAULT`   | Gray       | Idle / not yet interacted.                                        |
| `SHOWING`   | Yellow     | The game is currently flashing this tile as part of the sequence. |
| `CORRECT`   | Green      | The user tapped this tile correctly.                              |
| `INCORRECT` | Red        | The user tapped the wrong tile.                                   |

Top-level state:

- `gameStarted: Boolean` — whether a round is in progress (controls whether the "Start" button or the round indicator is shown).
- `flippingOrder: List<Int>` — the randomly shuffled, `requiredTileClicks`-long subset of tile indices the user must reproduce.
- `currentPlayerIndex: Int` — how far through `flippingOrder` the user is.
- `currentRound: Int` — 1-based current round.
- `playerTurn: Boolean` — `false` while the game is flashing the sequence, `true` while the user is responding.
- `titleText: String` — instruction / feedback text above the grid.
- `gridItems: MutableList<TileState>` — one `TileState` per tile, length = `gridSize²`.

### 1.3 Round Flow (`start()`)

```
gameStarted   = true
playerTurn    = false
titleText     = "Remember the order!"
flippingOrder = (0 until gridSize²).shuffled().take(requiredTileClicks)
delay 500ms
for index in flippingOrder:
    delay 500ms
    gridItems[index] = SHOWING
    delay 500ms
    gridItems[index] = DEFAULT
playerTurn = true
titleText  = "Click the tiles in order!"
```

### 1.4 User Input

A tile is `clickable` only when `playerTurn == true && tileState == DEFAULT`. On click, a `MainScope` coroutine checks `flippingOrder[currentPlayerIndex] == index`:

- **Correct** (`handleCorrectTileClick`):
  - `gridItems[index] = CORRECT`
  - `currentPlayerIndex++`
  - If `currentPlayerIndex >= flippingOrder.size`:
    - `titleText = "Correct"`; delay 1000ms.
    - If `currentRound == rounds` → `handleTaskCompleted()` (alarm dismissed).
    - Else `currentRound++` and `start()` (next round).
- **Incorrect** (`handleWrongTileClick`):
  - `gridItems[index] = INCORRECT`
  - `playerTurn = false`
  - `titleText = "Incorrect"`; delay 1000ms.
  - `start()` — **restarts the current round** (does not advance the round counter). The sequence is re-shuffled.

### 1.5 UI Layout

- Centered `Column`:
  - Round indicator: `"Round: $currentRound/$rounds"` (only when `gameStarted`).
  - `titleText`.
  - `gridSize` rows × `gridSize` columns of `Surface` tiles, 64.dp square, 2.dp padding, 10% rounded corners, 1.dp black border.
  - A "Start" `Button` shown only when `!gameStarted`.
- **RN-port addition:** when the accessibility setting `showTileNumbers` (Settings → Accessibility → "Show tile numbers") is enabled, each tile renders its 1-based index as centered text. The number is hidden from screen readers because the tile's `accessibilityLabel` already announces `Tile N`.

### 1.6 Edge Cases / Notes

- `requiredTileClicks` can exceed grid size only at impossible difficulty configs; current defaults keep it within bounds (max 6 ≤ 9/16).
- On a wrong tap, the **whole round** restarts with a fresh sequence — there is no "retry same sequence" mode.
- Coroutines are launched via `CoroutineScope(MainScope().coroutineContext).launch { ... }` per click — acceptable for the small game loop but should be replaced with a single owned scope in the RN port.

---

## 2. Math Equation — `components/tasks/MathEquation.kt`

A mental-arithmetic task. Each round presents an arithmetic expression; the user types the integer answer.

### 2.1 Equation Generation — `generateEquation(difficulty)`

| Difficulty | Operand count | Operand range    | Operators     |
| ---------- | ------------- | ---------------- | ------------- |
| `Easy`     | 2             | `1..30` (random) | `+`, `-`      |
| `Normal`   | 3             | `1..50` (random) | `+`, `-`      |
| `Hard`     | 3             | `1..20` (random) | `+`, `-`, `*` |
| (other)    | 3             | `1..20`          | `+`, `-`      |

Operators are chosen randomly per gap between operands. The resulting string is built as e.g. `"12 + 7 - 3"` (space-padded). Multiplication appears only on Hard.

### 2.2 Evaluation — `evaluateExpression(expression): Int`

Uses the third-party library **exp4j** (`net.objecthunter:exp4j:0.4.8`):

```kotlin
ExpressionBuilder(expression).build().evaluate().toInt()
```

On any exception → returns `0`. Integer division is implicit in the cast.

> **RN port note:** Replace exp4j with JS libraries such as **Math.js** or **JavaScript Expression Evaluator (expr-eval)** (after sanitizing to `[\d+\-*\s]` only) or a hand-written tokenizer. Do **not** `eval` unsanitized input. Since generation is fully controlled, a sanitized `Function("return " + expr)` is acceptable; the original relies on the same trust boundary.

### 2.3 State

- `equation: String` — the current expression.
- `input: String` — the user's typed answer (numeric keyboard only).
- `isCorrect: Boolean?` — `null` = awaiting submit; `true`/`false` = last submission result. A `LaunchedEffect(isCorrect)` clears it back to `null` after 1000ms.
- `currentRound: Int` — 1-based.

### 2.4 Submit Logic

```
if (isCorrect == null):
  expected = evaluateExpression(equation)
  if (input.isNotEmpty() && input.toIntOrNull() == expected):
      isCorrect = true
      if (currentRound == rounds): handleTaskCompleted()
      else: currentRound++; equation = generateEquation(difficulty)
  else:
      isCorrect = false
  input = ""
```

On `isCorrect != null`, the Submit button is replaced by a `ResultIcon` (`Check` green / `Close` red) with an alpha fade-in animation. After 1 second, `isCorrect` resets to `null` and the button returns to "Submit".

### 2.5 UI Layout

- Centered `Column`:
  - Round indicator: `"$currentRound/$rounds"` (gray).
  - Instruction: "What is the result of the expression?".
  - Expression (32sp bold).
  - `TextField` (numeric keyboard, single line, width 80% of screen) with "Answer" label.
  - Submit/Result `Button` (width 40% of screen, purple `#6200EE`, 8dp rounded).

### 2.6 Edge Cases / Notes

- A wrong answer does **not** advance the round; the user keeps retrying the same equation until correct.
- The 1-second feedback delay means rapid double-submits are blocked (the button is a result icon during that window).
- Negative results are possible (e.g. `"3 - 9"`); `toInt()` handles them.

---

## 3. Phone Shaking — `components/tasks/PhoneShaking.kt`

A physical activity task using the device accelerometer.

### 3.1 State

- `remainingShakeTime: Int` — initialized to a random integer in `15..30` inclusive. Counts **down** to 0.

### 3.2 Sensor Setup

- Obtains `SensorManager` and the default `Sensor.TYPE_ACCELEROMETER`.
- Constants:
  - `threshold = 11f` — minimum acceleration magnitude (m/s², including gravity) that counts as a shake.
  - `shakeTimeout = 150` ms — minimum interval between two detected shakes (debounce).
- Registers the listener in a `DisposableEffect(Unit)` with `SENSOR_DELAY_NORMAL`, and unregisters in `onDispose`.

### 3.3 Shake Detection

`onSensorChanged` computes the resultant acceleration:

```
acceleration = sqrt(x² + y² + z²)
if (acceleration > threshold):
    now = System.currentTimeMillis()
    if (now - lastShakeTime > shakeTimeout):
        lastShakeTime = now
        if (remainingShakeTime == 0): handleTaskCompleted()
        else: remainingShakeTime--
```

> **Off-by-one note:** Because the decrement happens after the `== 0` check, the task completes when the counter is **already 0** at the time of an additional shake. In practice, the counter reaches 0 on the Nth shake (where N = initial value) and the (N+1)th shake triggers completion. The displayed text shows "0 shakes to go!" momentarily. The RN port should fix this to decrement-then-check, or document the same behavior deliberately.

### 3.4 UI Layout

- Centered `Column`:
  - Title: "Shake your phone to stop the alarm!" (20sp bold, blue `#03A9F4`).
  - Counter: `"$remainingShakeTime shake(s) to go!"` (18sp gray).
  - `Image` of a shake icon (`R.drawable.shake`, 200.dp).

### 3.5 RN/Expo Mapping

- Use `expo-sensors` `Accelerometer`:
  ```ts
  const subscription = Accelerometer.addListener(({ x, y, z }) => {
    const mag = Math.sqrt(x*x + y*y + z*z);
    if (mag > THRESHOLD && Date.now() - lastShake > SHAKE_TIMEOUT) { ... }
  });
  Accelerometer.setUpdateInterval(100); // ~SENSOR_DELAY_NORMAL
  ```
  - `expo-sensors` returns normalized values; calibrate the threshold accordingly (the Android `SensorManager` values include gravity ≈ 9.81 m/s², so 11f ≈ "1.2 g"). On RN you may need to add gravity back or pick a different threshold.
  - Subscribe on mount, unsubscribe on unmount — same `DisposableEffect` discipline.

---

## 4. "None" Task

When `alarm.task == "None"` (the 4th entry of `taskTypes`):

- The `AlarmDisplay` "Begin task" button is relabeled to **"Turn off"**.
- Tapping it runs:
  ```
  resetAlarm(...)        // cancel + weekly re-arm
  updateAlarm(alarm)
  stopAlarmSound()
  alarmViewModel.onAlarmDismissed(context)   // back to Home
  ```
- No navigation to a task route occurs.
- In `CreateAlarmMenu`, when the selected task is `Shake phone` or `None`, both the Rounds slider and the Difficulty radio buttons are **disabled** (greyed out, non-interactive).

---

## 5. Cross-Task Conventions for the RN Port

1. **Shared completion handler** — implement a single `useAlarmDismissal()` hook that wraps `stopAlarmSound()` + the native alarm-completion callback (the RN equivalent of `onAlarmDismissed`). All tasks call it.
2. **Round/difficulty parsing** — pass `rounds` and `difficulty` via route params and validate against the same constant enums (`taskDifficulties`, `taskTypes`).
3. **Difficulty-aware configuration** — keep the difficulty→grid-size / operand-count tables identical so difficulty semantics are preserved across platforms.
4. **exp4j replacement** — use a controlled-expression evaluator; the generator only ever emits `[0-9]`, `+`, `-`, `*`, and spaces, so a strict regex validation + `Function("return " + expr)` is safe.
5. **Shake sensor threshold calibration** — verify the threshold against `expo-sensors` accelerometer output on real devices, since units/normalization differ from the Android `SensorManager`.
6. **Accessibility** — none of the current tasks have accessibility labels (no `contentDescription` on task tiles, no screen-reader hints). The RN port should add `accessibilityLabel` / `accessibilityRole` to tiles, the answer input, and the shake counter.

---

## 6. Task Auto-Dismiss Timeout

The RN port applies an auto-dismiss timeout to Memory, Math, and Phone Shaking. The `None` option is excluded because it dismisses directly from `AlarmDisplay` and never opens a task route.

- Timing starts when the task screen opens after the user selects **Begin**. For Memory, time spent before pressing the screen's internal **Start** button counts toward the timeout.
- The timeout UI remains hidden for the first 240 seconds.
- After 240 seconds, the task header displays `Auto dismiss in N seconds` at the top right and counts down from 60 seconds.
- A **Skip** button is shown beside the countdown. Skip is repeatable: each press hides the countdown for 60 seconds, then starts a fresh 60-second countdown.
- Reaching 0 uses the same shared completion handler as successful task completion, stopping the alarm sound, dismissing the native firing state, clearing active alarm state, and returning to Home.
- The mechanism is enabled by default. The enabled flag is a global user preference (`autoDismissEnabled` in `UserSettings`, toggled from the Settings screen under **Alarm → Auto dismiss tasks**). `TaskHeader` reads it from `useSettingsStore` and passes it to `useTaskAutoDismiss`; an explicit `autoDismissEnabled` prop on `TaskHeader` still overrides the global value for per-screen use. Timing configuration remains injectable but is not yet user-facing.
- Countdown state is derived from absolute `dayjs` deadlines rather than decrement-only timers. If JavaScript is suspended while the app is backgrounded, an overdue task dismisses as soon as the app becomes active again; exact dismissal while suspended is not guaranteed.
