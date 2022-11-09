import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ShareEventType {
  Minted = 'Minted',
  Burned = 'Burned',
}

@Entity('share_events')
@Index(['blockNumber', 'logIndex'], { unique: true })
export class ShareEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'integer' })
  vId!: number;

  @Column({ type: 'decimal', comment: 'rated in MATIC' })
  amount!: number;

  @Column({ type: 'enum', enum: ShareEventType })
  type!: ShareEventType;

  @Column({ type: 'bigint' })
  blockTimestamp!: number;

  @Column({ type: 'integer' })
  blockNumber!: number;

  @Column({ type: 'integer' })
  logIndex!: number;

  // the fields below exist to avoid joins / calls etc.

  @Column({ type: 'varchar', length: 255 })
  moniker!: string;
}
