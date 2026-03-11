import AppsDirectoryGrid from "@/src/domains/platform-core/components/AppsDirectoryGrid";
import { getPlatformDirectoryEntries } from "@/lib/platformApps";

export default function AppsDirectoryPage() {
  const entries = getPlatformDirectoryEntries();

  return (
    <section className="space-y-5" data-testid="apps-directory">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-illuvrse-muted">Directory</p>
        <h1 className="text-3xl font-semibold">All ILLUVRSE Apps</h1>
        <p className="max-w-3xl text-sm text-illuvrse-muted">
          Discover core platform surfaces and integrated external modules from one place.
        </p>
      </header>
      <AppsDirectoryGrid entries={entries} />
    </section>
  );
}
