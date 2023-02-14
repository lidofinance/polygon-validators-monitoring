import { BigNumber } from '@ethersproject/bignumber';
import { Column, Entity, JoinTable, OneToMany } from 'typeorm';

import { Duty } from './duty.entity';
import { Reward } from './reward.entity';
import { BNTransformer } from './utils';

@Entity('checkpoints')
export class Checkpoint {
  @Column({ primary: true, type: 'integer' })
  number!: number;

  @Column({ type: 'integer' })
  blockNumber!: number;

  @Column({ type: 'bigint' })
  blockTimestamp!: number;

  // 0x + 64 hex chars, see https://stackoverflow.com/a/72775042
  @Column({ type: 'varchar', length: 66 })
  txHash!: string;

  // 0x + 40 hex chars, see https://stackoverflow.com/a/72775042
  @Column({ type: 'varchar', length: 42 })
  proposer!: string;

  @Column({
    type: 'numeric',
    precision: 79,
    transformer: new BNTransformer(),
  })
  reward!: BigNumber;

  @OneToMany(() => Duty, (e) => e.checkpoint, {
    eager: true,
  })
  @JoinTable()
  duties: Duty[];

  @OneToMany(() => Reward, (e) => e.checkpoint, {
    eager: true,
  })
  @JoinTable()
  rewards: Reward[];
}
