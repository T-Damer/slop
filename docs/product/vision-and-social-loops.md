# Product vision and social/retention loops

## Hard rules

1. Gameplay and social interaction are equal product loops; games are social places, not isolated apps.
2. There should be no dead end after a match, loss, achievement, spectator session, or friend activity.
3. Joining a person/activity should usually be easier than starting from a game catalogue.
4. Every game defines join/spectator/reconnect behaviour; spectators are participants with reactions/chat/queue, not passive video viewers.
5. Games emit semantic moments/events; platform layers decide whether they become achievements, chat cards, feed items, notifications, analytics, or monetization context.
6. Losing may reduce competitive rating but should rarely erase broad account progression or create a close-app moment.
7. Notifications are relevance-ranked and throttled; friends are not spam generators.
8. Monetization primarily sells identity/expression/collection/shared-space value, not frustration relief or competitive power.
9. Mobile realtime games default to one-handed input: joystick + automatic/contextual interaction + occasional tap/choice.
10. Visual themes are parameterized presentation/style; they do not secretly alter gameplay rules.

## 1. Product shape

`slop` is a social game platform containing multiple games and an optional shared/meta world.

Users may enter through:

```text
home
chat
friend profile
party
guild
notification
achievement/social moment
deep link
meta world
```

The meta world is another navigation/activity surface, not a mandatory corridor before playing a game.

## 2. Two equal loops

### Gameplay loop

```text
enter
→ understand
→ act
→ result
→ reward/progress
→ next action
```

### Relationship loop

```text
see friend/activity
→ watch/join/react/message
→ play together
→ interesting moment happens
→ moment becomes visible
→ conversation/challenge/join
→ stronger future social relevance
```

A mechanically good game that produces no useful social interaction is incomplete for this platform.

## 3. Macro retention router

After meaningful activity, the platform should rank a small set of natural next actions:

```text
replay/rematch
join a friend
invite someone
watch another activity
continue conversation
switch game
customize/collect
```

The result screen is a router, not a tombstone.

A modal whose only meaningful action is `OK` is usually a product smell.

## 4. Social moments

Games emit semantic moments rather than implementing notification/feed/chat logic directly.

Example concept:

```ts
emitMoment({
  type: fishingMoments.catch,
  significance: momentSignificance.high,
  actorId,
  data: {
    speciesId,
    weightKg,
    personalBest: true,
  },
  actions: [momentActions.join, momentActions.react, momentActions.challenge],
});
```

The platform may turn this into:

- nothing;
- local toast;
- achievement;
- chat card;
- friend feed item;
- in-app notification;
- push notification;
- challenge/deep link.

Possible high-value moments:

```text
personal record
rare item/catch
comeback
win streak
close result
friend record beaten
team rescue
funny cooperative failure
first completion
rare extraction/boss result
```

The strongest content unit should often be **something that happened between/around players**, not merely “a game exists”.

## 5. Presence

Presence is a first-class platform object.

It should be able to summarize:

```text
game/activity
room/session
playing / waiting / spectating / idle
progress summary
joinability
player count/capacity
```

Example UI:

```text
Ben
Pool · 2–1
Watch · Ask to join
```

or:

```text
Anna
Fishing · caught 8.1 kg Pike
Join
```

Presence is privacy-aware and can be restricted by user policy.

## 6. Activity routing

A deep link/activity card should target the activity/person directly, for example conceptually:

```text
activity → room/player
```

The router decides:

```text
hot join
request to join
spectate
spectate + queue
join next round
show finished result / start new session
```

Do not make every surface understand each game's session rules.

## 7. Join policies

Each game spec chooses one or more clear policies.

### Hot join

Player can enter immediately.

Useful for:

```text
fishing
farming/open exploration
social spaces
many continuous co-op modes
```

### Checkpoint join

Player joins at a safe transition.

Useful for:

```text
waves
co-op stages
dungeon rooms
some races
```

### Next-round join

Current competitive round cannot be disturbed.

Useful for:

```text
pool
chess
cards
competitive match-3
```

