import { BigNumber } from 'bignumber.js';

import { TzktAlias, TzktOperation, TzktTransactionOperation } from 'lib/apis/tzkt';
import {
  isTzktOperParam,
  isTzktOperParam_Fa12,
  isTzktOperParam_Fa2,
  isTzktOperParam_LiquidityBaking,
  ParameterFa2
} from 'lib/apis/tzkt/utils';
import { isTruthy } from 'lib/utils';

import { MAV_TOKEN_SLUG, toTokenSlug } from '../../assets';
import { AssetMetadataBase } from '../../metadata';
import { OperationsGroup } from '../activity-new/types';

import { getMoneyDiff } from './helpers';
import {
  Fa2TransferSummaryArray,
  HistoryItemDelegationOp,
  HistoryItemOperationBase,
  HistoryItemOpReveal,
  HistoryItemOpTypeEnum,
  HistoryItemOriginationOp,
  HistoryItemOtherOp,
  HistoryItemStatus,
  HistoryItemTokenTransfer,
  HistoryItemTransactionOp,
  HistoryMember,
  IndividualHistoryItem,
  RecipientInfo,
  TokenType,
  UserHistoryItem
} from './types';

export function operationsGroupToHistoryItem({ hash, operations }: OperationsGroup, address: string): UserHistoryItem {
  // TODO: This returns a userHistoryItem. Missing the money diffs. See the JIRA task.
  let firstOperation = undefined,
    oldestOperation = undefined;

  if (operations[0]) {
    firstOperation = reduceOneTzktOperation(operations[0], 0, address);
  }
  if (operations[operations.length - 1]) {
    oldestOperation = reduceOneTzktOperation(operations[operations.length - 1], operations.length - 1, address);
  }

  const historyItemOperations = reduceTzktOperations(operations, address);

  const status = deriveHistoryItemStatus(!historyItemOperations.length ? operations : historyItemOperations);
  const type = deriveHistoryItemType(historyItemOperations, address, operations[0]);

  const newUserHistoryItem: UserHistoryItem = {
    type,
    hash,
    addedAt: firstOperation ? firstOperation.addedAt : '',
    status,
    operations: historyItemOperations,
    highlightedOperationIndex: 0,
    isGroupedOp: historyItemOperations.length > 1
  };

  if (firstOperation) newUserHistoryItem.firstOperation = firstOperation;
  if (oldestOperation) newUserHistoryItem.oldestOperation = oldestOperation;
  return newUserHistoryItem;
}

function reduceTzktOperations(operations: TzktOperation[], address: string): IndividualHistoryItem[] {
  const reducedOperations = operations.map((op, index) => reduceOneTzktOperation(op, index, address)).filter(isTruthy);

  return reducedOperations;
}

/**
 * (i) Does not mutate operation object
 */
function reduceOneTzktOperation(
  operation: TzktOperation,
  index: number,
  address: string
): IndividualHistoryItem | null {
  switch (operation.type) {
    case 'transaction':
      return reduceOneTzktTransactionOperation(address, operation, index);
    case 'delegation': {
      const delegationOpBase = buildHistoryItemOpBase(operation, address, 0, operation.sender, index);
      const delegationOp: HistoryItemDelegationOp = {
        ...delegationOpBase,
        type: HistoryItemOpTypeEnum.Delegation
      };
      if (operation.newDelegate) delegationOp.newDelegate = operation.newDelegate;
      if (operation.newDelegate) delegationOp.prevDelegate = operation.prevDelegate;
      return delegationOp;
    }
    case 'origination': {
      const source = operation.sender;
      const contractBalance = operation.contractBalance ? operation.contractBalance.toString() : '0';
      const originationOpBase = buildHistoryItemOpBase(operation, address, Number(contractBalance), source, index);
      const originationOp: HistoryItemOriginationOp = {
        ...originationOpBase,
        type: HistoryItemOpTypeEnum.Origination
      };
      if (operation.originatedContract) originationOp.originatedContract = operation.originatedContract;
      return originationOp;
    }
    case 'reveal': {
      const revealOpBase = buildHistoryItemOpBase(operation, address, 0, operation.sender, index);

      const revealOp: HistoryItemOpReveal = {
        ...revealOpBase,
        type: HistoryItemOpTypeEnum.Reveal
      };
      return revealOp;
    }
    default:
      const source = operation.sender;
      const otherOpBase = buildHistoryItemOpBase(operation, address, 0, source, index);
      const otherOp: HistoryItemOtherOp = {
        ...otherOpBase,
        type: HistoryItemOpTypeEnum.Other,
        name: operation.type
      };
      return otherOp;
  }
}

