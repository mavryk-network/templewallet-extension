import { useEffect, useMemo } from 'react';

import { useDispatch } from 'react-redux';

import { refreshTokensMetadataAction } from 'app/store/tokens-metadata/actions';
import { useTokensMetadataSelector } from 'app/store/tokens-metadata/selectors';
import { fetchTokensMetadata } from 'lib/apis/temple';
import { TokenMetadata } from 'lib/metadata';
import { buildTokenMetadataFromFetched } from 'lib/metadata/utils';
import { useChainId } from 'lib/temple/front';
import { TempleChainId } from 'lib/temple/types';
import { useLocalStorage } from 'lib/ui/local-storage';

const STORAGE_KEY = 'METADATA_REFRESH';

type RefreshRecords = Record<string, number>;

const REFRESH_VERSION = 1;

export const useMetadataRefresh = () => {
  const chainId = useChainId()!;
  const dispatch = useDispatch();

  const [records, setRecords] = useLocalStorage<RefreshRecords>(STORAGE_KEY, {});

  const tokensMetadata = useTokensMetadataSelector();
  const slugsOnAppLoad = useMemo(() => Object.keys(tokensMetadata), []);

  useEffect(() => {
    const lastVersion = records[chainId];
    const setLastVersion = () => setRecords(r => ({ ...r, [chainId]: REFRESH_VERSION }));

    const needToSetVersion = !lastVersion || lastVersion < REFRESH_VERSION;

    if (!slugsOnAppLoad.length) {
      if (needToSetVersion) setLastVersion();

      return;
    }

    if (!needToSetVersion) return;

    if (chainId === TempleChainId.Mainnet) {
      fetchTokensMetadata(chainId, slugsOnAppLoad)
        .then(data =>
          data.reduce<TokenMetadata[]>((acc, token, index) => {
            const slug = slugsOnAppLoad[index]!;
            const [address, id] = slug.split('_');

            const metadata = buildTokenMetadataFromFetched(token, address, Number(id));

            return metadata ? acc.concat(metadata) : acc;
          }, [])
        )
        .then(
          data => {
            if (data.length) dispatch(refreshTokensMetadataAction(data));
            setLastVersion();
          },
          error => console.error(error)
        );
    }
  }, [chainId]);
};
