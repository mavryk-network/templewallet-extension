import React, { FC, useCallback, useMemo, useState } from 'react';

import classNames from 'clsx';
import { isEqual } from 'lodash';
import { useDebounce } from 'use-debounce';

import Money from 'app/atoms/Money';
import { useTokensMetadataSelector } from 'app/store/tokens-metadata/selectors';
import { AssetIcon } from 'app/templates/AssetIcon';
import Balance from 'app/templates/Balance';
import { setTestID, setAnotherSelector } from 'lib/analytics';
import { searchAssetsWithNoMeta } from 'lib/assets/search.utils';
import { T, t } from 'lib/i18n';
import { useAssetMetadata, getAssetSymbol } from 'lib/metadata';
import { useAccount } from 'lib/temple/front';

import { AssetItemContent } from '../AssetItemContent';
import { DropdownSelect } from '../DropdownSelect/DropdownSelect';
import { InputContainer } from '../InputContainer/InputContainer';
import { SendFormSelectors } from '../SendForm/selectors';
import { IAsset } from './interfaces';
import { getSlug } from './utils';

interface AssetSelectProps {
  value: IAsset;
  assets: IAsset[];
  onChange?: (assetSlug: string) => void;
  className?: string;
  testIDs?: {
    main: string;
    searchInput: string;
  };
}

const renderOptionContent = (asset: IAsset, selected: boolean) => (
  <AssetOptionContent asset={asset} selected={selected} />
);

const AssetSelect: FC<AssetSelectProps> = ({ value, assets, onChange, className, testIDs }) => {
  const allTokensMetadata = useTokensMetadataSelector();

  const [searchString, setSearchString] = useState<string>('');
  const [searchStringDebounced] = useDebounce(searchString, 300);

  const searchItems = useCallback(
    (searchString: string) => searchAssetsWithNoMeta(searchString, assets, allTokensMetadata, getSlug),
    [assets, allTokensMetadata]
  );
  const searchedOptions = useMemo(
    () => (searchStringDebounced ? searchItems(searchStringDebounced) : assets),
    [searchItems, searchStringDebounced, assets]
  );

  const handleChange = useCallback(
    (asset: IAsset) => {
      onChange?.(getSlug(asset));
    },
    [onChange]
  );

  return (
    <InputContainer className={className} header={<AssetSelectTitle />}>
      <DropdownSelect
        DropdownFaceContent={<AssetFieldContent asset={value} />}
        testIds={{ dropdownTestId: testIDs?.main }}
        dropdownButtonClassName="p-4 bg-primary-card h-66px"
        fontContentWrapperClassname="border border-transparent rounded-xl"
        dropdownWrapperClassName="border-none rounded-2xl-plus"
        optionsListClassName="bg-primary-card"
        optionsProps={{
          options: searchedOptions,
          noItemsText: t('noAssetsFound'),
          getKey: option => getSlug(option),
          onOptionChange: handleChange,
          renderOptionContent: asset => renderOptionContent(asset, isEqual(asset, value))
        }}
      />
    </InputContainer>
  );
};

export default AssetSelect;

const AssetSelectTitle: FC = () => (
  <h2 className="leading-tight flex flex-col mb-3">
    <span className="text-base-plus text-white">
      <T id="asset" />
    </span>
  </h2>
);

const AssetFieldContent: FC<{ asset: IAsset }> = ({ asset }) => {
  const account = useAccount();
  const assetSlug = getSlug(asset);
  const metadata = useAssetMetadata(assetSlug);

  return (
    <div className="flex items-center">
      <AssetIcon assetSlug={assetSlug} className="mr-1" size={32} />

      <Balance assetSlug={assetSlug} address={account.publicKeyHash}>
        {balance => (
          <div className="flex flex-col items-start">
            <span className="text-base-plus text-white">{getAssetSymbol(metadata)}</span>
            <span className="text-sm text-secondary-white flex items-baseline">
              <Money smallFractionFont={false}>{balance}</Money>&nbsp;
              <span>{getAssetSymbol(metadata)}</span>
            </span>

            {/* <InFiat smallFractionFont={false} assetSlug={assetSlug} volume={balance}>
              {({ balance, symbol }) => (
                <div className="mt-1 text-sm text-gray-500 flex">
                  <span className="mr-1">≈</span>
                  {balance}
                  <span className="ml-1">{symbol}</span>
                </div>
              )}
            </InFiat> */}
          </div>
        )}
      </Balance>
    </div>
  );
};

const AssetOptionContent: FC<{ asset: IAsset; selected: boolean }> = ({ asset, selected }) => {
  const slug = getSlug(asset);

  return (
    <div
      className={classNames(
        'flex items-center w-full p-4 h-14',
        selected ? 'bg-gray-710' : 'bg-primary-card hover:bg-gray-710'
      )}
      {...setTestID(SendFormSelectors.assetDropDownItem)}
      {...setAnotherSelector('slug', slug)}
    >
      <AssetIcon assetSlug={slug} className="mr-2" size={32} />

      <AssetItemContent slug={slug} />
    </div>
  );
};
