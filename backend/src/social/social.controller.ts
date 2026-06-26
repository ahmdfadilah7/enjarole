import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { OptionalCurrentUser } from '../common/decorators/optional-current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types';

@ApiTags('Social')
@Controller()
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get feed (following or explore)' })
  getFeed(
    @OptionalCurrentUser() user: JwtPayload | null,
    @Query('mode') mode?: 'following' | 'explore',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveMode = !user && mode === 'following' ? 'explore' : mode || (user ? 'following' : 'explore');
    return this.socialService.getFeed(
      user?.sub,
      effectiveMode,
      cursor,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('follow/:username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle follow on character' })
  toggleFollow(@CurrentUser() user: JwtPayload, @Param('username') username: string) {
    return this.socialService.toggleFollow(user.sub, username);
  }
}
