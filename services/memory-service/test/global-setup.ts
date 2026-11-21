import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const testDatabaseUrl = process.env.MEMORY_E2E_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      'Set MEMORY_E2E_DATABASE_URL to a disposable PostgreSQL database. The E2E suite deletes its data.',
    );
  }
  process.env.DATABASE_URL = testDatabaseUrl;

  const serverDbRoot = path.resolve(__dirname, '../../../packages/server-db');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: serverDbRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
