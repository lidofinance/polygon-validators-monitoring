import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { EVENTS_HUB_ADDRESSES, EVENTS_HUB_TOKEN } from './events-hub.consts';
import { EventsHub__factory } from '../generated';

@Module({})
export class EventsHubModule extends ContractModule {
  static module = EventsHubModule;
  static contractFactory = EventsHub__factory;
  static contractToken = EVENTS_HUB_TOKEN;
  static defaultAddresses = EVENTS_HUB_ADDRESSES;
}
