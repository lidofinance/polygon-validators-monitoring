import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { StakingNft__factory } from '../generated';
import { STAKING_NFT_ADDRESSES, STAKING_NFT_TOKEN } from './staking-nft.consts';

@Module({})
export class StakingNftModule extends ContractModule {
  static module = StakingNftModule;
  static contractFactory = StakingNft__factory;
  static contractToken = STAKING_NFT_TOKEN;
  static defaultAddresses = STAKING_NFT_ADDRESSES;
}