Until then the user can spectate/queue.

## 8. Spectators

Spectators should be socially active.

Possible actions:

```text
react
chat
inspect players/results
queue for next round
challenge winner
invite another friend
follow/predict outcome
```

A game with locked mid-round joining should explicitly design spectator/queue experience rather than leaving the friend at an error screen.

## 9. Designing loss

Loss can create tension and competitive rating movement.

It should usually still provide at least two of:

```text
progress
useful feedback
personal record/improvement
collection/achievement progress
funny/social moment
rematch
watch/challenge
alternative activity
```

Separate broad account progression from individual competitive skill.

Conceptual profile:

```text
Global Level / Collection / Achievements / Social

Game skill ratings
├ Pool
├ Chess
├ Match-3
├ Fishing competition
└ ...
```

Competitive ratings may fall. General account value should not feel erased by one loss.

Offline/bot play may support practice/progression/achievements but has little or no competitive rating impact unless results can be server-verified.

## 10. Notifications and feed relevance

Candidate sources:

```text
friend activity started/joinable
friend notable moment/personal record
challenge
party slot opened
guild activity
followed game event
```

Relevance conceptually depends on:

```text
relationship strength
+ game affinity
+ event significance
+ current joinability
+ freshness
- notification fatigue
```

Use per-person/per-game throttling and push budgets.

Good:

> Ben started Pool · Join

> Yesterday Ben made 15 long pots · Try it · Message Ben

Bad:

> Fishing misses you!!!

Every notification should have an internally explainable reason.

## 11. Chat integration

Chat can show lightweight live activity/progress cards and allow:

```text
watch
join
request to join
react
message/challenge
```

Gameplay moments can become chat content, but games do not directly own chat formatting/delivery.

A social action should preserve context: “tell Ben you beat his record” is better than dumping the user into an empty composer with no reference.

## 12. In-app live activity

While the user is already in the app, lightweight activity surfaces can announce relevant events such as:

```text
Anna joined your fishing area
Ben started a game you often play
party needs one more player
friend achieved a notable record
```

Do not interrupt active gameplay for low-significance activity.

## 13. Monetization

Prefer cross-game durable expression:

```text
avatar clothes/styles
emotes/reactions
victory animations
profile frames/titles
pets
home/shared-space decoration
guild cosmetics
game equipment skins (rod/cue/etc.)
seasonal collections
```

A purchase ideally retains meaning across multiple games.

Good monetization moment:

```text
positive achievement
→ relevant cosmetic/collection preview
→ optional purchase
```

Avoid:

```text
frustrating loss
→ immediate power/frustration purchase prompt
```

## 14. One-handed control principle

Realtime mobile games should default to:

```text
move → joystick
auto/context interact → proximity/intent
important action → contextual tap
choice → tap
```

Avoid requiring simultaneous movement + free camera + attack/action button clusters unless a game explicitly proves the need.

This supports simple hyper/hybrid-casual mechanics and social attention while playing.

## 15. Visual/theme parameterization

Gameplay uses semantic concepts; style profiles decide presentation.

Examples:

```text
Ground
Danger
Reward
Player
Interactable
Water
Fog
Environment
```

A profile can control:

```text
lighting/fog/contrast
palette/material treatment
geometry detail/exaggeration
animation feel
camera presentation
UI theme
audio/ambience
```

Same mechanics may render as cozy, horror, space mining, etc.

Forbidden:

```ts
if (theme === "horror") {
  player.speed *= 0.8;
}
```

If slower movement is a mechanic, it belongs to gameplay configuration, not visual theme.

## 16. Game integration contract

Every game spec must define, as applicable:

```text
core loop
session/player count
one-handed input mapping
join policy
spectator behaviour
reconnect/leave
win/loss/end
rating/progression
moments
presence summary
server authority/bots/offline policy
reused platform/ECS capabilities
visual theme semantics
```

A game is not fully integrated merely because its core mechanic runs.

## 17. Product review question

For every feature ask:

> Does this give the player something interesting to do, or something interesting to do with another person?

The strongest features often do both.
