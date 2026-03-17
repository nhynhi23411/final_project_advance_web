import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MatchesService } from "./matches.service";
import { CreateManualMatchDto } from "./dto/create-manual-match.dto";

@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post("manual-suggestion")
  @UseGuards(JwtAuthGuard)
  createManualSuggestion(
    @Body() dto: CreateManualMatchDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.matchesService.createManualSuggestion(dto, req.user.userId);
  }

  @Get("my-suggestions")
  @UseGuards(JwtAuthGuard)
  getMySuggestions(@Request() req: { user: { userId: string } }) {
    return this.matchesService.findSuggestionsByUser(req.user.userId);
  }
}
