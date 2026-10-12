#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/38486890e86b964f36476f57791a09f613fa7edbfdc3974f2c00aedbc9b206c9/contract';
import startContract from '../../snapshots/38486890e86b964f36476f57791a09f613fa7edbfdc3974f2c00aedbc9b206c9/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/640c893a762626233657b8d38f41da1fdac4f49b7a5c23b7fe05f35cd131cc74/contract';
import endContract from '../../snapshots/640c893a762626233657b8d38f41da1fdac4f49b7a5c23b7fe05f35cd131cc74/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
