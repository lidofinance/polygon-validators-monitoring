import { CHAINS } from '@lido-nestjs/constants';

export const ROOT_CHAIN_TOKEN = Symbol('ROOT_CHAIN');
export const ROOT_CHAIN_ADDRESSES = {
  [CHAINS.Mainnet]: '0x86E4Dc95c7FBdBf52e33D563BbDB00823894C287',
  [CHAINS.Goerli]: '0x2890bA17EfE978480615e330ecB65333b880928e',
};
export const MAX_DEPOSITS = 10_000; // internal constant MAX_DEPOSITS
