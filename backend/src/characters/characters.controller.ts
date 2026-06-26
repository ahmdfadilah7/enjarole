import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalCurrentUser } from '../common/decorators/optional-current-user.decorator';
import { JwtPayload } from '../common/types';

@ApiTags('Characters')
@Controller('characters')
export class CharactersController {
  constructor(private charactersService: CharactersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current character profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.charactersService.getMe(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current character profile' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateCharacterDto) {
    return this.charactersService.updateMe(user.sub, dto);
  }

  @Get('suggested')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get suggested characters to follow' })
  getSuggested(@OptionalCurrentUser() user: JwtPayload | null, @Query('limit') limit?: string) {
    return this.charactersService.getSuggested(user?.sub, limit ? parseInt(limit) : 3);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search characters by username or display name' })
  search(
    @Query('q') q: string,
    @OptionalCurrentUser() user: JwtPayload | null,
    @Query('limit') limit?: string,
  ) {
    return this.charactersService.search(q, user?.sub, limit ? parseInt(limit) : 8);
  }

  @Get('username-available')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if username is available' })
  checkUsernameAvailable(
    @Query('username') username: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.charactersService.checkUsernameAvailable(username, user.sub);
  }

  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get public character profile' })
  getByUsername(@Param('username') username: string, @OptionalCurrentUser() user: JwtPayload | null) {
    return this.charactersService.getByUsername(username, user?.sub);
  }

  @Get(':username/posts')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get character posts' })
  getPosts(
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @OptionalCurrentUser() user?: JwtPayload | null,
  ) {
    return this.charactersService.getPostsByUsername(
      username,
      cursor,
      limit ? parseInt(limit) : 20,
      user?.sub,
    );
  }

  @Get(':username/followers')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get character followers' })
  getFollowers(@Param('username') username: string, @OptionalCurrentUser() user: JwtPayload | null) {
    return this.charactersService.getFollowers(username, user?.sub);
  }

  @Get(':username/following')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get characters this user follows' })
  getFollowing(@Param('username') username: string, @OptionalCurrentUser() user: JwtPayload | null) {
    return this.charactersService.getFollowing(username, user?.sub);
  }
}
