import React, { Fragment, memo, useCallback, useMemo, useState } from 'react';

import classNames from 'clsx';
import InfiniteScroll from 'react-infinite-scroll-component';

import { SyncSpinner } from 'app/atoms';
import { DARK_LIGHT_THEME, DARK_THEME } from 'app/consts/appTheme';
import { ReactComponent as LayersIcon } from 'app/icons/layers.svg';
import { ManageAssetsButton } from 'app/pages/ManageAssets/ManageAssetsButton';
import { ComponentTheme } from 'app/types/appTheme.types';
import { T } from 'lib/i18n/react';
import { useAccount } from 'lib/temple/front';
import { UserHistoryItem } from 'lib/temple/history';
import { HistoryItemOpTypeEnum } from 'lib/temple/history/types';

import useHistory from '../../../lib/temple/history/hook';
import { PartnersPromotion, PartnersPromotionVariant } from '../../atoms/partners-promotion';
import {
  SearchExplorer,
  SearchExplorerClosed,
  SearchExplorerFinder,
  SearchExplorerIconBtn,
  SearchExplorerOpened
} from '../SearchExplorer';
import { SortButton, SortListItemType, SortPopup, SortPopupContent } from '../SortPopup';
import styles from './history.module.css';
import { HistoryDetailsPopup } from './HistoryDetailsPopup';
import { HistoryItem } from './HistoryItem';
// import { txMocked, StakedMock } from './mock';

const INITIAL_NUMBER = 30;
const LOAD_STEP = 30;

const cleanBtnStyles = { backgroundColor: '#202020', borderRadius: 100 };

interface Props {
  assetSlug?: string;
  searchWrapperClassname?: string;
  theme?: ComponentTheme;
}

// const userHistory = [StakedMock];