function reduceOneTzktTransactionOperation(
  address: string,
  operation: TzktTransactionOperation,
  index: number
): HistoryItemTransactionOp | null {
  function _buildReturn(args: {
    amount: string;
    source: HistoryMember;
    contractAddress?: string;
    tokenTransfers?: HistoryItemTokenTransfer;
  }) {
    const { amount, source, contractAddress, tokenTransfers } = args;
    const HistoryOpBase = buildHistoryItemOpBase(operation, address, Number(amount), source, index);
    const metadata: AssetMetadataBase = {
      decimals: 0,
      name: '',
      symbol: ''
    };

    const historyTxOp: HistoryItemTransactionOp = {
      ...HistoryOpBase,
      destination: getDestinationAddress(operation),
      assetSlug: '',
      assetMetadata: metadata,
      type: HistoryItemOpTypeEnum.TransferTo
    };
    if (contractAddress != null) historyTxOp.contractAddress = contractAddress;
    if (isTzktOperParam(operation.parameter)) {
      historyTxOp.entrypoint = operation.parameter.entrypoint;
      historyTxOp.type = HistoryItemOpTypeEnum.Interaction;
    }
    if (tokenTransfers) {
      historyTxOp.tokenTransfers = tokenTransfers;
      const { sender, tokenContractAddress, tokenId } = tokenTransfers;

      historyTxOp.assetSlug = toTokenSlug(tokenContractAddress, tokenId);

      if (sender.address === address || !historyTxOp.entrypoint?.toLowerCase()?.includes('swap')) {
        historyTxOp.type = HistoryItemOpTypeEnum.TransferTo;
      } else if (historyTxOp.entrypoint?.toLowerCase()?.includes('swap')) {
        historyTxOp.type = HistoryItemOpTypeEnum.Swap;
      } else historyTxOp.type = HistoryItemOpTypeEnum.TransferFrom;
    }

    return historyTxOp;
  }

  const parameter = operation.parameter;

  if (parameter == null) {
    if (operation.target.address !== address && operation.sender.address !== address) return null;

    const source = operation.sender;
    const amount = String(operation.amount);
    const tokenTransfers = buildTokenTransferItem(operation, MAV_TOKEN_SLUG, address);

    if (!tokenTransfers) return _buildReturn({ amount, source });

    return _buildReturn({
      amount,
      source,
      contractAddress: MAV_TOKEN_SLUG,
      tokenTransfers
    });
  } else if (isTzktOperParam_Fa2(parameter)) {
    const tokenTransfers = buildTokenTransferItem(operation, 'fa2', address);
    // console.log('FA2 - Got to here in buildTokenTransferItem. Hash & Op:', operation.hash, operation, tokenTransfers);
    const source = tokenTransfers?.sender.address === address ? { ...operation.sender, address } : operation.sender;
    const contractAddress = operation.target.address;
    const amount = tokenTransfers?.totalAmount || '0';

    if (!tokenTransfers) return _buildReturn({ amount, source, contractAddress });

    return _buildReturn({ amount, source, contractAddress, tokenTransfers });
  } else if (isTzktOperParam_Fa12(parameter)) {
    if (parameter.entrypoint === 'approve') return null;

    const source = { ...operation.sender };
    if (parameter.value.from === address) source.address = address;
    else if (parameter.value.to === address) source.address = parameter.value.from;
    else return null;

    const contractAddress = operation.target.address;
    const amount = parameter.value.value;
    const tokenTransfers = buildTokenTransferItem(operation, 'fa12', address);

    if (!tokenTransfers) return _buildReturn({ amount, source, contractAddress });

    return _buildReturn({ amount, source, contractAddress, tokenTransfers });
  } else if (isTzktOperParam_LiquidityBaking(parameter)) {
    const source = operation.sender;
    const contractAddress = operation.target.address;
    const amount = parameter.value.quantity;

    return _buildReturn({ amount, source, contractAddress });
  } else {
    const source = operation.sender;
    const amount = String(operation.amount);

    return _buildReturn({ amount, source });
  }
}

