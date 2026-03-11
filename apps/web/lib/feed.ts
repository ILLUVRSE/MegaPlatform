type FeedPostType =
  | "SHORT"
  | "MEME"
  | "WATCH_EPISODE"
  | "WATCH_SHOW"
  | "LIVE_CHANNEL"
  | "GAME"
  | "LINK"
  | "UPLOAD"
  | "TEXT"
  | "SHARE";

type ShortMediaType = "VIDEO" | "IMAGE";

type FeedPostBase = {
  id: string;
  type: FeedPostType;
  authorId: string | null;
  authorProfile: string | null;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
  shortPostId: string | null;
  showId: string | null;
  episodeId: string | null;
  liveChannelId: string | null;
  gameKey: string | null;
  linkUrl: string | null;
  uploadUrl: string | null;
  shareOfId: string | null;
  isHidden: boolean;
  isShadowbanned: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  featuredRank: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
};

export type FeedPostDTO = {
  id: string;
  type: FeedPostType;
  authorId: string | null;
  authorProfile: string | null;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
  shortPostId: string | null;
  showId: string | null;
  episodeId: string | null;
  liveChannelId: string | null;
  gameKey: string | null;
  linkUrl: string | null;
  uploadUrl: string | null;
  shareOfId: string | null;
  isHidden: boolean;
  isShadowbanned: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  featuredRank: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewerLiked?: boolean;
  shortPost?: {
    id: string;
    title: string;
    caption: string;
    mediaUrl: string;
    mediaType: ShortMediaType;
  } | null;
  show?: {
    id: string;
    title: string;
    slug: string;
    posterUrl: string | null;
    heroUrl: string | null;
  } | null;
  episode?: {
    id: string;
    title: string;
    lengthSeconds: number;
    assetUrl: string;
  } | null;
  liveChannel?: {
    id: string;
    name: string;
    slug: string;
    heroUrl: string | null;
    logoUrl: string | null;
  } | null;
  shareOf?: FeedPostDTO | null;
};

export function serializeFeedPost(post: FeedPostBase & {
  shortPost?: { id: string; title: string; caption: string; mediaUrl: string; mediaType: ShortMediaType } | null;
  show?: { id: string; title: string; slug: string; posterUrl: string | null; heroUrl: string | null } | null;
  episode?: { id: string; title: string; lengthSeconds: number; assetUrl: string } | null;
  liveChannel?: { id: string; name: string; slug: string; heroUrl: string | null; logoUrl: string | null } | null;
  shareOf?: (FeedPostBase & {
    shortPost?: { id: string; title: string; caption: string; mediaUrl: string; mediaType: ShortMediaType } | null;
    show?: { id: string; title: string; slug: string; posterUrl: string | null; heroUrl: string | null } | null;
    episode?: { id: string; title: string; lengthSeconds: number; assetUrl: string } | null;
    liveChannel?: { id: string; name: string; slug: string; heroUrl: string | null; logoUrl: string | null } | null;
  }) | null;
  reactions?: Array<{ id: string }>;
}): FeedPostDTO {
  return {
    id: post.id,
    type: post.type,
    authorId: post.authorId,
    authorProfile: post.authorProfile,
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    shortPostId: post.shortPostId,
    showId: post.showId,
    episodeId: post.episodeId,
    liveChannelId: post.liveChannelId,
    gameKey: post.gameKey,
    linkUrl: post.linkUrl,
    uploadUrl: post.uploadUrl,
    shareOfId: post.shareOfId,
    isHidden: post.isHidden,
    isShadowbanned: post.isShadowbanned,
    isPinned: post.isPinned,
    isFeatured: post.isFeatured,
    featuredRank: post.featuredRank,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    shareCount: post.shareCount,
    viewerLiked: Boolean(post.reactions && post.reactions.length > 0),
    shortPost: post.shortPost ?? null,
    show: post.show ?? null,
    episode: post.episode ?? null,
    liveChannel: post.liveChannel ?? null,
    shareOf: post.shareOf
      ? {
          ...serializeFeedPost(post.shareOf),
          shareOf: null
        }
      : null
  };
}
