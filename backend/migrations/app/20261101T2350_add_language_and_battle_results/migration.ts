#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4640df8182b9d86128c1a5279523706b0348c053bd91f0bb2397ab260c3a5b89/contract';
import endContract from '../../snapshots/4640df8182b9d86128c1a5279523706b0348c053bd91f0bb2397ab260c3a5b89/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/640c893a762626233657b8d38f41da1fdac4f49b7a5c23b7fe05f35cd131cc74/contract';
import startContract from '../../snapshots/640c893a762626233657b8d38f41da1fdac4f49b7a5c23b7fe05f35cd131cc74/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'BattleResult',
        columns: [
          col('accuracy', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('duration', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('errors', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('language', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('placement', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('players', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ppm', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('won', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'TypingResult',
        column: col('language', 'text', {
          notNull: true,
          default: lit('portuguese'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'BattleResult',
        index: 'BattleResult_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'BattleResult',
        foreignKey: {
          name: 'BattleResult_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