function buildHistoryItemOpBase(
  operation: TzktOperation,
  address: string,
  amount: number,
  source: HistoryMember,
  index: number
): HistoryItemOperationBase {
  const { id, level, timestamp: addedAt, hash, block, bakerFee, storageFee, gasUsed, storageUsed = 0 } = operation;
  const reducedOperation: HistoryItemOperationBase = {
    id,
    level,
    source,
    amountSigned: source.address === address ? `-${amount}` : `${amount}`,
    status: stringToHistoryItemStatus(operation.status),
    addedAt,
    block,
    hash,
    isHighlighted: false,
    opIndex: index,
    bakerFee, // gas fee
    gasUsed,
    storageUsed,
    storageFee: storageFee ?? 0, // storage fee
    entrypoint: (operation as TzktTransactionOperation).entrypoint
  };
  if (!isZero(reducedOperation.amountSigned)) reducedOperation.amountDiff = getMoneyDiff(reducedOperation.amountSigned);
  return reducedOperation;
}

/**
 * Items with zero cumulative amount value are filtered out
 */
function reduceParameterFa2Values(values: ParameterFa2['value'], relAddress: string): Fa2TransferSummaryArray {
  const result: Fa2TransferSummaryArray = [];
  try {
    for (const val of values) {
      const from = val.from_;
      const tokenId = val.txs[0].token_id;

      if (val.from_ === relAddress) {
        let totalAmount = new BigNumber(0);
        const recipients: RecipientInfo[] = [];

        for (const tx of val.txs) {
          const amount = new BigNumber(tx.amount);
          totalAmount = totalAmount.plus(amount);
          recipients.push({
            to: transformToHistoryMember(tx.to_),
            amount: amount.toFixed().toString()
          });
        }

        if (!totalAmount.isZero()) {
          result.push({
            from,
            totalAmount: totalAmount.toFixed().toString(),
            tokenId,
            recipients
          });
        }
      } else {
        let isValRel = false;
        let amount = new BigNumber(0);

        for (const tx of val.txs) {
          if (tx.to_ === relAddress) {
            amount = amount.plus(tx.amount);
            if (!isValRel) isValRel = true;
          }
        }

        if (isValRel && !amount.isZero()) {
          result.push({
            from,
            totalAmount: amount.toFixed().toString(),
            tokenId,
            recipients: [{ to: transformToHistoryMember(relAddress), amount: amount.toFixed().toString() }]
          });
        }
      }
    }
  } catch (e) {
    console.log(values);
  }

  return result;
}

function stringToHistoryItemStatus(status: string): HistoryItemStatus {
  if (['applied', 'backtracked', 'skipped', 'failed'].includes(status)) return status as HistoryItemStatus;

  return 'pending';
}

function deriveHistoryItemStatus(items: { status: HistoryItemStatus }[]): HistoryItemStatus {
  if (items.find(o => o.status === 'pending')) return 'pending';
  if (items.find(o => o.status === 'applied')) return 'applied';
  if (items.find(o => o.status === 'backtracked')) return 'backtracked';
  if (items.find(o => o.status === 'skipped')) return 'skipped';
  if (items.find(o => o.status === 'failed')) return 'failed';

  return items[0]!.status;
}

function deriveHistoryItemType(
  items: IndividualHistoryItem[], // [5, 2]
  address: string,
  firstOperation: TzktOperation // 5
): HistoryItemOpTypeEnum {
  let type = HistoryItemOpTypeEnum.Other;

  // Need to find the first transaction that isn't an approval
  // then need to take that opp type.
  if (firstOperation.type === 'delegation') {
    return HistoryItemOpTypeEnum.Delegation;
  } else if (firstOperation.type === 'origination') {
    return HistoryItemOpTypeEnum.Origination;
  } else if (firstOperation.type === 'reveal') {
    return HistoryItemOpTypeEnum.Reveal;
  } else {
    if (items.some(item => item?.entrypoint?.toLocaleLowerCase() === 'swap')) {
      return HistoryItemOpTypeEnum.Swap;
    } else {
      // has already type from HistoryItemOpTypeEnum (only firstOperation has original api data)
      const item = items[0];

      if (items.some(item => item.entrypoint === 'placeSellOrder' || item.entrypoint === 'placeBuyOrder')) {
        return HistoryItemOpTypeEnum.Multiple;
      }

      if (isZero(item.amountSigned) && item.entrypoint !== undefined) {
        return HistoryItemOpTypeEnum.Interaction;
      }

      // check if sender address is the source address and if type if transaction
      if (item.source.address === address && item.type === HistoryItemOpTypeEnum.TransferTo) {
        return HistoryItemOpTypeEnum.TransferTo;
      }

      if ('tokenTransfers' in item && item.tokenTransfers)
        if (item.tokenTransfers?.recipients?.find(o => o.to.address === address)) {
          return HistoryItemOpTypeEnum.TransferFrom;
        } else {
          type = HistoryItemOpTypeEnum.TransferTo;
        }
    }
  }

  return type;
}

