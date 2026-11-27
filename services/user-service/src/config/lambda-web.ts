import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function readLambdaWebAddress(endpoint: string): {
  host: string;
  port: number;
} {
  const match = /^(\[[0-9a-f:.]+\]|[\w.-]+):(\d+)$/i.exec(endpoint);
  const port = Number(match?.[2]);
  if (!match || port < 1 || port > 65_535) {
    throw new Error('AWS_LAMBDA_HTTP_ENDPOINT must contain a valid host and port');
  }

  return { host: match[1].replace(/^\[|\]$/g, ''), port };
}

export async function loadLambdaDatabaseUrl(): Promise<void> {
  const databaseParameterName = process.env.DATABASE_URL_PARAMETER_NAME?.trim();
  if (!databaseParameterName) {
    throw new Error('DATABASE_URL_PARAMETER_NAME is required for Lambda Web');
  }
  for (const name of [databaseParameterName]) {
    if (!/^\/(?:[\w.-]+\/)*[\w.-]+$/.test(name)) {
      throw new Error('SSM parameter names must be absolute paths without version selectors');
    }
  }

  const { GetParametersCommand, SSMClient } = await import('@aws-sdk/client-ssm');
  const client = new SSMClient({ maxAttempts: 1 });
  const signal = AbortSignal.timeout(3_000);
  const deadline = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
  let databaseUrl: string | undefined;
  try {
    const response = await Promise.race([
      client.send(
        new GetParametersCommand({
          Names: [databaseParameterName],
          WithDecryption: true,
        }),
        {
          abortSignal: signal,
        },
      ),
      deadline,
    ]);
    if (response.InvalidParameters?.length) {
      throw new Error();
    }
    const parameters = new Map(response.Parameters?.map((parameter) => [parameter.Name, parameter]));
    const databaseParameter = parameters.get(databaseParameterName);
    if (databaseParameter?.Type !== 'SecureString') {
      throw new Error();
    }
    databaseUrl = databaseParameter.Value;
  } catch {
    throw new Error('Unable to read the configured SecureString credentials from SSM Parameter Store');
  } finally {
    client.destroy();
  }

  let database: URL;
  try {
    if (!databaseUrl) {
      throw new Error();
    }
    database = new URL(databaseUrl);
  } catch {
    throw new Error('Database SSM parameter must contain a valid DATABASE_URL');
  }

  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname) {
    throw new Error('User service DATABASE_URL must point to a PostgreSQL host');
  }

  database.searchParams.set('sslmode', 'require');
  database.searchParams.set('sslaccept', 'strict');
  const databaseCaPath = resolve(__dirname, '../database-ca.pem');
  if (existsSync(databaseCaPath)) {
    database.searchParams.set('sslcert', databaseCaPath);
  }
  database.searchParams.set('connection_limit', '1');
  database.searchParams.set('connect_timeout', '5');
  process.env.DATABASE_URL = database.toString();
}
