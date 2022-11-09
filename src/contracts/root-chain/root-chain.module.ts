import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { RootChain__factory } from 'contracts/generated';

import { ROOT_CHAIN_ADDRESSES, ROOT_CHAIN_TOKEN } from './root-chain.consts';

@Module({})
export class RootChainModule extends ContractModule {
  static module = RootChainModule;
  static contractFactory = RootChain__factory;
  static contractToken = ROOT_CHAIN_TOKEN;
  static defaultAddresses = ROOT_CHAIN_ADDRESSES;
}