function buildTokenTransferItem(
  operation: TzktTransactionOperation,
  tokenType: TokenType,
  address: string
): HistoryItemTokenTransfer | null {
  const params = operation.parameter;
  if (params === null) return null;
  else if (tokenType === 'fa2') {
    const values = reduceParameterFa2Values(params.value, address);
    const firstVal = values[0];
    if (firstVal == null) return null;
    const tokenSlug = toTokenSlug(operation.target.address, Number(firstVal.tokenId));
    return {
      totalAmount: firstVal.totalAmount,
      recipients: firstVal.recipients,
      id: operation.id,
      level: operation.level || 0,
      sender: transformToHistoryMember(firstVal.from),
      tokenContractAddress: operation.target.address,
      tokenId: Number(firstVal.tokenId),
      tokenType: tokenType,
      assetSlug: tokenSlug
    };
  } else if (tokenType === 'fa12') {
    const source = { ...operation.sender };
    const recipient = transformToHistoryMember(params.value.to);
    if (params.value.from === address) source.address = address;
    else if (params.value.to === address) source.address = params.value.from;
    else return null;
    const tokenSlug = toTokenSlug(operation.target.address, 0);
    return {
      totalAmount: params.value.value,
      recipients: [{ to: recipient, amount: params.value.value }],
      id: operation.id,
      level: operation.level || 0,
      sender: source,
      tokenContractAddress: operation.target.address,
      tokenId: 0,
      tokenType: tokenType,
      assetSlug: tokenSlug
    };
  } else {
    const source = operation.sender;
    const amount = String(operation.amount);
    const recipient = transformToHistoryMember(operation.target.address);
    return {
      totalAmount: amount,
      recipients: [{ to: recipient, amount: amount }],
      id: operation.id,
      level: operation.level || 0,
      sender: source,
      tokenContractAddress: 'tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg',
      tokenId: 0,
      tokenType: tokenType,
      assetSlug: MAV_TOKEN_SLUG
    };
  }
}

function transformToHistoryMember(address: string, alias: string = ''): TzktAlias {
  // Transform the data into TzktAlias format
  return { alias: alias, address: address };
}

// Similar functions for Delegation, Origination, Reveal, Other

// export function groupOperationsByHash(operations: IndividualHistoryItem[]): UserHistoryItem[] {
//   const grouped = operations.reduce((acc, operation) => {
//     // Grouping logic based on hash
//     if (!acc[operation.hash]) {
//       acc[operation.hash] = [];
//     }
//     acc[operation.hash].push(operation);
//     return acc;
//   }, {});
//
//
//   return Object.entries(grouped).map(([hash, ops]) => ({
//     hash: hash,
//     operations: ops,
//     highlightedOperationIndex: 0 // Assuming the first operation is highlighted
//     isGroupedOp: ops.length > 0
//   }));
// }

// set the end destination address based on diffs if it exists
// f.e. JPD 200 -> SIRS -> MAvryk Finance
// we wend to SIRS but the end address is Mavryk Financem so we show that address instead of SIRS address
// NOTE - It doesn't apply to simple transfers where we have amount
function getDestinationAddress(operation: TzktTransactionOperation) {
  const diff = operation.diffs ? operation.diffs[0] : null;

  return diff && !isZero(new BigNumber(diff.content.value)) && typeof diff.content.key === 'string'
    ? { address: diff.content.key }
    : operation.target;
}

const isZero = (val: BigNumber.Value) => new BigNumber(val).isZero();
