import { sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { db } from './index.js';

type RLSTransaction = PgTransaction<any, any, any>;

export async function withRLS<T>(
  firmId: string,
  userId: string,
  callback: (tx: RLSTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: userId,
      role: 'authenticated',
      app_metadata: { firm_id: firmId },
    });

    await tx.execute(sql`
      select set_config('request.jwt.claims', ${claims}, true);
      select set_config('request.jwt.claim.sub', ${userId}, true);
      set local role 'authenticated';
    `);

    try {
      return await callback(tx);
    } finally {
      await tx.execute(sql`
        select set_config('request.jwt.claims', '', true);
        select set_config('request.jwt.claim.sub', '', true);
        reset role;
      `);
    }
  });
}
