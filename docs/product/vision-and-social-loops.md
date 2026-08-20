# Product vision and social loops

## Purpose

This document defines product invariants that game implementations must preserve. It describes what the platform is trying to optimize, not the visual design of one screen or the mechanics of one game.

## 1. Core thesis

`slop` is a social game platform, not a catalogue of disconnected mini-games.

Gameplay and social interaction are equal product loops:

```text
Gameplay loop
enter → understand → act → result → reward → continue

Relationship loop
see person/activity → watch/join → interact → create a moment → talk/react/share → play again
```

A mechanically complete game is still incomplete if it produces no useful social surfaces.

A social feature is incomplete if it cannot lead naturally back into an activity.

## 2. No dead ends

Every meaningful user state should expose a useful next action.

Examples:

- win → replay / challenge / share / watch friends / switch activity;
- lose → rematch / personal progress / chat / watch / another activity;
- spectate → react / chat / queue / join next round;
- achievement → show friends / challenge friend / inspect collection;
- friend leaves → continue / bot replacement / invite / switch activity;
- room full → spectate + queue instead of hard rejection;
- activity ended → result/moment + related action instead of an error page.

Result screens and notifications are routers, not endpoints.

## 3. Person-first navigation

When possible, prefer:

```text
person → current activity → join/watch
```

over:

```text
game catalogue → game → matchmaking → strangers
```

The game catalogue still exists, but friends, parties, chat, notifications, guilds, and activity feeds should be first-class game entry points.

## 4. One-handed mobile default

Realtime games should be designed for one-handed play whenever the mechanic permits it.

Default interaction vocabulary:

- virtual joystick for movement;
- automatic/contextual interaction near relevant objects;
- contextual single tap for meaningful choices/actions;
- drag/swipe only when precision itself is the mechanic.

Avoid making ordinary movement require simultaneous movement and camera controls. First/third-person twin-stick interaction is not the default platform pattern.

This constraint does not prohibit games such as chess, pool, or match-3 that naturally use direct touch instead of a joystick.

## 5. Activity presence

A player's current activity is a platform concept.

A presence payload should eventually be able to represent:

```ts
interface ActivityPresence {
  userId: UserId;
  activity?: {
    gameId: GameId;
    sessionId: SessionId;
    state: ActivityState;
    joinPolicy: JoinPolicy;
    playerCount: number;
    maxPlayers?: number;
    progress?: ActivityProgressSummary;
  };
}
```

Relevant surfaces may show concise activity state, for example:

```text
Ben
Pool · Round 3 · leading 2–1
Watch · Ask to join
```

or:

```text
Anna
Fishing · caught 8.1 kg Pike
Join
```

Presence must remain privacy-aware. Visibility is ultimately configurable per user/context.

## 6. Activity Router

Every platform surface should route to a common activity decision instead of reimplementing game-specific join rules.

Conceptually:

```text
activity link/request
        ↓
Activity Router
        ↓
current session state + join policy + permissions
        ↓
join now / spectate / queue / request / show result
```

Examples of entry surfaces:

- home;
- chat card;
- friend profile;
- party;
- guild;
- notification;
- achievement/moment;
- deep link;
- shared world/hub.

A user should not normally be sent through an unnecessary game landing page before reaching the requested activity.

## 7. Join policies

Every game/session type explicitly declares how late joining works.

Initial vocabulary:

### `hot`

A player can become an active participant immediately.

Suitable for continuous social activities such as fishing, farming, exploration, or open co-op.

### `checkpoint`

A player can join at the next safe simulation transition.

Suitable for waves, staged co-op, extraction-style sessions, or races with controlled checkpoints.

### `next-round`

A player cannot alter the current competitive round and becomes a spectator/queued participant until the round ends.

Suitable for pool, chess, cards, or competitive puzzle rounds.

### `spectate-only`

Current session cannot accept more participants, but spectators are allowed.

### `closed`

Session is intentionally not visible/joinable to the requester.

Games must not invent arbitrary equivalent strings outside the typed platform registry.

## 8. Spectators are participants

Spectating is a first-class activity state, not an error fallback.

Depending on game rules, spectators may:

- react;
- chat;
- inspect players/progress;
- queue for the next round;
- predict results;
- use cosmetic reactions/emotes;
- invite another friend;
- follow/share the match.

Spectator actions must never mutate authoritative gameplay state unless a game explicitly defines such a mechanic.

## 9. Game Moments

Games emit semantic moments. They do not directly implement notification delivery, chat cards, achievement UI, or feed ranking.

Example conceptual API:

```ts
emitMoment({
  type: GAME_MOMENTS.FISHING_CATCH,
  actorId: playerId,
  significance: MOMENT_SIGNIFICANCE.HIGH,
  payload: {
    speciesId,
    weightKg,
    personalBest,
  },
  actions: [
    MOMENT_ACTIONS.JOIN,
    MOMENT_ACTIONS.REACT,
    MOMENT_ACTIONS.CHALLENGE,
  ],
});
```

The platform may transform one moment into zero or more surfaces:

