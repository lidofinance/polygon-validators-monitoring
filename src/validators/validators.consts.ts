import { CHAINS } from '@lido-nestjs/constants';

export enum Status {
  Inactive = 0,
  Active,
  Locked,
  Unstaked,
}

export const ACTIVE_SET_LIMIT = 105;

export const POLIDO_V2_BLOCK = {
  [CHAINS.Mainnet]: 16525714,
  [CHAINS.Goerli]: 8408350, // just the one close enough to mainnet one's timestamp
};
