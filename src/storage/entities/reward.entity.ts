import { BigNumber } from '@ethersproject/bignumber';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Checkpoint } from './checkpoint.entity';
import { BNTransformer } from './utils';

@Entity('rewards')
@Index(['checkpoint', 'vId'], { unique: true })
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // I see no easy way to use the relation column as primary key therefore id column ^^^ is in use
  @ManyToOne(() => Checkpoint, (checkpoint) => checkpoint.rewards, {
    onDelete: 'CASCADE',
  })
  checkpoint!: Checkpoint;

  @Column({ type: 'integer' })
  vId!: number;

  @Column({
    type: 'decimal',
    precision: 79,
    transformer: new BNTransformer(),
  })
  own!: BigNumber;

  @Column({
    type: 'decimal',
    precision: 79,
    transformer: new BNTransformer(),
  })
  delegators!: BigNumber;

  @Column({
    type: 'decimal',
    precision: 79,
    transformer: new BNTransformer(),
  })
  earned!: BigNumber;

  // the fields below exist to avoid joins / calls etc.

  @Column({ type: 'bigint' })
  blockTimestamp!: number;

  @Column({ type: 'varchar', length: 255 })
  moniker!: string;
}
