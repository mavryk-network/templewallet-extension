import React, { FC, ReactNode, useCallback, useState } from 'react';

import clsx from 'clsx';

import { FormCheckbox } from 'app/atoms';
import { ReactComponent as ArrowIcon } from 'app/icons/chevron-down.svg';
import { ReactComponent as MinusIcon } from 'app/icons/negative.svg';
import { t } from 'lib/i18n';

export type CounterSelectOptionType = {
  checked: boolean;
  type: string;
  content: ReactNode;
  handleChange?: (checked: boolean) => void;
};

export type CounterSelectProps = {
  selectedCount: number;
  unselectAll: () => void;
  options: CounterSelectOptionType[];
};

export const CounterSelect: FC<CounterSelectProps> = ({ selectedCount, unselectAll, options }) => {
  const [opened, setOpened] = useState(false);

  const toggleOpened = useCallback(() => {
    setOpened(!opened);
  }, [opened]);

  return (
    <section className="relative">
      <CounterSelectOptionFace
        count={selectedCount}
        unselectAll={unselectAll}
        toggleOpened={toggleOpened}
        opened={opened}
      />
      {opened && (
        <div className="fixed z-10">
          <CounterSelectContent options={options} />
        </div>
      )}
    </section>
  );
};

type CounterSelectOptionFaceProps = {
  count: number;
  opened: boolean;
  unselectAll: () => void;
  toggleOpened: () => void;
};

const CounterSelectOptionFace: FC<CounterSelectOptionFaceProps> = ({ count, unselectAll, opened, toggleOpened }) => {
  const handleCheckBoxChange = useCallback(
    (checked: boolean) => {
      if (!checked) {
        unselectAll();
      }
    },
    [unselectAll]
  );

  return (
    <section className="p-2 flex items-center gap-2 bg-primary-card rounded-md">
      <FormCheckbox
        checked={count > 0}
        onChange={handleCheckBoxChange}
        IconFromProps={MinusIcon}
        iconClassName="h-4/6 w-4/6 stroke-accent-blue pointer-events-none"
        labelClassName={clsx(count === 0 && 'pointer-events-none opacity-75', 'py-0 bg-primary-card')}
      />
      <div className="flex items-center gap-2 cursor-pointer" onClick={toggleOpened}>
        <p className="text-white text-sm">{t('selectedCount', [`${count}`])}</p>
        <ArrowIcon
          className={clsx(
            'w-6 h-auto stroke-white stroke-2 transition ease-in-out duration-200 cursor-pointer',
            opened && 'transform rotate-180'
          )}
        />
      </div>
    </section>
  );
};

type CounterSelectContentProps = {
  options: CounterSelectOptionType[];
};

const CounterSelectContent: FC<CounterSelectContentProps> = ({ options }) => {
  return (
    <section className="flex flex-col bg-primary-card rounded-2xl overflow-hidden animate-drop">
      {options.map(option => (
        <CounterSelectOption key={option.type} {...option} />
      ))}
    </section>
  );
};

const CounterSelectOption: FC<CounterSelectOptionType> = ({ checked, handleChange, content }) => {
  const handleOptionChange = useCallback(
    (checked: boolean) => {
      handleChange?.(checked);
    },
    [handleChange]
  );

  return (
    <div className="bg-primary-card">
      <FormCheckbox
        checked={checked}
        onChange={handleOptionChange}
        className="bg-primary-card"
        labelClassName="py-4 px-2 bg-primary-card hover:bg-primary-card-hover w-full"
        label={<div className="text-white text-sm">{content}</div>}
      />
    </div>
  );
};
