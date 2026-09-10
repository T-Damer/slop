# Pocket Club authoritative room

Node.js 24. From this folder install dependencies, then `npm start`.
The browser remains a static Pages app; this WebSocket service must run on a separate host.
It is **not deployed by the Pages workflow** and there is no hard-coded production endpoint.

For a local match, open two browser clients with the same `billiardsMatch` value:
`http://localhost:4173/slop/?game=billiards&billiardsServer=http://localhost:2567&billiardsMatch=demo&billiardsName=Alice`
Change the second name to Bob. Use an HTTPS/WSS endpoint when opening the HTTPS Pages client.
`PORT` defaults to 2567. The service owns two player seats, revisions, sequence validation,
fixed-step simulation, placement confirmation and all state broadcasts. Clients cannot advance online physics.
A disconnect resets the match with a monotonic revision; seamless reconnection is not yet implemented.

The room uses project-authored pure rules in `games/billiards/runtime/domain`; do not copy physics here.
`authoritative-room.ts` is independent of SDK internals and tested through a typed room port.
`network.test.mjs` exercises two real SDK clients over a local WebSocket connection.

Before public hosting, configure TLS/reverse proxy, allowed origins and access control for private rooms,
process supervision and operational monitoring. The matchmaking key groups rooms; it is not authentication.
The current service is for an unranked prototype, not purchases, balances or durable ranked matches.
