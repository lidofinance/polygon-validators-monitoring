import { ContractModule } from '@lido-nestjs/contracts';
import { Module } from '@nestjs/common';

import { NodeOperatorsRegistryV1__factory } from 'contracts/generated';

import {
  NODE_OPERATORS_REGISTRY_V1_ADRESSES,
  NODE_OPERATORS_REGISTRY_V1_TOKEN,
} from './node-operators-registry.consts';

@Module({})
export class NodeOperatorsRegistryV1Module extends ContractModule {
  static module = NodeOperatorsRegistryV1Module;
  static contractFactory = NodeOperatorsRegistryV1__factory;
  static contractToken = NODE_OPERATORS_REGISTRY_V1_TOKEN;
  static defaultAddresses = NODE_OPERATORS_REGISTRY_V1_ADRESSES;
}
