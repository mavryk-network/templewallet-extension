import React, { FC, useState } from 'react';

import { ReactComponent as ChevronDown } from 'app/icons/chevron-down.svg';
import { ReactComponent as ChevronUp } from 'app/icons/chevron-up.svg';
import { useSwapParamsSelector } from 'app/store/swap/selectors';
import { T } from 'lib/i18n';

import { SwapRouteItem } from './SwapRouteItem/SwapRouteItem';

interface Props {
  className?: string;
}

export const SwapRoute: FC<Props> = ({ className }) => {
  const {
    data: { chains, input, output }
  } = useSwapParamsSelector();

  const chainsCount = chains.length;
  const dexesCount = chains.reduce((accum, chain) => accum + chain.hops.length, 0);

  const [isVisible, setIsVisible] = useState(chainsCount > 0);

  const hadleToggleVisible = () => setIsVisible(prev => !prev);

  const Chevron = isVisible ? ChevronUp : ChevronDown;

  return (
    <div className={className}>
      <p
        className="flex justify-between items-center text-base-plus text-white cursor-pointer mb-4"
        onClick={hadleToggleVisible}
      >
        <T id="swapRoute" />
        <span className="flex items-center gap-1 text-sm text-secondary-white">
          <span>
            <T id="route3ChainsDexes" substitutions={[chainsCount, dexesCount]} />
          </span>
          <span>
            <Chevron className={'w-4 h-auto stroke-3 stroke-white'} />
          </span>
        </span>
      </p>
      {isVisible && chains.length > 0 && (
        <div className="flex flex-col gap-4 mb-4">
          {chains.map((chain, index) => (
            <SwapRouteItem key={index} chain={chain} baseInput={input} baseOutput={output} />
          ))}
        </div>
      )}
    </div>
  );
};