- in-game feedback;
- achievement;
- chat card;
- friend feed item;
- in-app toast;
- push notification;
- profile history;
- challenge entry point.

This separation is important: **games create interesting facts; the platform decides how aggressively to surface them.**

### Candidate moments

Generic:

- personal best;
- rare find;
- comeback;
- close result;
- streak;
- first completion;
- surprising failure;
- teammate rescue;
- unusually strong/creative play;
- achievement completion.

The moment schema must be typed and versionable. Do not put presentation copy into the authoritative gameplay event unless the copy is itself game data.

## 10. Social retention loop

A preferred loop is:

```text
play
  ↓
interesting moment
  ↓
platform surfaces it to relevant people
  ↓
friend reacts / messages / joins / challenges
  ↓
shared activity
  ↓
new moments and stronger relationship signal
  ↓
future activity becomes more relevant
```

The strongest content unit should often be **something that happened between players**, not merely the existence of a game.

## 11. Notifications

Notifications are derived from platform events and relevance, not hard-coded inside each game.

Candidate sources:

```text
friend.activity.started
friend.activity.joinable
friend.moment.notable
friend.personal-record
friend.challenge
party.slot-opened
guild.activity
```

Possible actions should usually include a direct next step:

```text
Ben started Pool
Join
```

or:

```text
Yesterday Ben made 15 long pots
Try Pool · Message Ben
```

### Relevance concept

Notification ranking may eventually use signals such as:

```text
relationship strength
+ game affinity
+ event significance
+ current joinability
+ freshness
- notification fatigue
```

Never optimize retention by simply increasing notification volume.

Use per-user/per-friend/per-game throttling and a push budget.

## 12. Loss design

Losing may reduce a competitive rating. It should not usually destroy the player's sense of global progress.

A loss should ideally preserve at least two useful outputs:

- progression;
- feedback;
- personal record/improvement;
- funny/social moment;
- collection progress;
- rematch opportunity;
- another relevant activity.

Bad:

```text
YOU LOST
-25 coins
OK
```

Better:

```text
Ben wins 7–6
New personal longest shot: 14.2 m
Rating: -8

Rematch · Watch Ben · Try another table
```

The platform should distinguish competitive skill from persistent/global progression.

## 13. Rating model

Do not use one Elo number as a universal representation of player skill.

Conceptually:

```text
Global progression / collection / achievements / social profile

Per-game skill ratings:
- Pool
- Chess
- Match-3
- Fishing competitions
- ...
```

A global competitive index may later be derived from normalized per-game skill/confidence, but it is not the source of individual game ratings.

Offline/bot activity may contribute to practice/progression/achievements. It should have little or no effect on competitive rating unless results are verifiable by the authoritative platform.

## 14. Post-session router

At the end of a round/session, rank next actions based on current context.

Possible actions:

- rematch;
- continue current continuous activity;
- join friends in another activity;
- challenge another player;
- open chat;
- inspect/share a moment;
- customize avatar/collection;
- play another game.

The same static buttons are not always optimal.

Example: if three close friends have just started another game, joining them may rank above an immediate replay.

## 15. Monetization principles

Primary monetization should focus on identity, expression, collection, and shared spaces rather than buying competitive power.

Candidate surfaces:

- avatar clothes/accessories;
- character styles;
- reactions/emotes;
- victory animations;
- game-specific cosmetics that do not alter competitive mechanics;
- profile frames/titles;
- pets;
- home/shared-space decorations;
- guild cosmetics;
- seasonal collections.

Prefer cosmetics that are usable across multiple games because they have higher perceived platform value.

Do not immediately exploit a frustrating loss with a power purchase prompt.

A better monetization transition is:

```text
positive event → relevant cosmetic/collection context → preview → optional purchase
```

## 16. Shared world is optional navigation

A future shared world/hub may spatially represent activities:

```text
lake → Fishing
pool hall → Pool
arcade → Match-3
terminal → co-op activity
```

However, the shared world must not become a mandatory loading/navigation tax.

Every game must remain directly reachable from social surfaces and game discovery.

## 17. Configurable visual identity

Games should separate semantic gameplay from visual mood.

Gameplay can refer to concepts such as:

```text
Player
Ground
Interactable
Danger
Reward
Water
Fog
Environment
```

A theme/style layer can map those semantics to lighting, materials, fog, palette, audio, animation feel, and UI treatment.

A dark/horror style must not secretly change mechanics through theme branches. Mechanical changes belong in typed gameplay configuration.

Bad shared code:

```ts
if (theme === "horror") {
  player.speed *= 0.8;
}
```

If a horror game needs a lower speed, its game configuration owns the value.

## 18. Definition of product-complete game integration

A game is not platform-complete because its core mechanic works.

The game design must define, as applicable:

- entry points;
- join policy;
- presence summary;
- leave/reconnect behaviour;
- party behaviour;
- spectator behaviour;
- meaningful moments;
- loss/result routing;
- bot/offline policy;
- rating policy;
- relevant progression/cosmetics;
- one-handed/mobile interaction model.

A new game task should explicitly state which of these are intentionally out of scope for the current milestone.
