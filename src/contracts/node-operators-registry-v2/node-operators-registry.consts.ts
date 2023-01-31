import { CHAINS } from '@lido-nestjs/constants';

export const NODE_OPERATORS_REGISTRY_V2_TOKEN = Symbol(
  'NODE_OPERATORS_REGISTRY_V2',
);
export const NODE_OPERATORS_REGISTRY_V2_ADRESSES = {
  [CHAINS.Mainnet]: '0x216B8b78e0632138dc38907dd089aAB601ED6EDC',
  [CHAINS.Goerli]: '0xbba726ffc99828c7eaa1e4fE1Ed9115f178cD69B',
};
