import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Notification, NotificationSchema } from "./schemas/notification.schema";
import { Post, PostSchema } from "../posts/schemas/post.schema";
import { User, UserSchema } from "../users/schemas/user.schema";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { ChatModule } from "../chat/chat.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ChatModule,
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
