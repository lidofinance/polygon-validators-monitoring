import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class addRewards1676192779425 implements MigrationInterface {
  name = 'addRewards1676192779425';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'rewards',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'checkpointNumber',
            type: 'integer',
          },
          {
            name: 'vId',
            type: 'integer',
          },
          {
            name: 'own',
            type: 'numeric',
            precision: 79,
          },
          {
            name: 'delegators',
            type: 'numeric',
            precision: 79,
          },
          {
            name: 'earned',
            type: 'numeric',
            precision: 79,
          },
          {
            name: 'blockTimestamp',
            type: 'bigint',
          },
          {
            name: 'moniker',
            type: 'varchar',
            length: '255',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['checkpointNumber'],
            referencedColumnNames: ['number'],
            referencedTableName: 'checkpoints',
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['vId', 'checkpointNumber'],
            name: 'IDX_3d947441a48debeb9b7366f8b8c',
            isUnique: true,
          },
          {
            columnNames: ['checkpointNumber'],
            name: 'IDX_af6cdfcb372e8a83d6857ffe679',
          },
        ],
      }),
    );

    await queryRunner.addColumn(
      'duties',
      new TableColumn({
        name: 'isProposer',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.query('TRUNCATE TABLE checkpoints CASCADE');

    await queryRunner.addColumn(
      'checkpoints',
      new TableColumn({
        name: 'proposer',
        type: 'varchar',
        length: '42',
      }),
    );

    await queryRunner.changeColumn(
      'checkpoints',
      'reward',
      new TableColumn({
        name: 'totalReward',
        type: 'numeric',
        precision: 79,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('checkpoints', 'proposer');
    await queryRunner.dropColumn('duties', 'isProposer');
    await queryRunner.changeColumn(
      'checkpoints',
      'totalReward',
      new TableColumn({
        isNullable: true,
        name: 'reward',
        type: 'varchar',
        length: '79',
      }),
    );

    const rewardsTable = await queryRunner.getTable('rewards');
    await queryRunner.dropForeignKeys(rewardsTable, rewardsTable.foreignKeys);
    await queryRunner.dropTable(rewardsTable);
  }
}
