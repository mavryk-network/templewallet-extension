import type { TzktApiChainId, TzktOperation } from 'lib/apis/tzkt';
import * as TZKT from 'lib/apis/tzkt';
import { fetchGetAccountOperationByHash, GetOperationsTransactionsParams } from 'lib/apis/tzkt/api';
import { MAV_TOKEN_SLUG } from 'lib/assets';
import { detectTokenStandard } from 'lib/assets/standards';
import { ReactiveTezosToolkit } from 'lib/temple/front';
import { TempleAccount } from 'lib/temple/types';
import { filterUnique } from 'lib/utils';

import type { UserHistoryItem, OperationsGroup } from './types';
import { operationsGroupToHistoryItem } from './utils';

const LIQUIDITY_BAKING_DEX_ADDRESS = 'KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5';

export async function fetchUserOperationByHash(chainId: TzktApiChainId, accountAddress: string, hash: string) {
  try {
    const operations = await fetchGetAccountOperationByHash(chainId, accountAddress, hash);

    const groups = await fetchOperGroupsForOperations(chainId, operations);
    const arr = groups.map(group => operationsGroupToHistoryItem(group, accountAddress));
    return arr;
  } catch (e) {
    throw e;
  }
}

export default async function fetchUserHistory(
  chainId: TzktApiChainId,
  account: TempleAccount,
  assetSlug: string | undefined,
  pseudoLimit: number,
  tezos: ReactiveTezosToolkit,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
): Promise<UserHistoryItem[]> {
  const operations = await fetchOperations(chainId, account, assetSlug, pseudoLimit, tezos, olderThan, operationParams);

  // console.log('Logging operations in the fetchUserHistory function:', operations);
  if (!operations.length) return [];
  const groups = await fetchOperGroupsForOperations(chainId, operations, olderThan);
  // console.log('Logging groups in the fetchUserHistory function:', groups);
  const arr = groups.map(group => operationsGroupToHistoryItem(group, account.publicKeyHash));
  return arr;
}

/**
 * Returned items are sorted new-to-old.
 *
 * @arg pseudoLimit // Is pseudo, because, number of returned activities is not guarantied to equal to it.
 *  It can also be smaller, even when older items are available (they can be fetched later).
 */
async function fetchOperations(
  chainId: TzktApiChainId,
  account: TempleAccount,
  assetSlug: string | undefined,
  pseudoLimit: number,
  tezos: ReactiveTezosToolkit,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
): Promise<TzktOperation[]> {
  const { publicKeyHash: accAddress } = account;

  if (assetSlug) {
    const [contractAddress, tokenId] = (assetSlug ?? '').split('_');

    if (assetSlug === MAV_TOKEN_SLUG) {
      return await fetchOperations_TEZ(chainId, accAddress, pseudoLimit, olderThan, operationParams);
    } else if (assetSlug === LIQUIDITY_BAKING_DEX_ADDRESS) {
      return await fetchOperations_Contract(chainId, accAddress, pseudoLimit, olderThan, operationParams);
    } else {
      const tokenType = await detectTokenStandard(tezos, contractAddress);

      if (tokenType === 'fa1.2') {
        return await fetchOperations_Token_Fa_1_2(
          chainId,
          accAddress,
          contractAddress,
          pseudoLimit,
          olderThan,
          operationParams
        );
      } else if (tokenType === 'fa2') {
        return await fetchOperations_Token_Fa_2(
          chainId,
          accAddress,
          contractAddress,
          tokenId,
          pseudoLimit,
          olderThan,
          operationParams
        );
      }
    }
  }

  return await fetchOperations_Any(chainId, accAddress, pseudoLimit, olderThan, operationParams);
}

const fetchOperations_TEZ = (
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
) => {
  return TZKT.fetchGetOperationsTransactions(chainId, {
    'anyof.sender.target.initiator': accountAddress,
    ...buildOlderThanParam(olderThan),
    limit: pseudoLimit,
    ...operationParams,
    'sort.desc': 'id',
    'amount.ne': '0'
  });
};

const fetchOperations_Contract = (
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
) => {
  return TZKT.fetchGetAccountOperations(chainId, accountAddress, {
    type: 'transaction',
    limit: pseudoLimit,
    initiator: accountAddress,
    entrypoint: 'mintOrBurn',
    ...operationParams,
    'level.lt': olderThan?.oldestOperation?.level,
    sort: 1
  });
};

const fetchOperations_Token_Fa_1_2 = (
  chainId: TzktApiChainId,
  accountAddress: string,
  contractAddress: string,
  pseudoLimit: number,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
) => {
  return TZKT.fetchGetOperationsTransactions(chainId, {
    entrypoint: 'transfer',
    target: contractAddress,
    'parameter.in': `[{"from":"${accountAddress}"},{"to":"${accountAddress}"}]`,
    ...operationParams,
    limit: pseudoLimit,
    'sort.desc': 'level',
    'level.lt': olderThan?.oldestOperation?.level
  });
};

