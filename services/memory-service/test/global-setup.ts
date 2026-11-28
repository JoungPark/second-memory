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

  execSync('pnpm db:migrate:deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}
