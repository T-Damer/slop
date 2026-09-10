import { pathToFileURL } from 'node:url';
import { Room, Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { AuthoritativeBilliardsRoom, billiardsRoomTiming } from '../../games/billiards/runtime/network/authoritative-room.ts';
import { billiardsProtocol } from '../../games/billiards/runtime/network/registry.ts';

const serverSettings = { port: 2567, maximumPort: 65535, maximumMessagesPerSecond: 80 };

class PocketClubRoom extends Room {
  maxClients = billiardsRoomTiming.maximumPlayers;
  maxMessagesPerSecond = serverSettings.maximumMessagesPerSecond;

  onCreate(options) {
    if (options.protocolVersion !== billiardsProtocol.version) throw new Error('Unsupported billiards protocol.');
    this.authority = new AuthoritativeBilliardsRoom(this);
    this.setSimulationInterval(() => this.authority.tick(), billiardsRoomTiming.tickMilliseconds);
  }

  onJoin(client, options) {
    this.authority.join(client, typeof options.playerName === 'string' ? options.playerName : 'Игрок');
  }

  onLeave(client) { this.authority.leave(client); }
}

export function createBilliardsServer() {
  const server = new Server({ transport: new WebSocketTransport(), greet: false });
  server.define(billiardsProtocol.roomName, PocketClubRoom).filterBy(['matchmakingKey']);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? serverSettings.port);
  if (!Number.isSafeInteger(port) || port <= 0 || port > serverSettings.maximumPort) throw new Error('Invalid PORT.');
  const server = createBilliardsServer();
  await server.listen(port);
  console.log(`Pocket Club Colyseus server listening on ${port}`);
}
