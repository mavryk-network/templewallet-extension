/**
 * Docs: https://public-api-v3-20221206.objkt.com/docs
 * Explore: https://public-api-v3-20221206.objkt.com/explore
 */

import { TezosToolkit } from '@taquito/taquito';
import { chunk } from 'lodash';
import { forkJoin, map, of, switchMap } from 'rxjs';

import { fromFa2TokenSlug } from 'lib/assets/utils';

import { apolloObjktClient, MAX_OBJKT_QUERY_RESPONSE_ITEMS, OBJKT_CONTRACT } from './constants';
import { buildGetNFTsQuery, buildGetGalleriesAttributesCountsQuery } from './queries';
import type {
  FxHashContractInterface,
  UserObjktNFT,
  ObjktGalleryAttributeCount,
  ObjktContractInterface
} from './types';

export type { UserObjktNFT, ObjktGalleryAttributeCount } from './types';
export { objktCurrencies } from './constants';

export const fetchObjktNFTs$ = (slugs: string[]) =>
  forkJoin(chunk(slugs, MAX_OBJKT_QUERY_RESPONSE_ITEMS).map(slugsChunk => fetchObjktNFTsChunk$(slugsChunk))).pipe(
    map(res => res.reduce<UserObjktNFT[]>((acc, curr) => acc.concat(curr.token), [])),
    // Now, getting tokens' attributes counts, that are assigned to galleries
    switchMap(tokens => {
      const attributesToGet: GetAttribute[] = [];

      for (const token of tokens) {
        for (const { attribute } of token.attributes) {
          const { id } = attribute;
          for (const { gallery } of token.galleries) {
            const { pk } = gallery;
            if (!attributesToGet.find(a => a.id === id && a.galleryPk === pk))
              attributesToGet.push({ id, galleryPk: pk });
          }
        }
      }

      return fetchObjktGalleriesAttributesCounts$(attributesToGet).pipe(
        map(galleriesAttributesCounts => ({
          tokens,
          galleriesAttributesCounts
        }))
      );
    })
  );

const fetchObjktNFTsChunk$ = (slugs: string[]) =>
  apolloObjktClient.query<{ token: UserObjktNFT[] }>(buildGetNFTsQuery(), {
    where: {
      _or: slugs.map(slug => {
        const { contract, id } = fromFa2TokenSlug(slug);

        return { fa_contract: { _eq: contract }, token_id: { _eq: String(id) } };
      })
    }
  });

interface GetAttribute {
  id: number;
  galleryPk: number;
}

const fetchObjktGalleriesAttributesCounts$ = (attributes: GetAttribute[]) =>
  attributes.length
    ? forkJoin(
        chunk(attributes, MAX_OBJKT_QUERY_RESPONSE_ITEMS).map(attributesChunk =>
          fetchObjktGalleriesAttributesCountsChunk$(attributesChunk)
        )
      ).pipe(
        map(res =>
          res.reduce<ObjktGalleryAttributeCount[]>((acc, curr) => acc.concat(curr.gallery_attribute_count), [])
        )
      )
    : of([]);

const fetchObjktGalleriesAttributesCountsChunk$ = (attributes: GetAttribute[]) =>
  apolloObjktClient.query<{ gallery_attribute_count: ObjktGalleryAttributeCount[] }>(
    buildGetGalleriesAttributesCountsQuery(),
    {
      where: {
        _or: attributes.map(({ id, galleryPk }) => ({
          attribute_id: { _eq: id },
          gallery_pk: { _eq: galleryPk }
        }))
      }
    }
  );

export const getObjktMarketplaceContract = (tezos: TezosToolkit, address?: string) =>
  tezos.contract.at<ObjktContractInterface | FxHashContractInterface>(address ?? OBJKT_CONTRACT);
