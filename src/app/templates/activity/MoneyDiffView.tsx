import React, { memo, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import classNames from 'clsx';

import Money from 'app/atoms/Money';
import { useAppEnv } from 'app/env';
import InFiat from 'app/templates/InFiat';
import { useAssetMetadata, getAssetSymbol } from 'lib/temple/front';

type MoneyDiffViewProps = {
  assetId: string;
  diff: string;
  pending?: boolean;
  className?: string;
};

const MoneyDiffView = memo<MoneyDiffViewProps>(({ assetId: assetSlug, diff, pending = false, className }) => {
  const { popup } = useAppEnv();
  const metadata = useAssetMetadata(assetSlug);

  const diffBN = useMemo(() => new BigNumber(diff).div(metadata ? 10 ** metadata.decimals : 1), [diff, metadata]);

  const conditionalPopupClassName = popup ? 'text-xs' : 'text-sm';
  const conditionalDiffClassName = diffBN.gt(0) ? 'text-green-500' : 'text-red-700';
  const conditionalPendingClassName = pending ? 'text-yellow-600' : conditionalDiffClassName;
  const showPlus = diffBN.gt(0) ? '+' : '';

  return metadata ? (
    <div className={classNames('inline-flex flex-wrap justify-end items-baseline', className)}>
      <div className={classNames(conditionalPopupClassName, conditionalPendingClassName)}>
        {showPlus}
        <Money>{diffBN}</Money> {getAssetSymbol(metadata, true)}
      </div>

      {assetSlug && (
        <InFiat volume={diffBN.abs()} assetSlug={assetSlug}>
          {({ balance, symbol }) => (
            <div className="text-xs text-gray-500 ml-1">
              {balance}
              <span className="mr-px">{symbol}</span>
            </div>
          )}
        </InFiat>
      )}
    </div>
  ) : null;
});

export default MoneyDiffView;
