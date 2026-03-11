import { Nav } from '../../../components/Nav';

export default async function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [response, relatedResponse] = await Promise.all([
    fetch(`${base}/api/clusters/${id}`, { cache: 'no-store' }),
    fetch(`${base}/api/clusters/${id}/related`, { cache: 'no-store' })
  ]);
  const cluster = await response.json();
  const related = await relatedResponse.json();

  return (
    <section>
      <Nav />
      <h1 className="font-display text-3xl">{cluster.title}</h1>
      <h2 className="mt-6 font-semibold">What happened</h2>
      <ul className="list-disc pl-5">
        {(Array.isArray(cluster.summaryBullets) ? cluster.summaryBullets : []).map((item: string) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Why it matters</h2>
      <ul className="list-disc pl-5">
        {(Array.isArray(cluster.whyItMatters) ? cluster.whyItMatters : []).map((item: string) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {Array.isArray(cluster.localAngle) && (
        <>
          <h2 className="mt-6 font-semibold">Local angle</h2>
          <ul className="list-disc pl-5">
            {cluster.localAngle.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(cluster.verticalAngle) && (
        <>
          <h2 className="mt-6 font-semibold">Vertical angle</h2>
          <ul className="list-disc pl-5">
            {cluster.verticalAngle.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(cluster.builderTakeaway) && (
        <>
          <h2 className="mt-6 font-semibold">Builder takeaway</h2>
          <ul className="list-disc pl-5">
            {cluster.builderTakeaway.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(cluster.monetizationImpact) && (
        <>
          <h2 className="mt-6 font-semibold">Monetization impact</h2>
          <ul className="list-disc pl-5">
            {cluster.monetizationImpact.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {Array.isArray(cluster.platformImplications) && (
        <>
          <h2 className="mt-6 font-semibold">Platform implications</h2>
          <ul className="list-disc pl-5">
            {cluster.platformImplications.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mt-6 font-semibold">Cited Articles</h2>
      <ul className="list-disc pl-5">
        {cluster.articles.map((entry: { article: { id: string; title: string; url: string } }) => (
          <li key={entry.article.id}>
            <a className="text-blue-700 underline" href={entry.article.url} target="_blank" rel="noreferrer">
              {entry.article.title}
            </a>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Related stories</h2>
      <ul className="list-disc pl-5">
        {(Array.isArray(related) ? related : []).map((item: { id: string; title: string; similarity: number }) => (
          <li key={item.id}>
            <a className="text-blue-700 underline" href={`/cluster/${item.id}`}>
              {item.title}
            </a>{' '}
            ({item.similarity})
          </li>
        ))}
      </ul>
    </section>
  );
}
