import { CHAINS } from '@lido-nestjs/constants';

export const JACK_TOKEN = Symbol('JACK');
export const JACK_ADDRESSES = {
  [CHAINS.Mainnet]: '0x1bb88809f12038c1742427409a23035837054071',
  [CHAINS.Goerli]: '0x0000000000000000000000000000000000000000', // looks like no such contract in use on the testnet
};
