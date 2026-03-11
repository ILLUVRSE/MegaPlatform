import type { Metadata } from 'next';
import { Breadcrumbs, breadcrumbListJsonLd } from '@/components/breadcrumbs';
import { CollectionClient } from '@/components/collection-client';

export const metadata: Metadata = {
  title: 'My Collection',
  description: 'View, export, and import your saved artwork and music favorites in Art Atlas.'
};

export default function CollectionPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'My Collection' }
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbListJsonLd(breadcrumbs)) }} />
      <Breadcrumbs items={breadcrumbs} />
      <CollectionClient />
    </div>
  );
}
