import { BigNumber } from '@ethersproject/bignumber';

export interface SubmitCheckpointArgs {
  data: string;
  sigs: Array<[BigNumber, BigNumber, BigNumber]>;
}
