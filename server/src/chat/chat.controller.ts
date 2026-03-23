import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage, File } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { ChatService } from "./chat.service";
import { N8nChatbotService } from "./n8n-chatbot.service";

const uploadOpts = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
};

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly cloudinary: CloudinaryService,
    private readonly n8nChatbotService: N8nChatbotService,
  ) {}

  @Get("conversations")
  async getConversations(@Request() req: { user: { userId: string } }) {
    const data = await this.chatService.listConversations(req.user.userId);
    return { data };
  }

  @Post("conversations/direct")
  async createOrGetDirectConversation(
    @Request() req: { user: { userId: string } },
    @Body() body: { targetUserId?: string },
  ) {
    const targetUserId = String(body?.targetUserId || "").trim();
    if (!targetUserId) {
      throw new BadRequestException("targetUserId là bắt buộc");
    }
    const conversation = await this.chatService.getOrCreateDirectConversation(
      req.user.userId,
      targetUserId,
    );

    return {
      data: {
        conversationId: String((conversation as any)._id),
      },
    };
  }

  @Get("conversations/:id/messages")
  async getMessages(
    @Request() req: { user: { userId: string } },
    @Param("id") conversationId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
  ) {
    const data = await this.chatService.getMessages(
      req.user.userId,
      conversationId,
      Number(page || 1),
      Number(limit || 20),
    );
    return data;
  }

  @Patch("conversations/:id/read")
  async markConversationRead(
    @Request() req: { user: { userId: string } },
    @Param("id") conversationId: string,
  ) {
    const result = await this.chatService.markConversationAsRead(
      req.user.userId,
      conversationId,
    );
    return {
      message: "Đã đánh dấu đã đọc",
      ...result,
    };
  }

  @Post("upload-image")
  @UseInterceptors(FileInterceptor("file", uploadOpts))
  async uploadImage(
    @UploadedFile() file: File | undefined,
  ): Promise<{ url: string; publicId: string }> {
    if (!file?.buffer) throw new BadRequestException("Chưa chọn ảnh");
    
    try {
      const result = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: "lost-found/chat",
      });
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Cloudinary upload failed:", errorMessage);
      throw new BadRequestException(`Không thể tải ảnh lên: ${errorMessage}`);
    }
  }

  @Post("n8n-chatbot")
  async chatWithN8n(
    @Request() req: { user: { userId: string } },
    @Body() body: { message: string },
  ) {
    if (!body?.message || typeof body.message !== "string") {
      throw new BadRequestException("message là bắt buộc");
    }

    const result = await this.n8nChatbotService.sendMessageToN8n({
      chatInput: body.message.trim(),
      userId: req.user.userId,
    });

    return result;
  }
}
