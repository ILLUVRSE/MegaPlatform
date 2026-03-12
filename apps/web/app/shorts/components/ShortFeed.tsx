/**
 * Shorts feed for the MegaPlatform.
 * Request/response: renders a vertical immersive feed.
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
    <div className="max-h-[calc(100vh-11rem)] snap-y snap-mandatory overflow-y-auto rounded-[34px] border border-white/10 bg-slate-950/72 p-3">
      {items.map((item) => (
        <ShortCard key={item.id} item={item} />
      ))}
    </div>
  );
}
