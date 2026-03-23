import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

interface JwtSocketPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

interface AuthedSocket extends Socket {
  data: Socket["data"] & { userId?: string };
}

@WebSocketGateway({
  namespace: "chat",
  cors: { origin: true, credentials: true },
  allowEIO3: true,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineSocketsByUser = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  private extractToken(client: Socket): string | null {
    const authToken =
      (client.handshake.auth?.token as string | undefined) || "";
    if (authToken) return authToken.replace(/^Bearer\s+/i, "").trim();

    const headerToken =
      (client.handshake.headers?.authorization as string | undefined) || "";
    if (headerToken) return headerToken.replace(/^Bearer\s+/i, "").trim();

    const queryToken =
      (client.handshake.query?.token as string | undefined) || "";
    if (queryToken) return queryToken.replace(/^Bearer\s+/i, "").trim();

    return null;
  }

  private getUserSockets(userId: string): Set<string> {
    const current = this.onlineSocketsByUser.get(userId);
    if (current) return current;
    const next = new Set<string>();
    this.onlineSocketsByUser.set(userId, next);
    return next;
  }

  private async broadcastUserStatus(userId: string): Promise<void> {
    const profile = await this.chatService.getUserPublicProfile(userId);
    this.server.emit("userStatusChanged", profile);
  }

  async handleConnection(client: AuthedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new WsException("UNAUTHORIZED");

      const payload = await this.jwtService.verifyAsync<JwtSocketPayload>(
        token,
        {
          secret:
            this.configService.get<string>("JWT_SECRET") ||
            "CHANGE_THIS_SECRET_IN_ENV",
        },
      );

      const userId = payload.sub;
      client.data.userId = userId;
      client.join(`user:${userId}`);

      const sockets = this.getUserSockets(userId);
      const wasOffline = sockets.size === 0;
      sockets.add(client.id);

      if (wasOffline) {
        await this.chatService.updateUserPresence(userId, true);
        await this.broadcastUserStatus(userId);
      }

      this.logger.log(`Socket connected user=${userId} socketId=${client.id}`);
    } catch (err) {
      this.logger.warn(`Socket auth failed: ${(err as Error)?.message || err}`);
      client.emit("chatError", { message: "UNAUTHORIZED" });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.onlineSocketsByUser.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineSocketsByUser.delete(userId);
        await this.chatService.updateUserPresence(userId, false);
        await this.broadcastUserStatus(userId);
      }
    }

    this.logger.log(`Socket disconnected user=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage("joinRoom")
  async handleJoinRoom(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const userId = client.data?.userId;
    const conversationId = String(payload?.conversationId || "").trim();

    if (!userId) throw new WsException("UNAUTHORIZED");
    if (!conversationId) throw new WsException("conversationId is required");

    await this.chatService.ensureUserInConversation(conversationId, userId);
    client.join(`conversation:${conversationId}`);

    return { ok: true, conversationId };
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    payload: {
      conversationId?: string;
      receiverId?: string;
      messageType?: "TEXT" | "IMAGE";
      content?: string;
      imageUrl?: string;
    },
  ) {
    const userId = client.data?.userId;
    if (!userId) throw new WsException("UNAUTHORIZED");

    const created = await this.chatService.sendMessage(userId, {
      conversationId: payload?.conversationId,
      receiverId: payload?.receiverId,
      messageType: payload?.messageType === "IMAGE" ? "IMAGE" : "TEXT",
      content: payload?.content,
      imageUrl: payload?.imageUrl,
    });

    // Emit by user rooms only to avoid duplicate delivery when sender socket
    // is subscribed to both conversation room and user room.
    this.server.to(`user:${created.senderId}`).emit("newMessage", created);
    this.server.to(`user:${created.receiverId}`).emit("newMessage", created);

    return { ok: true, data: created };
  }

  @SubscribeMessage("markAsRead")
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const userId = client.data?.userId;
    const conversationId = String(payload?.conversationId || "").trim();
    if (!userId) throw new WsException("UNAUTHORIZED");
    if (!conversationId) throw new WsException("conversationId is required");

    const result = await this.chatService.markConversationAsRead(
      userId,
      conversationId,
    );
    this.server.to(`conversation:${conversationId}`).emit("conversationRead", {
      conversationId,
      userId,
      ...result,
    });

    return { ok: true, conversationId, ...result };
  }
}
