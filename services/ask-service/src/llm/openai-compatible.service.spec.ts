import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
                'llm.temperature': 0.2,
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
          temperature: 0.2,
        }),
      }),
    );
  });

  it('throws when the LLM request fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => ({ error: { message: 'model unavailable' } }),
    });

    await expect(
      service.chat([{ role: 'user', content: 'Hello' }]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
