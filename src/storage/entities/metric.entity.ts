import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('metrics')
export class Metric {
  @PrimaryColumn({ type: 'bigint' })
  blockTimestamp!: number;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  name!: string;

  @PrimaryColumn({ type: 'jsonb' })
  labels!: { [key: string]: string };

  @Column({ type: 'real' })
  value!: number;
}
