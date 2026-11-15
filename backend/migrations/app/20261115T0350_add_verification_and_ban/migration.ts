#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8327c7c0b2066da6021aa1334aef42a970366e0f73d6becb47d6b5e3c2019beb/contract';
import startContract from '../../snapshots/8327c7c0b2066da6021aa1334aef42a970366e0f73d6becb47d6b5e3c2019beb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f3ba0481fda0e71245a1443785f7cb78d3f869242b700eb5f4902d9c371f6d4b/contract';
import endContract from '../../snapshots/f3ba0481fda0e71245a1443785f7cb78d3f869242b700eb5f4902d9c371f6d4b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('banned', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('emailVerified', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('verificationAttempts', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('verificationCodeHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('verificationExpiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('verificationSentAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
