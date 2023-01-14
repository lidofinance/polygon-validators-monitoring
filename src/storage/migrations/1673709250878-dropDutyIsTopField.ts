import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class dropDutyIsTopField1673709250878 implements MigrationInterface {
  name = 'dropDutyIsTopField1673709250878';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('duties', 'isTop');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'duties',
      new TableColumn({
        name: 'isTop',
        type: 'boolean',
        default: false,
      }),
    );
  }
}
