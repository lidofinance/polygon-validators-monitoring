import { CallOverrides } from 'ethers';

import { NodeOperatorsRegistryV1 } from 'contracts/generated';

export async function isPoLidoV1(
  self: NodeOperatorsRegistryV1,
  opts: CallOverrides,
): Promise<boolean> {
  // TODO change to blockTag check after V2 deployment
  return (await self.version(opts)).startsWith('1.');
}
