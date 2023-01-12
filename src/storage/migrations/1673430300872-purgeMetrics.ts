import { MigrationInterface, QueryRunner } from 'typeorm';

export class purgeMetrics1673430300872 implements MigrationInterface {
  name = 'purgeMetrics1673430300872';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.clearTable('metrics');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nothing to do
  }
}
