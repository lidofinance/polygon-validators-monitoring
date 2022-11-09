import { CHAINS } from '@lido-nestjs/constants';

export const STAKE_MANAGER_TOKEN = Symbol('STAKE_MANAGER');
export const STAKE_MANAGER_ADDRESSES = {
  [CHAINS.Mainnet]: '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908',
  [CHAINS.Goerli]: '0x00200eA4Ee292E253E6Ca07dBA5EdC07c8Aa37A3',
};
