/**
 * Horizontal rail row for watch content.
 */
import SectionHeading from "./SectionHeading";

export default function RailRow({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading title={title} action={action} />
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">{children}</div>
    </section>
  );
}
