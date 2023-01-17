import { MigrationInterface, MoreThan, QueryRunner } from 'typeorm';

import { Checkpoint, Metric } from '../entities';

export class dropBrokenEntries1673958261704 implements MigrationInterface {
  name = 'dropBrokenEntries1673958261704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ts = 1673820000; // 2023-01-15 00:00:00
    await queryRunner.manager
      .createQueryBuilder(Checkpoint, 'checkpoints')
      .delete()
      .where({ blockTimestamp: MoreThan(ts) })
      .execute(); // duties will be deleted by cascade
    await queryRunner.manager
      .createQueryBuilder(Metric, 'metrics')
      .delete()
      .where({ blockTimestamp: MoreThan(ts) })
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nothing to do
  }
}
