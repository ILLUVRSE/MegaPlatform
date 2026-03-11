/**
 * Shorts feed for the MegaPlatform.
 * Request/response: renders a grid of short posts.
 * Guard: none; server component friendly.
 */
import ShortCard from "./ShortCard";

type ShortPostItem = {
  id: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: "VIDEO" | "IMAGE";
  isPremium: boolean;
  price?: number | null;
  createdAt: string;
};

export default function ShortFeed({ items }: { items: ShortPostItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ShortCard key={item.id} item={item} />
      ))}
    </div>
  );
}
