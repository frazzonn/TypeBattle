#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4640df8182b9d86128c1a5279523706b0348c053bd91f0bb2397ab260c3a5b89/contract';
import startContract from '../../snapshots/4640df8182b9d86128c1a5279523706b0348c053bd91f0bb2397ab260c3a5b89/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aa31a2c3c9fc4fc66391f9e9e380016e5d7dd4fe0b501f0592fb07410dd27744/contract';
import endContract from '../../snapshots/aa31a2c3c9fc4fc66391f9e9e380016e5d7dd4fe0b501f0592fb07410dd27744/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'TypingResult',
        column: col('missedKeys', 'text', {
          notNull: true,
          default: lit('{}'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
