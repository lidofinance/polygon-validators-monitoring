import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Checkpoint } from './checkpoint.entity';

@Entity('duties')
@Index(['checkpoint', 'vId'], { unique: true })
export class Duty {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // I see no easy way to use the relation column as primary key therefore id column ^^^ is in use
  @ManyToOne(() => Checkpoint, (checkpoint) => checkpoint.duties, {
    onDelete: 'CASCADE',
  })
  checkpoint!: Checkpoint;

  @Column({ type: 'integer' })
  vId!: number;

  @Column({ type: 'boolean' })
  fulfilled: boolean;

  // the fields below exist to avoid joins / calls etc.

  @Column({ type: 'bigint' })
  blockTimestamp!: number;

  @Column({ type: 'varchar', length: 255 })
  moniker!: string;

  @Column({ type: 'boolean' })
  isTracked!: boolean;

  @Column({ type: 'boolean' })
  isTop!: boolean;
}
