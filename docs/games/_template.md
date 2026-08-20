# <Game name>

**Game ID:** `<game-id>`  
**Status:** Draft / Prototype / Active / Deprecated  
**Owners:** TBD  
**Last contract review:** TBD

## 1. Product purpose

What product/platform behaviour does this game validate or provide?

Examples:

- continuous social drop-in play;
- round-based spectators/queue;
- cooperative realtime play;
- asynchronous/offline play.

## 2. Core loop

```text
enter
→ ...
→ result/progress
→ next action
```

Keep this concise enough that an implementation agent can distinguish the essential mechanic from optional content.

## 3. Session model

- Min players: TBD
- Max players: TBD
- Session type: continuous / round / asynchronous / other
- Typical session duration: TBD
- Online requirement: TBD
- Bot policy: TBD
- Offline policy: TBD

## 4. Input model

- Primary control: joystick / direct touch / drag / contextual tap / other
- One-handed target: yes / no / partial
- Automatic interactions: TBD
- Contextual actions: TBD

## 5. Join policy

Use canonical platform values.

- Join policy: `hot` / `checkpoint` / `next-round` / `spectate-only` / `closed`
- Party join behaviour: TBD
- Full-room behaviour: TBD
- Private-session behaviour: TBD

## 6. Spectator policy

- Can spectate: yes / no
- Can react: TBD
- Can chat: TBD
- Can queue: TBD
- Can inspect progress: TBD
- Can affect gameplay: normally no; document any explicit mechanic

## 7. Leave and reconnect

Define:

- voluntary leave;
- disconnect grace period;
- bot substitution, if any;
- forfeits/penalties;
- reconnect state restoration;
- what spectators/friends see.

## 8. End / win / loss

Define authoritative end conditions.

Describe how loss avoids becoming a product dead end.

Post-session candidate actions:

- rematch;
- continue;
- join friend;
- challenge;
- chat;
- another game;
- collection/customization.

## 9. Progression and rating

- Competitive rating: TBD
- Global progression contribution: TBD
- Offline/bot contribution: TBD
- Achievements: TBD
- Collection/progression rewards: TBD

## 10. Social moments

List semantic moments the game may emit.

| Moment | Significance conditions | Candidate actions |
| --- | --- | --- |
| TBD | TBD | join / react / challenge / message / share |

Moments contain game facts, not delivery-channel decisions.

## 11. Presence summary

Define the minimal useful progress/state that chat/profile/friends surfaces may show without opening the game.

Example:

```text
Fishing · 3 players · personal best 8.1 kg
```

Do not expose private/authoritative internal state unnecessarily.

## 12. Reusable capabilities

List existing platform/runtime capabilities the implementation must reuse.

```text
Movement
AutoInteract
Carry
Round
Score
...
```

Do not duplicate their implementation inside this game.

## 13. Game-specific ECS

### Components

List only components whose semantics are genuinely specific to this game.

### Systems

List only genuinely game-specific behaviour.

For each system, identify:

- reads;
- writes;
- commands/events;
- simulation phase;
- network authority.

## 14. Commands / events / moments

List new contracts introduced by this game.

All identifiers must be typed/canonical. Do not define raw string conventions only in prose.

## 15. Networking and authority

- Server-authoritative state: TBD
- Client-predicted state: TBD
- Presentation-only state: TBD
- Reconciliation requirements: TBD
- Serialization/versioning concerns: TBD

## 16. Randomness and time

- RNG requirements/seed ownership: TBD
- Simulation timers: TBD
- Wall-clock dependencies, if legitimate: TBD

Gameplay must follow deterministic runtime boundaries where practical.

## 17. Visual style

Define semantic visual needs, not one hard-coded palette.

- camera model: TBD
- required semantic asset categories: TBD
- lighting/fog constraints: TBD
- theme-independent mechanics: TBD
- readability/mobile constraints: TBD

If a visual theme changes mechanics, the mechanic belongs in game configuration rather than hidden theme logic.

## 18. Assets and audio

List required categories and constraints:

- characters;
- environment;
- props;
- animation;
- VFX;
- SFX;
- music/ambience;
- LOD/performance budgets.

## 19. Monetization/cosmetics

List appropriate identity/expression surfaces.

Avoid pay-to-win rules unless an explicit product decision changes the platform principle.

## 20. Prototype scope

### Required now

- TBD

### Intentionally deferred

- TBD

This section prevents implementation agents from interpreting prototype omissions as final product rules.

## 21. Acceptance tests

Write observable milestone behaviour.

```text
GIVEN ...
WHEN ...
THEN ...
```

Include important edge cases such as join/leave/reconnect/spectator behaviour when applicable.

## 22. Open decisions

List unresolved product/architecture decisions explicitly.

- TBD

Agents must not silently resolve an open decision with a long-lived architecture choice unless the task grants that authority.
