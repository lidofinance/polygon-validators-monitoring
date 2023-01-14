import { CallOverrides } from 'ethers';

import { NodeOperatorsRegistryV1 } from 'contracts/generated';

export async function isPoLidoV1(
  self: NodeOperatorsRegistryV1,
  opts: CallOverrides,
): Promise<boolean> {
  // TODO change to blockTag check after V2 deployment
  try {
    const v = await self.version(opts);
    if (!v) {
      // assume empty as early v1
      return true;
    }
    // it's 1.0.0 and "1.0.1" for later versions 🤯
    return v.replace(/("|')/, '').startsWith('1.');
  } catch (e) {
    const err = e as Error;
    err.message = `Failed to check PoLido version: ${err.message}`;
    throw err;
  }
}
