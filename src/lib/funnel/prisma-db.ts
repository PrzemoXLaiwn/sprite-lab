import { prisma } from "@/lib/prisma";
import type { QueryDb } from "@/lib/funnel/store";

export function prismaQueryDb(): QueryDb {
  return {
    async query<T>(sql: string, params: unknown[]): Promise<T[]> {
      return prisma.$queryRawUnsafe<T[]>(sql, ...params);
    },
  };
}
