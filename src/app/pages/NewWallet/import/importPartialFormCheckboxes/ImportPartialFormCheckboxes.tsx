import React, { FC } from 'react';

import { Control, Controller, FieldError, NestDataObject } from 'react-hook-form';

import { FormCheckbox } from 'app/atoms';
import { T, t } from 'lib/i18n';

import { setWalletPasswordSelectors } from '../../setWalletPassword/SetWalletPassword.selectors';
import { FormData } from '../useCreareOrRestorePassword';

type ImportPartialFormCheckboxesProps = {
  control: Control<FormData>;
  register: (...args: any) => any;
  errors: NestDataObject<FormData, FieldError>;
};

export const ImportPartialFormCheckboxes: FC<ImportPartialFormCheckboxesProps> = ({ control, register, errors }) => {
  return (
    <>
      <Controller
        control={control}
        name="skipOnboarding"
        as={p => <FormCheckbox {...p} testID={setWalletPasswordSelectors.skipOnboardingCheckbox} />}
        label={t('skipOnboarding')}
        testID={setWalletPasswordSelectors.skipOnboardingCheckbox}
      />
      <Controller
        control={control}
        name="analytics"
        as={FormCheckbox}
        label={
          <T
            id="analyticsInputDescription"
            substitutions={[
              <a
                href="https://templewallet.com/analytics-collecting"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-secondary text-accent-blue"
              >
                <T id="analyticsCollecting" key="analyticsLink" />
              </a>
            ]}
          />
        }
        testID={setWalletPasswordSelectors.analyticsCheckBox}
      />

      {/* <Controller
        control={control}
        name="viewAds"
        as={FormCheckbox}
        label={<T id="viewAdsDescription" />}
        testID={setWalletPasswordSelectors.viewAdsCheckBox}
      /> */}

      <FormCheckbox
        ref={register({
          validate: (val: unknown) => val || t('confirmTermsError')
        })}
        errorCaption={errors.termsAccepted?.message}
        name="termsAccepted"
        testID={setWalletPasswordSelectors.acceptTermsCheckbox}
        label={
          <T
            id="acceptTermsInputDescription"
            substitutions={[
              <a
                href="https://templewallet.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-secondary text-accent-blue"
              >
                <T id="termsOfUsage" key="termsLink" />
              </a>,
              <a
                href="https://templewallet.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-secondary text-accent-blue"
              >
                <T id="privacyPolicy" key="privacyPolicyLink" />
              </a>
            ]}
          />
        }
        containerClassName="flex-grow"
      />
    </>
  );
};