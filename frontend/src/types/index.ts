export interface Character {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  backstory: string | null;
  personalityTraits: string[];
  createdAt: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  character: Character;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  character: Character;
  createdAt: string;
}

export interface Story {
  id: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'text';
  textContent?: string | null;
  backgroundColor?: string | null;
  duration?: number | null;
  expiresAt: string;
  createdAt: string;
}

export interface StoryGroup {
  character: Character;
  stories: Story[];
}

export interface Message {
  id: string;
  content: string;
  sender: Character;
  isRead: boolean;
  createdAt: string;
  conversationId?: string;
}

export interface Conversation {
  id: string;
  participants: Character[];
  lastMessage: { id: string; content: string; isRead: boolean; createdAt: string } | null;
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  character: Character;
}