const fetchOperations_Token_Fa_2 = (
  chainId: TzktApiChainId,
  accountAddress: string,
  contractAddress: string,
  tokenId = '0',
  pseudoLimit: number,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
) => {
  return TZKT.fetchGetOperationsTransactions(chainId, {
    entrypoint: 'transfer',
    target: contractAddress,
    'parameter.[*].in': `[{"from_":"${accountAddress}","txs":[{"token_id":"${tokenId}"}]},{"txs":[{"to_":"${accountAddress}","token_id":"${tokenId}"}]}]`,
    ...operationParams,
    limit: pseudoLimit,
    'level.lt': olderThan?.oldestOperation?.level,
    'sort.desc': 'level'
  });
};

async function fetchOperations_Any(
  chainId: TzktApiChainId,
  accountAddress: string,
  pseudoLimit: number,
  olderThan?: UserHistoryItem,
  operationParams?: GetOperationsTransactionsParams
) {
  const limit = pseudoLimit;

  const accOperations = await TZKT.fetchGetAccountOperations(chainId, accountAddress, {
    type: ['delegation', 'origination', 'transaction'],
    ...buildOlderThanParam(olderThan),
    ...operationParams,
    limit,
    sort: 1
  });

  if (!accOperations.length) return [];

  let newerThen: string | undefined = accOperations[accOperations.length - 1]?.timestamp;

  const fa12OperationsTransactions = await TZKT.refetchOnce429(
    () =>
      fetchIncomingOperTransactions_Fa_1_2(chainId, accountAddress, newerThen ? { newerThen } : { limit }, olderThan),
    1000
  );

  if (newerThen == null) {
    newerThen = fa12OperationsTransactions[accOperations.length - 1]?.timestamp;
  }

  const fa2OperationsTransactions = await TZKT.refetchOnce429(
    () => fetchIncomingOperTransactions_Fa_2(chainId, accountAddress, newerThen ? { newerThen } : { limit }, olderThan),
    1000
  );

  const allOperations = accOperations
    .concat(fa12OperationsTransactions, fa2OperationsTransactions)
    .sort((b, a) => a.id - b.id);

  return allOperations;
}

// incoming operations fetchers

function fetchIncomingOperTransactions_Fa_1_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  endLimitation: { limit: number } | { newerThen: string },
  olderThan?: UserHistoryItem
) {
  const bottomParams = 'limit' in endLimitation ? endLimitation : { 'timestamp.ge': endLimitation.newerThen };

  return TZKT.fetchGetOperationsTransactions(chainId, {
    'sender.ne': accountAddress,
    'target.ne': accountAddress,
    'initiator.ne': accountAddress,
    'parameter.to': accountAddress,
    entrypoint: 'transfer',
    ...buildOlderThanParam(olderThan),
    ...bottomParams,
    'sort.desc': 'id'
  });
}

function fetchIncomingOperTransactions_Fa_2(
  chainId: TzktApiChainId,
  accountAddress: string,
  endLimitation: { limit: number } | { newerThen: string },
  olderThan?: UserHistoryItem
) {
  const bottomParams = 'limit' in endLimitation ? endLimitation : { 'timestamp.ge': endLimitation.newerThen };

  return TZKT.fetchGetOperationsTransactions(chainId, {
    'sender.ne': accountAddress,
    'target.ne': accountAddress,
    'initiator.ne': accountAddress,
    'parameter.[*].txs.[*].to_': accountAddress,
    entrypoint: 'transfer',
    ...buildOlderThanParam(olderThan),
    ...bottomParams,
    'sort.desc': 'id'
  });
}

//// PRIVATE

/**
 * @return groups[number].operations // sorted new-to-old
 */
async function fetchOperGroupsForOperations(
  chainId: TzktApiChainId,
  operations: TzktOperation[],
  olderThan?: UserHistoryItem
) {
  const uniqueHashes = filterUnique(operations.map(d => d.hash));

  if (olderThan && uniqueHashes[0] === olderThan.hash) uniqueHashes.splice(1);

  const groups: OperationsGroup[] = [];
  for (const hash of uniqueHashes) {
    const operations = await TZKT.refetchOnce429(() => TZKT.fetchGetOperationsByHash(chainId, hash), 1000);
    operations.sort((b, a) => a.id - b.id);
    groups.push({
      hash,
      operations
    });
  }

  return groups;
}

/**
 * > (!) When using `lastId` param, TZKT API might error with:
 * > `{"code":400,"errors":{"lastId":"The value '331626822238208' is not valid."}}`
 * > when it's not true!
 */
const buildOlderThanParam = (olderThan?: UserHistoryItem) => ({
  'timestamp.lt': olderThan?.oldestOperation?.addedAt
});
