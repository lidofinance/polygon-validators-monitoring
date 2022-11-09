import { CHAINS } from '@lido-nestjs/constants';

export const STAKING_NFT_TOKEN = Symbol('STAKING_NFT');
export const STAKING_NFT_ADDRESSES = {
  [CHAINS.Mainnet]: '0x47Cbe25BbDB40a774cC37E1dA92d10C2C7Ec897F',
  [CHAINS.Goerli]: '0x532c7020E0F3666f9440B8B9d899A9763BCc5dB7',
};
