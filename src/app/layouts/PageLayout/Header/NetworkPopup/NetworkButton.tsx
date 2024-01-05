import React, { FC } from 'react';

import classNames from 'clsx';

import { ReactComponent as EnabledNetworkIcon } from 'app/icons/connect-green.svg';
import { ReactComponent as DisabledNetworkIcon } from 'app/icons/connect-grey.svg';

export type NetworkButtonProps = {
  enabled: boolean;
  className?: string;
  onClick: () => void;
};

export const NetworkButton: FC<NetworkButtonProps> = ({ enabled, className, onClick }) => {
  const Icon = enabled ? EnabledNetworkIcon : DisabledNetworkIcon;

  return <Icon className={classNames('w-6 h-6 cursor-pointer', className)} onClick={onClick} />;
};