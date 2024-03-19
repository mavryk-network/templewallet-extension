export enum DappEnum {
  Exchanges = 'Exchanges',
  Marketplaces = 'Marketplaces',
  Games = 'Games',
  DeFi = 'DeFi',
  NFTs = 'NFTs',
  Other = 'Other'
}

export interface CustomDAppInfo {
  name: string;
  dappUrl: string;
  type: DappEnum;
  logo: string;
  slug: string;
  categories: DappEnum[];
}

export interface CustomDAppsInfo {
  dApps: CustomDAppInfo[];
}
