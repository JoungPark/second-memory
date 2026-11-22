import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export function readLambdaWebAddress(endpoint: string) {
  const match = /^(\[[0-9a-f:.]+\]|[\w.-]+):(\d+)$/i.exec(endpoint);
  const port = Number(match?.[2]);
  if (!match || port < 1 || port > 65_535) {
    throw new Error(
      'AWS_LAMBDA_HTTP_ENDPOINT must contain a valid host and port',
    );
  }
  return { host: match[1].replace(/^\[|\]$/g, ''), port };
}

export async function loadLambdaChatKey(): Promise<void> {
  const name = process.env.OPENAI_API_KEY_PARAMETER_NAME?.trim();
  if (!name || !/^\/(?:[\w.-]+\/)*[\w.-]+$/.test(name)) {
    throw new Error(
      'OPENAI_API_KEY_PARAMETER_NAME must be an absolute SSM parameter path',
    );
  }
  const client = new SSMClient({ maxAttempts: 1 });
  const signal = AbortSignal.timeout(3000);
  try {
    const { Parameter } = await Promise.race([
      client.send(
        new GetParameterCommand({ Name: name, WithDecryption: true }),
        { abortSignal: signal },
      ),
      new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      }),
    ]);
    if (Parameter?.Type !== 'SecureString' || !Parameter.Value?.trim()) {
      throw new Error();
    }
    process.env.OPENAI_API_KEY = Parameter.Value;
  } catch {
    throw new Error(
      'Unable to read the chat API key SecureString from SSM Parameter Store',
    );
  } finally {
    client.destroy();
  }
}
