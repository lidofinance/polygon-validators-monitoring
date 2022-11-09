import { CHAINS } from '@lido-nestjs/constants';
import { SimpleFallbackJsonRpcBatchProvider } from '@lido-nestjs/execution';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProviderService {
  constructor(
    protected readonly provider: SimpleFallbackJsonRpcBatchProvider,
  ) {}

  public async getNetworkName(): Promise<string> {
    const network = await this.provider.getNetwork();
    const name = CHAINS[network.chainId]?.toLocaleLowerCase();
    return name || network.name;
  }
}
