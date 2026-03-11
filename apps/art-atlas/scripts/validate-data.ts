import dataset from '../data/bingham.json';
import { validateDataset } from '../lib/validate-dataset';
import type { AtlasDataset } from '../lib/types';

async function urlExists(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'user-agent': 'BinghamAtlasDataValidator/2.0'
      },
      signal: controller.signal
    });

    if (response.status === 403 || response.status === 404 || response.status === 405) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'user-agent': 'BinghamAtlasDataValidator/2.0'
        },
        signal: controller.signal
      });
    }

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const typedDataset = dataset as AtlasDataset;
  const checkRemote = process.env.SKIP_REMOTE_URL_CHECK !== '1';

  await validateDataset(typedDataset, {
    checkRemote,
    urlExists
  });

  console.log(`Validated ${typedDataset.artworks.length} artworks successfully.`);
  if (!checkRemote) {
    console.log('Remote URL checks skipped. Use validate:data:strict (or unset SKIP_REMOTE_URL_CHECK) to enable.');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown validation error.';
  console.error(message);
  process.exit(1);
});