export const HistoryComponent: React.FC<Props> = memo(({ assetSlug, searchWrapperClassname, theme = DARK_THEME }) => {
  const { loading, reachedTheEnd, list: userHistory, loadMore } = useHistory(INITIAL_NUMBER, assetSlug);

  // console.log('Logging user history in the HistoryComponent:', userHistory);

  const { publicKeyHash: accountAddress } = useAccount();

  // useLoadPartnersPromo();

  // sort
  const [filterOptions, setFilterOptions] = useState<HistoryItemOpTypeEnum[]>([]);

  // Sort popup options
  // in this case we will filter history by selected option
  // the filter option array will lokk like this -> [0, 3, 5, 7] etc.
  // it will filter history based on type
  const memoizedSortAssetsOptions: SortListItemType[] = useMemo(
    () => [
      {
        id: HistoryItemOpTypeEnum.Delegation.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Delegation),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Delegation);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Delegation)
            : [...filterOptions, HistoryItemOpTypeEnum.Delegation];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'delegation'
      },
      {
        id: HistoryItemOpTypeEnum.Interaction.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Interaction),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Interaction);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Interaction)
            : [...filterOptions, HistoryItemOpTypeEnum.Interaction];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'interaction'
      },
      {
        id: HistoryItemOpTypeEnum.Origination.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Origination),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Origination);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Origination)
            : [...filterOptions, HistoryItemOpTypeEnum.Origination];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'origination'
      },
      {
        id: HistoryItemOpTypeEnum.Reveal.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Reveal),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Reveal);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Reveal)
            : [...filterOptions, HistoryItemOpTypeEnum.Reveal];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'reveal'
      },
      {
        id: HistoryItemOpTypeEnum.Swap.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Swap),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Swap);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Swap)
            : [...filterOptions, HistoryItemOpTypeEnum.Swap];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'swap'
      },
      {
        id: HistoryItemOpTypeEnum.TransferFrom.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.TransferFrom),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.TransferFrom);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.TransferFrom)
            : [...filterOptions, HistoryItemOpTypeEnum.TransferFrom];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'transferFrom'
      },
      {
        id: HistoryItemOpTypeEnum.TransferTo.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.TransferTo),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.TransferTo);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.TransferTo)
            : [...filterOptions, HistoryItemOpTypeEnum.TransferTo];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'transferTo'
      },
      {
        id: HistoryItemOpTypeEnum.Other.toString(),
        selected: filterOptions.includes(HistoryItemOpTypeEnum.Other),
        onClick: () => {
          const isSelected = filterOptions.includes(HistoryItemOpTypeEnum.Other);
          const newFllteredOptions = isSelected
            ? filterOptions.filter(op => op !== HistoryItemOpTypeEnum.Other)
            : [...filterOptions, HistoryItemOpTypeEnum.Other];
          setFilterOptions(newFllteredOptions);
        },

        nameI18nKey: 'other'
      }
    ],
    [filterOptions]
  );

  // search
  const [searchValue, setSearchValue] = useState('');
  // const [searchFocused, setSearchFocused] = useState(false);

  // popup
  const [isOpen, setIsOpen] = useState(false);
  const [activeHistoryItem, setActiveHistoryItem] = useState<UserHistoryItem | null>(null);

  const filteredBySearchHistory = useMemo(
    () => (userHistory ? userHistory.filter(op => op.hash.includes(searchValue)) : []),
    [searchValue, userHistory]
  );

  const filteredHistory = filterTransactionHistory(filteredBySearchHistory, filterOptions);

  const handleRequestClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleItemClick = useCallback(
    (hash: string) => {
      setIsOpen(true);

      setActiveHistoryItem(filteredHistory.find(item => item.hash === hash) ?? null);
    },
    [filteredHistory]
  );

  const retryInitialLoad = () => loadMore(INITIAL_NUMBER);
  const loadMoreActivities = () => loadMore(LOAD_STEP);

  const loadNext = userHistory.length === 0 ? retryInitialLoad : loadMoreActivities;

  const onScroll = loading || reachedTheEnd ? undefined : buildOnScroll(loadNext);

  const searchbtnStyles = useMemo(() => (theme === DARK_LIGHT_THEME ? cleanBtnStyles : {}), [theme]);
  return (
    <div className="w-full max-w-sm mx-auto h-full relative">
      <div className={classNames('mt-3 w-full mx-4')}>
        <SearchExplorer>
          <>
            <SearchExplorerOpened>
              <div className={classNames('w-full flex justify-end', styles.searchWrapper, searchWrapperClassname)}>
                <SearchExplorerFinder
                  value={searchValue}
                  onValueChange={setSearchValue}
                  containerClassName="mr-2"
                  className={classNames(theme === DARK_LIGHT_THEME && styles.inputBgDarkLight)}
                  cleanButtonStyle={searchbtnStyles}
                />
              </div>
            </SearchExplorerOpened>
            <SearchExplorerClosed>
              <div
                className={classNames('flex justify-end items-center', styles.searchWrapper, searchWrapperClassname)}
              >
                <div className={classNames(loading && 'opacity-50 pointer-events-none')}>
                  <SearchExplorerIconBtn />
                </div>

                <SortPopup>
                  <SortButton className={classNames(loading && 'opacity-50 pointer-events-none')} />
                  <SortPopupContent items={memoizedSortAssetsOptions} />
                </SortPopup>

                <ManageAssetsButton />
              </div>
            </SearchExplorerClosed>
          </>
        </SearchExplorer>
      </div>

      {!filteredHistory.length && !loading ? (
        <div className={classNames('h-full my-auto py-16', 'flex flex-col items-center justify-center', 'text-white')}>
          <LayersIcon className="w-16 h-auto mb-2 stroke-current" />

          <h3 className="text-base-plus text-white text-center" style={{ maxWidth: '20rem' }}>
            <T id="noOperationsFound" />
          </h3>
        </div>
      ) : (
        <div className={classNames('my-3 flex flex-col')}>
          <InfiniteScroll
            dataLength={userHistory.length}
            hasMore={reachedTheEnd === false}
            next={loadNext}
            loader={loading && <SyncSpinner className="mt-4" />}
            onScroll={onScroll}
          >
            {filteredHistory.map((historyItem, index) => (
              <Fragment key={historyItem.hash}>
                {/* I want to render the list of userHistory here in flex box items */}
                <HistoryItem
                  address={accountAddress}
                  historyItem={historyItem}
                  slug={assetSlug}
                  handleItemClick={handleItemClick}
                />
                {index === 0 && <PartnersPromotion variant={PartnersPromotionVariant.Image} />}
              </Fragment>
            ))}
          </InfiniteScroll>
        </div>
      )}

      <HistoryDetailsPopup isOpen={isOpen} onRequestClose={handleRequestClose} historyItem={activeHistoryItem} />
    </div>
  );
});

/**
 * Build onscroll listener to trigger next loading, when fetching data resulted in error.
 * `InfiniteScroll.props.next` won't be triggered in this case.
 */
const buildOnScroll =
  (next: EmptyFn) =>
  ({ target }: { target: EventTarget | null }) => {
    const elem: HTMLElement =
      target instanceof Document ? (target.scrollingElement! as HTMLElement) : (target as HTMLElement);
    const atBottom = 0 === elem.offsetHeight - elem.clientHeight - elem.scrollTop;
    if (atBottom) next();
  };

const filterTransactionHistory = (history: UserHistoryItem[], options: HistoryItemOpTypeEnum[]) => {
  return !options.length ? history : history.filter(op => options.includes(op.type));
};