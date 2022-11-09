import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { NodeOperatorsRegistryV2__factory } from 'contracts/generated';

import {
  NODE_OPERATORS_REGISTRY_V2_ADRESSES,
  NODE_OPERATORS_REGISTRY_V2_TOKEN,
} from './node-operators-registry.consts';

@Module({})
export class NodeOperatorsRegistryV2Module extends ContractModule {
  static module = NodeOperatorsRegistryV2Module;
  static contractFactory = NodeOperatorsRegistryV2__factory;
  static contractToken = NODE_OPERATORS_REGISTRY_V2_TOKEN;
  static defaultAddresses = NODE_OPERATORS_REGISTRY_V2_ADRESSES;
}
