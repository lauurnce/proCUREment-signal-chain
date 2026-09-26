# Motion designer point of view

Role: motion and game feel. One idea runs through all of it: fast for the UI, gentle for the world. Every movement explains a cause and its effect.

## 1. Borrow from the references (patterns, not pixels)

- **ref-01 and ref-03**: the "Walk around" pill as one clear way into a new mode. We turn it into a smooth camera glide from the overview down to the Sr. Manager avatar (800 ms, move easing). ref-03 also shows that a rotated view reads well, so we keep 90 degree rotation snaps.
- **ref-05**: small, chunky characters. At this size, small details disappear. So poses must read as shapes: a lean back to read, a hand raised to ask.
- **ref-06 and ref-07**: a card that opens in place. We expand it with a spring (panel spring) and fade the content in 60 ms later, so the text never jumps.
- **ref-09**: decision buttons on each card. After a decision, the card should leave with a clear exit, so you can see what changed.
- **ref-04**: big numbers. When a count changes, the number rolls to its new value (140 ms). It never blinks.
- **ref-11 and ref-12**: window light and separate rooms. Light can warm slowly across the simulated day. Walks between rooms give the world a purpose.

## 2. Avoid

- Name tags that overlap and shake, as in ref-01 and ref-03. Tags fade by zoom level and follow heads with light smoothing.
- 26 helpers breathing in sync. Each seat gets its own timing from its seed.
- The camera moving by itself when a new item arrives. Only the user moves the camera.
- Flashing, red alerts, confetti, and bounces that repeat.
- Linear walks and instant turns. Helpers turn first, then walk.
- Any motion that measures effort: keystroke counters, speed meters, timers above heads.

## 3. Three ideas: premium, cozy, and true to the work

1. **The folder crosses the bridge.** The CM helper carries a small folder (the PR-PO list) to the Endorsement Bridge and sets it in a tray. An Ops helper walks over and picks it up. When you approve an endorsement, the folder slides across the bridge (600 ms, move easing, a small settle at the end). This is the real handoff from CM to Ops, shown as one object you can follow.
2. **Every decision has a follow-through.** Approve: the card slides out, the Needs You count rolls down, and in the world the helper lowers the raised hand, nods, and walks to the next zone. For an email, the envelope leaves through the Mail Dock. Hold: the item goes onto a shelf tray. Send back: the paper returns to the helper's desk. Instruct: the helper turns toward the Sr. Manager's Office. A thin undo bar shrinks for 5 seconds.
3. **Loops that match each role.** CM work is mostly reading and comparing, so CM helpers lean back and scroll during review steps, and type in short bursts. Ops helpers look between two screens during the counter-check (line by line against SAP). SAP Station visits come in batches. The Merienda Corner gets a short break in the mid-afternoon. Light turns warm near 5 PM. The office feels like a real day, not a treadmill.

## 4. Risks and non-negotiables

- **One attention cue at a time.** "Waiting on you" bounces once (pop spring), then pulses softly every 2.4 s. If more than three are waiting, the pulses stop, badges stay still, and the HUD count carries the message.
- **Helpers, never people.** No motion suggests a person is slow, idle, or watched. A break is charming, not a warning. Off duty helpers leave calmly.
- **60 fps.** In 3D, animate in `useFrame` with refs and `delta`. In the DOM, animate only transform and opacity. No layout shift. Limit how many helpers walk at once (proposed: 6).
- **Buttons answer in under 100 ms.** A press scales to 0.97 in 80 ms.
- **Camera comfort.** Only the user moves the camera. Moves take 700 to 900 ms with easing. Rotation is in 90 degree snaps only. No zoom jumps.
- **Reduced motion.** Helpers fade out and fade in at their new spot (220 ms). No bob, no breathing. The camera cuts behind a short fade. Status stays clear through shape and text.
