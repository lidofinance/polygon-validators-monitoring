import { BigNumber } from '@ethersproject/bignumber';

export class BNTransformer {
  to(data: BigNumber): string {
    return data.toString();
  }

  from(data: string): BigNumber {
    return BigNumber.from(data);
  }
}
