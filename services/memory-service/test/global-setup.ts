import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup(): Promise<void> {
  const serviceRoot = path.resolve(__dirname, '..');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
