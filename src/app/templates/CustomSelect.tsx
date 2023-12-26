import React, { ComponentType, CSSProperties, useCallback } from 'react';

import classNames from 'clsx';

import { ReactComponent as OkIcon } from 'app/icons/ok.svg';

type Actions<K extends string | number> = { [key: string]: (id: K) => void };

export type OptionRenderProps<T, K extends string | number = string | number, A extends Actions<K> = {}> = {
  actions?: A;
  item: T;
  index: number;
};

type CustomSelectProps<T, K extends string | number = string | number, A extends Actions<K> = {}> = {
  activeItemId?: K;
  actions?: A;
  className?: string;
  getItemId?: (item: T) => K;
  id?: string;
  items: T[];
  maxHeight?: string;
  padding?: CSSProperties['padding'];
  autoFocus?: boolean;
  light?: boolean;
  hoverable?: boolean;
  onSelect?: (itemId: K) => void;
  OptionIcon?: ComponentType<OptionRenderProps<T, K, A>>;
  OptionContent: ComponentType<OptionRenderProps<T, K, A>>;
};

const CustomSelect = <T extends {}, K extends string | number = string | number, A extends Actions<K> = {}>(
  props: CustomSelectProps<T, K, A>
) => {
  const {
    actions,
    activeItemId,
    className,
    getItemId,
    id,
    items,
    maxHeight,
    onSelect,
    padding = '0.4rem 0.375rem 0.4rem 0.375rem',
    autoFocus = false,
    light = false,
    hoverable = true,
    OptionIcon,
    OptionContent
  } = props;

  console.log(items);

  return items.length > 0 ? (
    <div
      className={classNames('relative overflow-y-auto', 'flex flex-col text-white text-sm leading-tight', className)}
      id={id}
      style={{ maxHeight }}
    >
      {items.map((item, index) => {
        const itemId = getItemId ? getItemId(item) : index;

        return (
          <CustomSelectItem
            key={itemId}
            actions={actions}
            // active={itemId === activeItemId}
            active
            last={index === items.length - 1}
            itemId={itemId as K}
            index={index}
            item={item}
            onSelect={onSelect}
            padding={padding}
            autoFocus={autoFocus}
            light={light}
            hoverable={hoverable}
            OptionIcon={OptionIcon}
            OptionContent={OptionContent}
          />
        );
      })}
    </div>
  ) : null;
};

export default CustomSelect;

type CustomSelectItemProps<T, K extends string | number, A extends Actions<K>> = Pick<
  CustomSelectProps<T, K, A>,
  'onSelect' | 'OptionIcon' | 'OptionContent' | 'padding' | 'autoFocus' | 'light' | 'hoverable' | 'actions'
> & {
  active?: boolean;
  last?: boolean;
  itemId: K;
  index: number;
  item: T;
};

const CustomSelectItem = <T extends {}, K extends string | number, A extends Actions<K>>(
  props: CustomSelectItemProps<T, K, A>
) => {
  const {
    active,
    actions,
    itemId,
    item,
    index,
    last,
    onSelect,
    padding,
    autoFocus,
    light,
    hoverable,
    OptionIcon,
    OptionContent
  } = props;

  const handleSelect = useCallback(() => onSelect?.(itemId), [itemId, onSelect]);

  const ItemComponent = onSelect ? 'button' : 'div';

  return (
    <ItemComponent
      type="button"
      className={classNames(
        'w-full flex-shrink-0 overflow-hidden flex items-center',
        'flex items-center text-white transition ease-in-out duration-200',
        'focus:outline-none opacity-90 hover:opacity-100'
      )}
      style={{ padding }}
      autoFocus={autoFocus && active}
      onClick={handleSelect}
    >
      {OptionIcon && <OptionIcon actions={actions} item={item} index={index} />}

      <div className={classNames('w-full flex flex-col items-start', OptionIcon && 'ml-2')}>
        <OptionContent actions={actions} item={item} index={index} />
        {active && <div className="text-sm text-primary-success">Active</div>}
      </div>

      <div className="flex-1" />
    </ItemComponent>
  );
};
