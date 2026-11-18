#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0e6a767fd7e1d448c9bf7dab6ee4ec443928b75a50468cdfa33673249abd6747/contract';
import startContract from '../../snapshots/0e6a767fd7e1d448c9bf7dab6ee4ec443928b75a50468cdfa33673249abd6747/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6be84fe31e7a2c538f5df7e407f5ae75338343d0561d5a02a7cab315124def62/contract';
import endContract from '../../snapshots/6be84fe31e7a2c538f5df7e407f5ae75338343d0561d5a02a7cab315124def62/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ArcadeResult',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('details', 'text', {
            notNull: true,
            default: lit('{}'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('game', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('language', 'text', {
            notNull: true,
            default: lit('portuguese'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('score', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'TypingResult',
        column: col('durationMs', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TypingResult',
        column: col('mode', 'text', {
          notNull: true,
          default: lit('time'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'TypingResult',
        column: col('wordCount', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArcadeResult',
        index: 'ArcadeResult_game_language_idx_509b14d1',
        columns: ['game', 'language'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ArcadeResult',
        index: 'ArcadeResult_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ArcadeResult',
        foreignKey: {
          name: 'ArcadeResult_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
