import { CHAINS } from '@lido-nestjs/constants';

export const STAKING_INFO_TOKEN = Symbol('STAKING_INFO');
export const STAKING_INFO_ADDRESSES = {
  [CHAINS.Mainnet]: '0xa59C847Bd5aC0172Ff4FE912C5d29E5A71A7512B',
  [CHAINS.Goerli]: '0x29C40836C17f22d16a7fE953Fb25DA670C96d69E',
};
