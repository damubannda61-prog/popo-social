
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string | null;
  bio?: string;
  username?: string;
  phoneNumber?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
}

export interface PrivateUserInfo {
  uid?: string;
  blockedUserIds?: string[];
  mutedUserIds?: string[];
  reportedUserIds?: string[];
  [key: string]: unknown;
}

export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorPhotoURL?: string;
  content?: string;
  caption?: string;
  imageURL?: string;
  imageUrls?: string[];
  videoURL?: string;
  mediaURL?: string;
  mediaType?: 'image' | 'video' | 'text';
  likes?: string[];
  commentsCount?: number;
  sharesCount?: number;
  createdAt?: Timestamp | Date | string | null;
  updatedAt?: Timestamp | Date | string | null;
  isEdited?: boolean;
  [key: string]: unknown;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt?: Timestamp | Date | string | null;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: string;
  message?: string;
  read?: boolean;
  createdAt?: Timestamp | Date | string | null;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageURL?: string;
  createdAt?: Timestamp | Date | string | null;
  isRead?: boolean;
}

export interface Story {
  id: string;
  authorId: string;
  mediaURL: string;
  mediaType: 'image' | 'video';
  createdAt?: Timestamp | Date | string | null;
  expiresAt?: Timestamp | Date | string | null;
  viewers?: string[];
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt?: Timestamp | Date | string | null;
}
