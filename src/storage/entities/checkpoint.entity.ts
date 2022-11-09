import { Column, Entity, JoinTable, OneToMany } from 'typeorm';

import { Duty } from './duty.entity';

@Entity('checkpoints')
export class Checkpoint {
  @Column({ primary: true, type: 'integer' })
  number!: number;

  @Column({ type: 'integer' })
  blockNumber!: number;

  @Column({ type: 'bigint' })
  blockTimestamp!: number;

  // 0x + 64 hex, see https://stackoverflow.com/a/72775042
  @Column({ type: 'varchar', length: 66 })
  txHash!: string;

  // max uint256 decimal length
  @Column({ type: 'varchar', length: 79, nullable: true })
  reward?: string;

  @OneToMany(() => Duty, (duty) => duty.checkpoint, {
    eager: true,
  })
  @JoinTable()
  duties: Duty[];
}
