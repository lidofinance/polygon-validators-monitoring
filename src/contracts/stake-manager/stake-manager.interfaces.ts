// TODO: check if there is the better way to extract types from the contract

import { BigNumber } from '@ethersproject/bignumber';

// from validators contract method
export type ValidatorInfo = {
  amount: BigNumber;
  reward: BigNumber;
  activationEpoch: BigNumber;
  deactivationEpoch: BigNumber;
  jailTime: BigNumber;
  signer: string;
  contractAddress: string;
  status: number;
  commissionRate: BigNumber;
  lastCommissionUpdate: BigNumber;
  delegatorsReward: BigNumber;
  delegatedAmount: BigNumber;
  initialRewardPerStake: BigNumber;
};
