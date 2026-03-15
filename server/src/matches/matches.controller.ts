import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MatchesService } from "./matches.service";

@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get("my-suggestions")
  @UseGuards(JwtAuthGuard)
  getMySuggestions(@Request() req: { user: { userId: string } }) {
    return this.matchesService.findSuggestionsByUser(req.user.userId);
  }
}
