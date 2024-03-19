import { useCallback, useMemo } from 'react';

import { isDefined } from '@rnw-community/shared';
import { ScopedMutator } from 'swr/_internal';

import { useTokensMetadataSelector } from 'app/store/tokens-metadata/selectors';
import { isTezAsset, TEMPLE_TOKEN_SLUG } from 'lib/assets';
import { AssetTypesEnum } from 'lib/assets/types';
import { TOKENS_SYNC_INTERVAL } from 'lib/fixed-times';
import { isNFT } from 'lib/metadata';
import { FILM_METADATA, TEZOS_METADATA } from 'lib/metadata/defaults';
import type { AssetMetadataBase } from 'lib/metadata/types';
import { useRetryableSWR } from 'lib/swr';
import { getStoredTokens, getAllStoredTokensSlugs, isTokenDisplayed } from 'lib/temple/assets';
import { useNetwork } from 'lib/temple/front';
import { ITokenStatus } from 'lib/temple/repo';

import { useChainId, useAccount } from './ready';

const useKnownTokens = (chainId: string, account: string, fungible = true, onlyDisplayed = true) => {
  const swrResponse = useRetryableSWR(
    ['use-known-tokens', chainId, account, onlyDisplayed],
    () => getStoredTokens(chainId, account, onlyDisplayed),
    {
      revalidateOnMount: true,
      refreshInterval: TOKENS_SYNC_INTERVAL
    }
  );

  const tokensMetadata = useTokensMetadataSelector();

  const tokens = swrResponse.data;

  const data = useMemo(
    () =>
      tokens?.filter(token => {
        const metadata = tokensMetadata[token.tokenSlug];
        if (!isDefined(metadata)) return false;

        const itIsNFT = isNFT(metadata);

        return fungible ? !itIsNFT : itIsNFT;
      }) ?? [],
    [tokens, tokensMetadata, fungible]
  );

  return {
    ...swrResponse,
    data
  };
};

export const useDisplayedFungibleTokens = (chainId: string, account: string) =>
  useKnownTokens(chainId, account, true, true);

const useFungibleTokens = (chainId: string, account: string) => useKnownTokens(chainId, account, true, false);

export const useNFTTokens = (chainId: string, account: string, onlyDisplayed: boolean = false) =>
  useKnownTokens(chainId, account, false, onlyDisplayed);

export const useAllStoredTokensSlugs = (chainId: string) =>
  useRetryableSWR(['use-tokens-slugs', chainId], () => getAllStoredTokensSlugs(chainId), {
    revalidateOnMount: true,
    refreshInterval: TOKENS_SYNC_INTERVAL
  });

export const useGasToken = () => {
  const { type } = useNetwork();

  return useMemo(
    () =>
      type === 'dcp'
        ? {
            logo: 'misc/token-logos/film.png',
            symbol: 'ф',
            assetName: 'FILM',
            metadata: FILM_METADATA,
            isDcpNetwork: true
          }
        : {
            logo: 'misc/token-logos/tez.svg',
            symbol: 'ꜩ',
            assetName: 'tez',
            metadata: TEZOS_METADATA
          },
    [type]
  );
};

export const useGetTokenMetadata = () => {
  const allTokensMetadata = useTokensMetadataSelector();
  const { metadata } = useGasToken();

  return useCallback(
    (slug: string): AssetMetadataBase | undefined => {
      if (isTezAsset(slug)) {
        return metadata;
      }

      return allTokensMetadata[slug];
    },
    [allTokensMetadata, metadata]
  );
};

type TokenStatuses = Record<string, { displayed: boolean; removed: boolean }>;

export const useAvailableAssetsSlugs = (assetType: AssetTypesEnum) => {
  const chainId = useChainId(true)!;
  const { publicKeyHash } = useAccount();
  const allTokensMetadata = useTokensMetadataSelector();

  const { data: allNFTsSlugs = [], isValidating: allKnownNFTsTokenSlugsLoading } = useAllKnownNFTTokenSlugs(chainId);

  const {
    data: nfts = [],
    mutate: mutateNFTs,
    isValidating: nftTokensLoading
  } = useNFTTokens(chainId, publicKeyHash, false);

  const { data: allTokenSlugs = [], isValidating: allKnownFungibleTokenSlugsLoading } =
    useAllKnownFungibleTokenSlugs(chainId);

  const {
    data: tokens = [],
    mutate: mutateTokens,
    isValidating: fungibleTokensLoading
  } = useFungibleTokens(chainId, publicKeyHash);

  const isNFTs = assetType === AssetTypesEnum.NFTs;
  const assets = isNFTs ? nfts : tokens;
  const slugs = isNFTs ? allNFTsSlugs : allTokenSlugs;
  const mutate = isNFTs ? mutateNFTs : mutateTokens;

  const isLoading =
    allKnownFungibleTokenSlugsLoading || fungibleTokensLoading || allKnownNFTsTokenSlugsLoading || nftTokensLoading;

  const assetsStatuses = useMemo(() => {
    const statuses: TokenStatuses = {};
    for (const asset of assets) {
      statuses[asset.tokenSlug] = {
        displayed: isTokenDisplayed(asset),
        removed: asset.status === ITokenStatus.Removed
      };
    }
    return statuses;
  }, [assets]);

  const availableAssets = useMemo(
    () =>
      slugs.filter(slug => slug !== TEMPLE_TOKEN_SLUG && slug in allTokensMetadata && !assetsStatuses[slug]?.removed),
    [slugs, allTokensMetadata, assetsStatuses]
  );

  return { availableAssets, assetsStatuses, isLoading, mutate };
};

const useAllKnownFungibleTokenSlugs = (chainId: string) => useAllKnownTokensSlugs(chainId, true);

const useAllKnownNFTTokenSlugs = (chainId: string) => useAllKnownTokensSlugs(chainId, false);

const useAllKnownTokensSlugs = (chainId: string, fungible = true) => {
  const swrResponse = useAllStoredTokensSlugs(chainId);
  const tokensMetadata = useTokensMetadataSelector();

  const slugs = swrResponse.data;

  const data = useMemo(
    () =>
      slugs?.filter(slug => {
        const metadata = tokensMetadata[slug];
        if (!isDefined(metadata)) return false;

        const itIsNFT = isNFT(metadata);

        return fungible ? !itIsNFT : itIsNFT;
      }) ?? [],
    [slugs, tokensMetadata, fungible]
  );

  return {
    ...swrResponse,
    data
  };
};

export const updateTokensSWR = async (mutate: ScopedMutator, chainId: string, account: string) => {
  await mutate(['use-known-tokens', chainId, account, true]);
  await mutate(['use-known-tokens', chainId, account, false]);
  await mutate(['use-tokens-slugs', chainId]);
};
