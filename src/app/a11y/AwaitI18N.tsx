import { FC } from 'react';

import useSWR from 'swr';

import { onInited } from 'lib/i18n';
import { delay } from 'lib/utils';

const AwaitI18N: FC = () => {
  useSWR('i18n', awaitI18n, {
    suspense: true,
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });

  return null;
};

export default AwaitI18N;

async function awaitI18n() {
  try {
    await Promise.race([new Promise(r => onInited(() => r(null))), delay(3_000)]);
  } catch (err: any) {
    console.error(err);
  }
  return null;
}
