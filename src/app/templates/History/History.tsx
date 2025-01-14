import React, { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';

import classNames from 'clsx';
import _ from 'lodash';
import InfiniteScroll from 'react-infinite-scroll-component';

import { SyncSpinner } from 'app/atoms';
import { DARK_LIGHT_THEME, DARK_THEME } from 'app/consts/appTheme';
import { useAppEnv } from 'app/env';
import { ReactComponent as LayersIcon } from 'app/icons/layers.svg';
import { ManageAssetsButton } from 'app/pages/ManageAssets/ManageAssetsButton';
import { ComponentTheme } from 'app/types/appTheme.types';
import { T } from 'lib/i18n/react';
import { useAccount, useChainId } from 'lib/temple/front';
import { UserHistoryItem } from 'lib/temple/history';
import { fetchUserOperationByHash } from 'lib/temple/history/fetch';
import { createOpParams } from 'lib/temple/history/filterParams';
import { HistoryItemOpTypeEnum } from 'lib/temple/history/types';
import { isKnownChainId } from 'lib/temple/types';

import useHistory from '../../../lib/temple/history/hook';
import {
  SearchExplorer,
  SearchExplorerClosed,
  SearchExplorerFinder,
  SearchExplorerIconBtn,
  SearchExplorerOpened,
  SearchExplorerCloseBtn
} from '../SearchExplorer';
import { SortButton, SortListItemType, SortPopup, SortPopupContent } from '../SortPopup';

import styles from './history.module.css';
import { HistoryDetailsPopup } from './HistoryDetailsPopup';
import { HistoryItem } from './HistoryItem';

const INITIAL_NUMBER = 30;
const LOAD_STEP = 30;

const cleanBtnStyles = { backgroundColor: '#202020', borderRadius: 100 };

interface Props {
  assetSlug?: string;
  searchWrapperClassname?: string;
  theme?: ComponentTheme;
  showRestOfSearchSectionOptions?: boolean;
  lastItemDividerClassName?: string;
  scrollableTarget?: string;
}

export const HistoryComponent: React.FC<Props> = memo(
  ({
    assetSlug,
    searchWrapperClassname,
    theme = DARK_THEME,
    showRestOfSearchSectionOptions = true,
    lastItemDividerClassName = 'my-6',
    scrollableTarget
  }) => {
    const { popup } = useAppEnv();
    const { publicKeyHash: accountAddress } = useAccount();
    const chainId = useChainId();

    // factory method to create params object for api calls
    const paramsRecord = useMemo(() => createOpParams(accountAddress), [accountAddress]);
    // sort [0, 1, 2]
    const [filterOptions, setFilterOptions] = useState<HistoryItemOpTypeEnum[]>([]);

    const historyFilterParams = useMemo(
      () =>
        filterOptions.reduce((acc, item) => {
          acc = { ...acc, ...paramsRecord[item] };
          return acc;
        }, {}),
      [filterOptions, paramsRecord]
    );

    console.log(historyFilterParams, 'historyFilterParams');

    // Sort popup options (used only for ui sort)
    // in this case we will filter history by selected option
    // the filter option array looks like this -> [0, 3, 5, 7] etc.
    // it filters history based on type

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

    const {
      loading: userHistoryLoading,
      reachedTheEnd,
      list: userHistory,
      loadMore
    } = useHistory(INITIAL_NUMBER, assetSlug, historyFilterParams);

    // useLoadPartnersPromo();

    const [filteredHistory, setFilteredHistory] = useState<UserHistoryItem[]>([]);
    const [isSearchingByHash, setIsSearchingByHash] = useState(false);

    const loading = userHistoryLoading || isSearchingByHash;

    // debounced search ****************************************************
    const [searchValue, setSearchValue] = useState('');
    // using debounce set new name after 450 ms to filter estates data
    const [searchValueForFilter, setSearchValueForFilter] = useState('');

    const sendRequest = useCallback((hash: string) => {
      setSearchValueForFilter(hash);
    }, []);

    const clearInput = useCallback(() => {
      setSearchValue('');
      sendRequest('');
    }, [sendRequest]);

    // debounced diltering when srching estate by name
    const handleDebouncedSearch = useMemo(() => {
      return _.debounce(sendRequest, 450);
    }, [sendRequest]);

    useEffect(() => {
      return () => {
        handleDebouncedSearch.cancel();
      };
    }, [handleDebouncedSearch]);

    const onChange = useCallback(
      (value: string) => {
        // state is updated on every value change, so input will work
        setSearchValue(value);

        // call debounced request here
        handleDebouncedSearch(value);
      },
      [handleDebouncedSearch]
    );

    // end of debounced search ****************************************************

    // fetch single user operation by entered search value
    useEffect(() => {
      async function fetchOperationData() {
        setIsSearchingByHash(true);
        if (chainId && isKnownChainId(chainId) && searchValueForFilter !== '') {
          try {
            const arr = await fetchUserOperationByHash(chainId, accountAddress, searchValueForFilter);
            setIsSearchingByHash(false);

            setFilteredHistory(arr);
          } catch (e) {
            console.log(e);
            setFilteredHistory([]);
            setIsSearchingByHash(false);
          }
        } else {
          setIsSearchingByHash(false);
        }
      }

      fetchOperationData();
    }, [searchValueForFilter, chainId, accountAddress]);

    // popup states
    const [isOpen, setIsOpen] = useState(false);
    const [activeHistoryItem, setActiveHistoryItem] = useState<UserHistoryItem | null>(null);

    const handleRequestClose = useCallback(() => {
      setIsOpen(false);
    }, []);

    const handleItemClick = useCallback(
      (hash: string) => {
        setIsOpen(true);
        const activeHistory = searchValue.length > 0 ? filteredHistory : userHistory;
        setActiveHistoryItem(activeHistory.find(item => item.hash === hash) ?? null);
      },
      [filteredHistory, searchValue.length, userHistory]
    );

    const retryInitialLoad = () => loadMore(INITIAL_NUMBER);
    const loadMoreActivities = () => loadMore(LOAD_STEP);

    // check for searchValue to not load history if search is active
    const loadNext =
      searchValue.length !== 0 ? () => {} : userHistory.length === 0 ? retryInitialLoad : loadMoreActivities;

    const onScroll = loading || reachedTheEnd ? undefined : buildOnScroll(loadNext);

    const searchbtnStyles = useMemo(() => (theme === DARK_LIGHT_THEME ? cleanBtnStyles : {}), [theme]);

    const historyToshow = useMemo(
      () => (searchValueForFilter.length !== 0 ? filteredHistory : userHistory),
      [filteredHistory, searchValueForFilter.length, userHistory]
    );

    return (
      <div className={classNames('w-full mx-auto h-full relative', popup ? 'max-w-sm' : 'max-w-screen-xxs')}>
        <div className={classNames('mt-3 w-full mx-4')}>
          <SearchExplorer>
            <>
              <SearchExplorerOpened>
                <div
                  className={classNames(
                    'w-full flex justify-end',
                    popup && 'pr-12px pl-4',
                    styles.searchWrapper,
                    searchWrapperClassname
                  )}
                >
                  <SearchExplorerFinder
                    value={searchValue}
                    onValueChange={onChange}
                    cleanButtonCb={clearInput}
                    containerClassName="mr-2"
                    className={classNames(theme === DARK_LIGHT_THEME && styles.inputBgDarkLight)}
                    cleanButtonStyle={searchbtnStyles}
                  />
                  <SearchExplorerCloseBtn />
                </div>
              </SearchExplorerOpened>
              <SearchExplorerClosed>
                <div
                  className={classNames(
                    'flex justify-end items-center pl-4',
                    popup && 'pr-12px',
                    styles.searchWrapper,
                    searchWrapperClassname
                  )}
                >
                  <div className={classNames(loading && 'opacity-50 pointer-events-none')}>
                    <SearchExplorerIconBtn />
                  </div>

                  <SortPopup>
                    <SortButton className={classNames(loading && 'opacity-50 pointer-events-none')} />
                    <SortPopupContent items={memoizedSortAssetsOptions} title={<T id="filterBy" />} />
                  </SortPopup>

                  {showRestOfSearchSectionOptions && <ManageAssetsButton />}
                </div>
              </SearchExplorerClosed>
            </>
          </SearchExplorer>
        </div>

        {!historyToshow.length && !loading ? (
          <div
            className={classNames('h-full my-auto py-16', 'flex flex-col items-center justify-center', 'text-white')}
          >
            <LayersIcon className="w-16 h-auto mb-2 stroke-current" />

            <h3 className="text-base-plus text-white text-center" style={{ maxWidth: '20rem' }}>
              <T id="noTransactionsFound" />
            </h3>
          </div>
        ) : (
          <div className={classNames('flex flex-col')}>
            <InfiniteScroll
              dataLength={userHistory.length}
              hasMore={reachedTheEnd === false}
              next={loadNext}
              loader={loading && <SyncSpinner className="mt-4" />}
              onScroll={onScroll}
              scrollableTarget={scrollableTarget}
              endMessage={
                <div className={classNames('mx-auto text-center text-sm text-white', lastItemDividerClassName)}>
                  <T id="txHistoryendMsg" />
                </div>
              }
            >
              {historyToshow.map(historyItem => (
                <Fragment key={historyItem.hash}>
                  <HistoryItem
                    address={accountAddress}
                    historyItem={historyItem}
                    slug={assetSlug}
                    handleItemClick={handleItemClick}
                    last={false}
                  />
                </Fragment>
              ))}
            </InfiniteScroll>
          </div>
        )}

        <HistoryDetailsPopup isOpen={isOpen} onRequestClose={handleRequestClose} historyItem={activeHistoryItem} />
      </div>
    );
  }
);

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
