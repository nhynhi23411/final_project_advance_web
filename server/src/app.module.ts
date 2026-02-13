import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { ItemsModule } from "./items/items.module";
import { MeController } from "./me/me.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>("MONGO_URI") ||
          "mongodb://127.0.0.1:27017/lost_found_db",
      }),
    }),
    CloudinaryModule,
    UsersModule,
    AuthModule,
    ItemsModule,
  ],
  controllers: [AppController, MeController],
  providers: [],
})
export class AppModule {}

