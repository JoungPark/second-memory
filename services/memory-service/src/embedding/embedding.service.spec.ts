import { ConfigService } from '@nestjs/config';
import { EmbeddingService, EmbeddingUnavailableError } from './embedding.service';

describe('EmbeddingService', () => {
  const createService = (overrides: Record<string, unknown> = {}) => {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'embedding.baseUrl': 'http://localhost:8090/v1',
          'embedding.apiKey': 'test-key',
          'embedding.model': 'sentence-transformers/all-MiniLM-L6-v2',
          ...overrides,
        };

        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    return new EmbeddingService(configService);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('embeds text and L2-normalizes the vector', async () => {
    const rawVector = [3, 0, 0, 0];

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: rawVector }],
      }),
    } as Response);

    const service = createService();
    const vector = await service.embedText('What did I write about travel?');

    expect(vector).toHaveLength(4);
    expect(vector[0]).toBeCloseTo(1, 5);
    expect(vector.slice(1).every((value) => value === 0)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8090/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          input: 'What did I write about travel?',
          model: 'sentence-transformers/all-MiniLM-L6-v2',
        }),
      }),
    );
  });

  it('omits Authorization when apiKey is not configured', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: [1, 0] }],
      }),
    } as Response);

    const service = createService({ 'embedding.apiKey': '' });
    await service.embedText('hello');

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8090/v1/embeddings',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('throws EmbeddingUnavailableError when the service is unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));

    const service = createService();

    await expect(service.embedText('hello')).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError when the service returns an OpenAI error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({
        error: { message: 'model unavailable' },
      }),
    } as Response);

    const service = createService();

    await expect(service.embedText('hello')).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError when the service returns a legacy error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({
        detail: 'model unavailable',
      }),
    } as Response);

    const service = createService();

    await expect(service.embedText('hello')).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError when the response has no embedding', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{}],
      }),
    } as Response);

    const service = createService();

    await expect(service.embedText('hello')).rejects.toThrow(EmbeddingUnavailableError);
  });
});
