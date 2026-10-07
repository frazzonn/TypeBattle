#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/38486890e86b964f36476f57791a09f613fa7edbfdc3974f2c00aedbc9b206c9/contract';
import endContract from '../../snapshots/38486890e86b964f36476f57791a09f613fa7edbfdc3974f2c00aedbc9b206c9/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/70845c5e4ae343693a74e46932c6655418f025d0f28e52df1f055d46734deb8a/contract';
import startContract from '../../snapshots/70845c5e4ae343693a74e46932c6655418f025d0f28e52df1f055d46734deb8a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TypingResult',
        columns: [
          col('accuracy', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('characters', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('duration', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('errors', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ppm', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TypingResult',
        index: 'TypingResult_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TypingResult',
        foreignKey: {
          name: 'TypingResult_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
