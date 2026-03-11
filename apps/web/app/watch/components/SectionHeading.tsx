/**
 * Watch section heading.
 */
export default function SectionHeading({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {action ? <div className="text-sm text-white/70">{action}</div> : null}
    </div>
  );
}
