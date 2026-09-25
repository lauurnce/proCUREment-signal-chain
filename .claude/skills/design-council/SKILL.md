---
name: design-council
description: Run a Design Council review of a screen, feature, or set of screenshots. Convenes the council personas in parallel, then the creative-director merges their critiques into one ranked action list and up to 3 decisions for Lawrence.
disable-model-invocation: true
argument-hint: "[what to review, for example: office scene, needs-you panel, full app]"
---

# Design Council review: $ARGUMENTS

Follow these steps in order. Do not implement any fixes in this skill. The output is a review and decisions.

## 1. Scope
- Restate in one line what is being reviewed: "$ARGUMENTS".
- List the routes, components and files involved (search the code if needed).

## 2. Fresh evidence
- If the app can run, run `pnpm shots` (or the narrowest shots command for this scope) and list the new screenshot paths in `docs/qa/shots/<date>/`.
- Open and look at every screenshot yourself before convening the council.
- If the app cannot run yet, use the design docs and Lab screenshots that exist, and say so.

## 3. Convene the council in parallel
In one message, start these subagents at the same time. Give each the scope, the screenshot paths, the key files, and ask for their standard output format (max 300 words each):

| Always | When relevant |
|---|---|
| `creative-director` (overall, first impression only at this stage) | `world-artist` (anything 3D) |
| `ux-architect` | `motion-designer` (animation, transitions, camera, feel) |
| `brand-guardian` | `ux-writer` (any visible text) |
| | `procurement-sme` (workflows, tasks, emails, zones, realism) |
| | `qa-playtester` (if something seems broken or slow) |

Use [rubric.md](rubric.md) so scores mean the same thing across reviews.

## 4. Synthesis
Send all the reviews to the `creative-director` subagent and ask for the synthesis format from its definition: verdict, scorecard, Must fix (max 5), Should fix, Could fix, and up to 3 decisions for Lawrence with options and a recommendation. Conflicts are resolved by the principles in its definition.

## 5. Save
Write the full result, including each member's short review, to `docs/design/reviews/<YYYY-MM-DD>-<slug>.md`.

## 6. Present and stop
- Show Lawrence a plain-English summary: the verdict, the scorecard, the Must fix list, and the screenshots that matter.
- Ask the decisions with the AskUserQuestion tool (multiple choice, recommendation first).
- Stop. Wait for his answers before changing anything.
