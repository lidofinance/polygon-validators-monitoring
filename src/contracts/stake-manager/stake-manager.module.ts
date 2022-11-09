import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { StakeManager__factory } from 'contracts/generated';

import {
  STAKE_MANAGER_ADDRESSES,
  STAKE_MANAGER_TOKEN,
} from './stake-manager.consts';

@Module({})
export class StakeManagerModule extends ContractModule {
  static module = StakeManagerModule;
  static contractFactory = StakeManager__factory;
  static contractToken = STAKE_MANAGER_TOKEN;
  static defaultAddresses = STAKE_MANAGER_ADDRESSES;
}
