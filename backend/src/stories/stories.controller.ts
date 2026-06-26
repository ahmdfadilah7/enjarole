import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsInt, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/types';
import { hasTextContent } from '../common/utils/text';

class CreateStoryDto {
  @ApiProperty({ enum: ['image', 'video', 'text'] })
  @IsIn(['image', 'video', 'text'])
  mediaType!: 'image' | 'video' | 'text';

  @ApiPropertyOptional()
  @ValidateIf((o) => o.mediaType === 'image' || o.mediaType === 'video')
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.mediaType === 'text' || o.textContent)
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.mediaType === 'text')
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Video duration in seconds (max 30)' })
  @ValidateIf((o) => o.mediaType === 'video')
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  duration?: number;
}

@ApiTags('Stories')
@Controller('stories')
export class StoriesController {
  constructor(private storiesService: StoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a story (image, video up to 30s, or text)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStoryDto) {
    if (dto.mediaType === 'text') {
      if (!hasTextContent(dto.textContent)) {
        throw new BadRequestException('Text content is required for text stories');
      }
      if (!dto.backgroundColor) {
        throw new BadRequestException('Background color is required for text stories');
      }
    } else if (!dto.mediaUrl) {
      throw new BadRequestException('Media URL is required for image and video stories');
    }

    if (dto.mediaType === 'video' && dto.duration && dto.duration > 30) {
      throw new BadRequestException('Video duration cannot exceed 30 seconds');
    }

    return this.storiesService.create(user.sub, dto);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stories feed from followed characters' })
  getFeed(@CurrentUser() user: JwtPayload) {
    return this.storiesService.getFeed(user.sub);
  }
}
