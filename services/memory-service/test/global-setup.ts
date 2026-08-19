import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const serverDbRoot = path.resolve(__dirname, '../../../packages/server-db');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: serverDbRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
