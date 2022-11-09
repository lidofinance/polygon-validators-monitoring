import { MigrationInterface, QueryRunner, Table } from 'typeorm';

import { ShareEventType } from '../entities';

export class Init1659598080042 implements MigrationInterface {
  name = 'Init1659598080042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'checkpoints',
        columns: [
          {
            isPrimary: true,
            name: 'number',
            type: 'integer',
          },
          {
            name: 'blockNumber',
            type: 'integer',
          },
          {
            name: 'blockTimestamp',
            type: 'bigint',
          },
          {
            name: 'txHash',
            type: 'varchar',
            length: '66',
          },
          {
            isNullable: true,
            name: 'reward',
            type: 'varchar',
            length: '79',
          },
        ],
        indices: [
          {
            name: 'IDX_0023f616c5b4893647b0e9bf37',
            columnNames: ['blockTimestamp'],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'duties',
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
            name: 'fulfilled',
            type: 'boolean',
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
          {
            name: 'isTracked',
            type: 'boolean',
          },
          {
            name: 'isTop',
            type: 'boolean',
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
            name: 'IDX_a9d1f9a5b26debc10a2d072f6e',
            isUnique: true,
          },
          {
            columnNames: ['checkpointNumber'],
            name: 'IDX_aa4fea68a6e085c1add632710b',
          },
          {
            columnNames: ['blockTimestamp', 'isTracked', 'fulfilled'],
            name: 'IDX_d5945880a9c7734877b15e2208',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'metrics',
        columns: [
          {
            isPrimary: true,
            name: 'blockTimestamp',
            type: 'bigint',
          },
          {
            isPrimary: true,
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            isPrimary: true,
            name: 'labels',
            type: 'jsonb',
          },
          {
            name: 'value',
            type: 'real',
          },
        ],
        indices: [
          {
            columnNames: ['blockTimestamp'],
            name: 'IDX_c506cafc62668b336d41c61c4b',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'share_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'vId',
            type: 'integer',
          },
          {
            name: 'amount',
            type: 'decimal',
            comment: 'rated in MATIC',
          },
          {
            name: 'type',
            type: 'enum',
            enum: Object.keys(ShareEventType),
          },
          {
            name: 'blockTimestamp',
            type: 'bigint',
          },
          {
            name: 'blockNumber',
            type: 'integer',
          },
          {
            name: 'logIndex',
            type: 'integer',
          },
          {
            name: 'moniker',
            type: 'varchar',
            length: '255',
          },
        ],
        indices: [
          // candidate for composite primary key
          {
            columnNames: ['blockNumber', 'logIndex'],
            name: 'IDX_1031a675d1894273894278a407',
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const duties = await queryRunner.getTable('duties');
    await queryRunner.dropForeignKeys(duties, duties.foreignKeys);

    await queryRunner.dropTable('share_events');
    await queryRunner.dropTable('checkpoints');
    await queryRunner.dropTable('metrics');
    await queryRunner.dropTable('duties');
  }
}
