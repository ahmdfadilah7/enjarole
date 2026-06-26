import { Character } from '@prisma/client';

export type SafeCharacter = Omit<Character, 'passwordHash' | 'refreshToken' | 'email'>;

export function toSafeCharacter(character: Character): SafeCharacter {
  const { passwordHash: _, refreshToken: __, email: ___, ...safe } = character;
  return safe;
}

export function toPublicCharacter(character: Character) {
  return {
    id: character.id,
    username: character.username,
    displayName: character.displayName,
    avatarUrl: character.avatarUrl,
    bio: character.bio,
    backstory: character.backstory,
    personalityTraits: character.personalityTraits,
    createdAt: character.createdAt,
  };
}

export interface JwtPayload {
  sub: string;
  username: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
}
