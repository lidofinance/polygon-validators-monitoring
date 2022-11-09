import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { Jack__factory } from 'contracts/generated';

import { JACK_ADDRESSES, JACK_TOKEN } from './jack.consts';

@Module({})
export class JackModule extends ContractModule {
  static module = JackModule;
  static contractFactory = Jack__factory;
  static contractToken = JACK_TOKEN;
  static defaultAddresses = JACK_ADDRESSES;
}
