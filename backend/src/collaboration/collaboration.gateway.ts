import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'collaboration',
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollaborationGateway.name);

  @WebSocketServer()
  server: Server;

  // Track users in rooms for presence
  private roomUsers: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up room presence
    this.roomUsers.forEach((users, roomId) => {
      if (users.has(client.id)) {
        users.delete(client.id);
        this.server.to(roomId).emit('presence_update', Array.from(users));
      }
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; user: any },
  ) {
    const { roomId, user } = payload;
    client.join(roomId);
    
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }
    this.roomUsers.get(roomId)!.add(client.id);

    this.logger.log(`User ${client.id} joined room ${roomId}`);
    
    // Notify room about new user
    this.server.to(roomId).emit('presence_update', Array.from(this.roomUsers.get(roomId) || []));
    
    return { event: 'joined', data: roomId };
  }

  @SubscribeMessage('sync_update')
  handleSyncUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; update: any },
  ) {
    // Broadcast Yjs update to other clients in the same room
    // The update is a Uint8Array but comes through Socket.io as an ArrayBuffer or similar
    client.to(payload.roomId).emit('sync_update', payload.update);
  }

  @SubscribeMessage('ai_suggestion')
  handleAISuggestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; suggestion: any },
  ) {
    // Shared AI suggestions for everyone in the room
    this.server.to(payload.roomId).emit('ai_suggestion_received', payload.suggestion);
  }

  @SubscribeMessage('cursor_move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; position: any; user: any },
  ) {
    // Real-time cursor presence
    client.to(payload.roomId).emit('cursor_moved', {
      userId: client.id,
      ...payload
    });
  }
}
