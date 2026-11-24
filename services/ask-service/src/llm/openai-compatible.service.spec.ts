import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import configuration from '../config/configuration';
import { OpenAiCompatibleService } from './openai-compatible.service';

describe('OpenAiCompatibleService', () => {
  let service: OpenAiCompatibleService;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiCompatibleService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const values: Record<string, unknown> = {
                'llm.baseUrl': 'https://example.test/v1',
                'llm.apiKey': 'test-key',
                'llm.model': 'test-model',
              };

              return values[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(OpenAiCompatibleService);
  });

  it('calls the OpenAI-compatible chat completions endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Grounded answer' } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
    });

    const result = await service.chat([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
    ]);

    expect(result.content).toBe('Grounded answer');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'test-model',
          messages: [
            { role: 'system', content: 'You are helpful.' },
            { role: 'user', content: 'Hello' },
          ],
        }),
      }),
    );
  });

  it('defaults to GPT-6 Luna and omits temperature', async () => {
    const environment = jest.replaceProperty(process, 'env', { ...process.env });
    delete process.env.OPENAI_MODEL;
    try {
      const configuredService = new OpenAiCompatibleService(new ConfigService(configuration()));
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Grounded answer' } }] }),
      });
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(configuredService.chat(messages)).resolves.toMatchObject({ content: 'Grounded answer' });
      expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ model: 'gpt-6-luna', messages }));
    } finally {
      environment.restore();
    }
  });

  it('throws when the LLM request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ error: { message: 'model unavailable' } }),
    });

    await expect(service.chat([{ role: 'user', content: 'Hello' }])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
