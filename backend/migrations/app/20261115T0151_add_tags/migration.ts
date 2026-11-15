#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8327c7c0b2066da6021aa1334aef42a970366e0f73d6becb47d6b5e3c2019beb/contract';
import endContract from '../../snapshots/8327c7c0b2066da6021aa1334aef42a970366e0f73d6becb47d6b5e3c2019beb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/aa31a2c3c9fc4fc66391f9e9e380016e5d7dd4fe0b501f0592fb07410dd27744/contract';
import startContract from '../../snapshots/aa31a2c3c9fc4fc66391f9e9e380016e5d7dd4fe0b501f0592fb07410dd27744/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Tag',
        columns: [
          col('color', 'text', {
            notNull: true,
            default: lit('#a78bfa'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserTag',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tagId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Tag',
        constraint: 'Tag_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserTag',
        constraint: 'UserTag_userId_tagId_key',
        columns: ['userId', 'tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserTag',
        index: 'UserTag_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserTag',
        index: 'UserTag_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserTag',
        foreignKey: {
          name: 'UserTag_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserTag',
        foreignKey: {
          name: 'UserTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'Tag', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
