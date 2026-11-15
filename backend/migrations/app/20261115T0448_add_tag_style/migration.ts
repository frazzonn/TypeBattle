#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0e6a767fd7e1d448c9bf7dab6ee4ec443928b75a50468cdfa33673249abd6747/contract';
import endContract from '../../snapshots/0e6a767fd7e1d448c9bf7dab6ee4ec443928b75a50468cdfa33673249abd6747/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f3ba0481fda0e71245a1443785f7cb78d3f869242b700eb5f4902d9c371f6d4b/contract';
import startContract from '../../snapshots/f3ba0481fda0e71245a1443785f7cb78d3f869242b700eb5f4902d9c371f6d4b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Tag',
        column: col('icon', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Tag',
        column: col('style', 'text', {
          notNull: true,
          default: lit('classic'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
