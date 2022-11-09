import { Logger } from '@ethersproject/logger';
import { LoggerService as Log } from '@nestjs/common';
import { CallOverrides } from 'ethers';

import { NodeOperatorsRegistryV1 } from 'contracts/generated';

export async function isPoLidoV1(
  self: NodeOperatorsRegistryV1,
  opts: CallOverrides,
  log: Log,
): Promise<boolean> {
  // TODO change to blockTag check after V2 deployment
  try {
    await self.version(opts);
  } catch (error) {
    if (error.code === Logger.errors.CALL_EXCEPTION) {
      // TODO remove log statement after transition
      log.warn('PoLido implementation switched to V2');
      return false; // method not found
    }
    throw error;
  }

  return true;
}
