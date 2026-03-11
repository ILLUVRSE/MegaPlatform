import { prisma } from "@illuvrse/db";

type ContentDb = {
  contentItem: {
    create: (...args: any[]) => Promise<any>;
    findUnique: (...args: any[]) => Promise<any>;
    findMany: (...args: any[]) => Promise<any>;
    update: (...args: any[]) => Promise<any>;
  };
  contentStateTransition: {
    create: (...args: any[]) => Promise<any>;
  };
};

export const contentDb = prisma as unknown as ContentDb;
