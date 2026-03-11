export const SHORTS_AUTO_HIDE_REPORT_THRESHOLD = Number(
  process.env.SHORTS_AUTO_HIDE_REPORT_THRESHOLD ?? "3"
);

export function scoreShort(input: {
  publishedAt: Date;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  featuredRank: number;
  purchaseCount: number;
}) {
  const ageHours = Math.max(0, (Date.now() - input.publishedAt.getTime()) / (1000 * 60 * 60));
  const recency = Math.max(0, 120 - ageHours * 2.1);
  const engagement = input.likeCount * 2 + input.commentCount * 3 + input.shareCount * 4;
  const editorial = (input.isPinned ? 16 : 0) + (input.isFeatured ? 10 + Math.max(0, input.featuredRank) : 0);
  const monetizationSignal = Math.min(24, input.purchaseCount * 1.5);
  return Number((recency + engagement + editorial + monetizationSignal).toFixed(2));
}

export function shouldHideShortByModeration(input: {
  isHidden: boolean;
  isShadowbanned: boolean;
  unresolvedReports: number;
}) {
  return (
    input.isHidden ||
    input.isShadowbanned ||
    input.unresolvedReports >= Math.max(1, SHORTS_AUTO_HIDE_REPORT_THRESHOLD)
  );
}

