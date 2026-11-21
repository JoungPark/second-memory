import {
  GetParametersCommand,
  SSMClient,
  type GetParametersCommandOutput,
} from '@aws-sdk/client-ssm';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadLambdaWebSecrets } from './lambda-web';

jest.mock('@aws-sdk/client-ssm', () => ({
  ...jest.requireActual<typeof import('@aws-sdk/client-ssm')>(
    '@aws-sdk/client-ssm',
  ),
  SSMClient: jest.fn(),
}));

describe('Lambda Web SSM credentials', () => {
  const previousEnvironment = process.env;
  const databaseName = '/second-memory/shared/database-url';
  const embeddingName = '/second-memory/memory-service/embedding-api-key';
  const send = jest.fn<
    Promise<GetParametersCommandOutput>,
    [GetParametersCommand, { abortSignal: AbortSignal }]
  >();
  const destroy = jest.fn();

  const credentials = (): GetParametersCommandOutput => ({
    $metadata: {},
    Parameters: [
      {
        Name: embeddingName,
        Type: 'SecureString',
        Value: 'embedding-test-key',
      },
      {
        Name: databaseName,
        Type: 'SecureString',
        Value:
          'postgresql://user:password@db.example.com/memory?schema=public&sslmode=disable&connection_limit=8',
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...previousEnvironment,
      DATABASE_URL_PARAMETER_NAME: databaseName,
      EMBEDDING_API_KEY_PARAMETER_NAME: embeddingName,
      DATABASE_URL: 'previous-database',
      EMBEDDING_API_KEY: 'previous-key',
      EMBEDDING_STORAGE_MODE: 'previous-mode',
    };
    jest
      .mocked(SSMClient)
      .mockImplementation(() => ({ send, destroy }) as unknown as SSMClient);
    send.mockResolvedValue(credentials());
  });

  afterEach(() => {
    process.env = previousEnvironment;
    jest.restoreAllMocks();
  });

  it('reads latest values by name and applies PostgreSQL settings regardless of response ordering', async () => {
    await loadLambdaWebSecrets();

    expect(SSMClient).toHaveBeenCalledWith({ maxAttempts: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toEqual({
      Names: [databaseName, embeddingName],
      WithDecryption: true,
    });
    const database = new URL(process.env.DATABASE_URL!);
    expect(database.hostname).toBe('db.example.com');
    expect(Object.fromEntries(database.searchParams)).toEqual({
      schema: 'public',
      sslmode: 'require',
      sslaccept: 'strict',
      connection_limit: '1',
      connect_timeout: '5',
    });
    expect(process.env.EMBEDDING_API_KEY).toBe('embedding-test-key');
    expect(process.env.EMBEDDING_STORAGE_MODE).toBe('inline');
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('reads an updated value on the next startup load', async () => {
    await loadLambdaWebSecrets();
    const updated = credentials();
    updated.Parameters![0].Value = 'rotated-key';
    send.mockResolvedValue(updated);

    await loadLambdaWebSecrets();

    expect(process.env.EMBEDDING_API_KEY).toBe('rotated-key');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('uses the packaged database CA with strict TLS verification', async () => {
    const certificatePath = resolve(__dirname, '../database-ca.pem');
    const existsSync = fs.existsSync;
    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation(
        (path) => path === certificatePath || existsSync(path),
      );

    await loadLambdaWebSecrets();

    const database = new URL(process.env.DATABASE_URL!);
    expect(database.searchParams.get('sslcert')).toBe(certificatePath);
    expect(database.searchParams.get('sslmode')).toBe('require');
    expect(database.searchParams.get('sslaccept')).toBe('strict');
  });

  it.each([
    { DATABASE_URL_PARAMETER_NAME: '' },
    { DATABASE_URL_PARAMETER_NAME: `${databaseName}:1` },
    { DATABASE_URL_PARAMETER_NAME: '/second-memory/*' },
    { EMBEDDING_API_KEY_PARAMETER_NAME: databaseName },
  ])(
    'rejects invalid parameter configuration %j before calling SSM',
    async (override) => {
      Object.assign(process.env, override);

      await expect(loadLambdaWebSecrets()).rejects.toThrow();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it.each([
    { Parameters: [] },
    { InvalidParameters: [embeddingName] },
    {
      Parameters: [{ Name: databaseName, Type: 'String', Value: 'plaintext' }],
    },
  ] satisfies Partial<GetParametersCommandOutput>[])(
    'rejects incomplete or unencrypted SSM results without changing credentials %j',
    async (override) => {
      send.mockResolvedValue({ ...credentials(), ...override });

      await expect(loadLambdaWebSecrets()).rejects.toThrow(
        'SecureString credentials',
      );
      expect(process.env.DATABASE_URL).toBe('previous-database');
      expect(process.env.EMBEDDING_API_KEY).toBe('previous-key');
      expect(destroy).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [databaseName, 'invalid-url'],
    [databaseName, 'https://db.example.com/memory'],
    [databaseName, ''],
    [embeddingName, '   '],
  ])(
    'rejects an invalid credential at %s without partial environment updates',
    async (name, value) => {
      const response = credentials();
      response.Parameters!.find((parameter) => parameter.Name === name)!.Value =
        value;
      send.mockResolvedValue(response);

      await expect(loadLambdaWebSecrets()).rejects.toThrow();
      expect(process.env.DATABASE_URL).toBe('previous-database');
      expect(process.env.EMBEDDING_API_KEY).toBe('previous-key');
      expect(process.env.EMBEDDING_STORAGE_MODE).toBe('previous-mode');
    },
  );

  it('reports SSM failures without including sensitive service error details', async () => {
    send.mockRejectedValue(
      new Error('AccessDeniedException sensitive-details'),
    );

    await expect(loadLambdaWebSecrets()).rejects.toThrow(
      'Unable to read the configured SecureString credentials from SSM Parameter Store',
    );
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('enforces the startup deadline and destroys the client', async () => {
    const controller = new AbortController();
    jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    send.mockReturnValue(new Promise(() => {}));
    const loading = loadLambdaWebSecrets();
    const result = expect(loading).rejects.toThrow('SSM Parameter Store');
    // Let the dynamic SDK import finish before triggering the deadline.
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();

    await result;
    expect(AbortSignal.timeout).toHaveBeenCalledWith(3_000);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
