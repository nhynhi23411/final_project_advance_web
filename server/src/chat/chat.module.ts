import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { CloudinaryModule } from "../cloudinary/cloudinary.module";
import { User, UserSchema } from "../users/schemas/user.schema";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import {
  Conversation,
  ConversationSchema,
} from "./schemas/conversation.schema";
import { Message, MessageSchema } from "./schemas/message.schema";

@Module({
  imports: [
    JwtModule,
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
