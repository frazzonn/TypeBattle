#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6be84fe31e7a2c538f5df7e407f5ae75338343d0561d5a02a7cab315124def62/contract';
import startContract from '../../snapshots/6be84fe31e7a2c538f5df7e407f5ae75338343d0561d5a02a7cab315124def62/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/97618ea452f105cfa36259e1a10c2d03990cc220f3f060afeee2a9a23d59aa00/contract';
import endContract from '../../snapshots/97618ea452f105cfa36259e1a10c2d03990cc220f3f060afeee2a9a23d59aa00/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CifraDaily',
        columns: [
          col('boards', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('custom', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('words', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CifraDailyPlay',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('boards', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('durationMs', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('finishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('guesses', 'text', {
            notNull: true,
            default: lit('[]'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('won', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CifraDaily',
        constraint: 'CifraDaily_date_boards_key',
        columns: ['date', 'boards'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CifraDailyPlay',
        constraint: 'CifraDailyPlay_userId_date_boards_key',
        columns: ['userId', 'date', 'boards'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CifraDailyPlay',
        index: 'CifraDailyPlay_date_boards_idx_c89b716a',
        columns: ['date', 'boards'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CifraDailyPlay',
        index: 'CifraDailyPlay_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CifraDailyPlay',
        foreignKey: {
          name: 'CifraDailyPlay_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
