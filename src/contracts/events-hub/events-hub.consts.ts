import { CHAINS } from '@lido-nestjs/constants';

export const EVENTS_HUB_TOKEN = Symbol('EVENTS_HUB');

// since the contract address is not published we can retrieve it from the
// Registry contract by request to contractMap method with an argument
// keccak256('eventsHub')
export const EVENTS_HUB_ADDRESSES = {
  [CHAINS.Mainnet]: '0x6dF5CB08d3f0193C768C8A01f42ac4424DC5086b',
  [CHAINS.Goerli]: '0x158d5fa3Ef8e4dDA8a5367deCF76b94E7efFCe95',
};
