import React, { FC, FormEventHandler, useCallback, useEffect, useMemo, useRef } from 'react';

import queryString from 'query-string';

import { FormField, HashChip } from 'app/atoms';
import { ACCOUNT_NAME_PATTERN } from 'app/defaults';
import PageLayout from 'app/layouts/PageLayout';
import { ButtonRounded } from 'app/molecules/ButtonRounded';
import { useFormAnalytics } from 'lib/analytics';
import { T, t } from 'lib/i18n';
import { useAccount, useTempleClient } from 'lib/temple/front';
import { useAlert } from 'lib/ui';
import { goBack } from 'lib/woozie';

import { EditableTitleSelectors } from './editAccount.selectors';

export type EditAccountProps = {
  accHash?: string | null;
  accName?: string | null;
};

export const EditAccount: FC<EditAccountProps> = ({ accHash, accName }) => {
  const { editAccountName } = useTempleClient();
  const account = useAccount();
  const customAlert = useAlert();
  const formAnalytics = useFormAnalytics('ChangeAccountName');

  const editAccNameFieldRef = useRef<HTMLInputElement>(null);
  const accNamePrevRef = useRef<string>();

  const accountHash = useMemo(() => accHash ?? account.publicKeyHash, [accHash, account.publicKeyHash]);
  const accountName = useMemo(
    () => (accName ? Object.keys(queryString.parse(accName))[0] : account.name),
    [accName, account.name]
  );

  useEffect(() => {
    accNamePrevRef.current = accountName;
  }, [accountName]);

  const autoCancelTimeoutRef = useRef<number>();

  useEffect(
    () => () => {
      clearTimeout(autoCancelTimeoutRef.current);
    },
    []
  );

  const handleEditSubmit = useCallback<FormEventHandler>(
    evt => {
      evt.preventDefault();

      (async () => {
        formAnalytics.trackSubmit();
        try {
          const newName = editAccNameFieldRef.current?.value;
          if (newName && newName !== accountName) {
            await editAccountName(accountHash, newName);
          }

          formAnalytics.trackSubmitSuccess();

          goBack();
        } catch (err: any) {
          formAnalytics.trackSubmitFail();

          console.error(err);

          await customAlert({
            title: t('errorChangingAccountName'),
            children: err.message
          });
        }
      })();
    },
    [accountName, editAccountName, accountHash, customAlert, formAnalytics]
  );

  const handleEditFieldFocus = useCallback(() => {
    clearTimeout(autoCancelTimeoutRef.current);
  }, []);

  return (
    <PageLayout
      pageTitle={
        <>
          <T id="editAccount" />
        </>
      }
      isTopbarVisible={false}
    >
      <div className="w-full max-w-sm mx-auto h-full flex flex-col justify-start pb-8">
        <div className="flex flex-col gap-1 mb-4">
          <div className="text-primary-white text-base-plus">
            <T id="publicAddress" />:
          </div>
          <HashChip hash={accountHash} small trim={false} />
        </div>
        <form className="flex flex-col items-center flex-1 justify-between" onSubmit={handleEditSubmit}>
          <FormField
            ref={editAccNameFieldRef}
            name="name"
            defaultValue={accountName}
            maxLength={16}
            label={t('accountName')}
            placeholder={t('enterAccountName')}
            pattern={ACCOUNT_NAME_PATTERN.toString().slice(1, -1)}
            title={t('accountNameInputTitle')}
            spellCheck={false}
            onFocus={handleEditFieldFocus}
          />

          <ButtonRounded size="big" className="w-full capitalize" testID={EditableTitleSelectors.saveButton}>
            <T id="save" />
          </ButtonRounded>
        </form>
      </div>
    </PageLayout>
  );
};
