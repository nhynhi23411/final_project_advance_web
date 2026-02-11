import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: "Lost & Found NestJS API is running",
    };
  }
}

