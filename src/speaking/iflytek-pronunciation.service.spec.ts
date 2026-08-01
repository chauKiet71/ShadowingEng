import { createHmac } from 'node:crypto';
import {
  buildIflytekAuthUrl,
  parseIflytekPronunciationXml,
} from './iflytek-pronunciation.service';

describe('iFLYTEK Pronunciation Assessment helpers', () => {
  it('builds the authenticated WebSocket URL using the documented HMAC format', () => {
    const now = new Date('2026-08-01T12:34:56.000Z');
    const signedUrl = buildIflytekAuthUrl({
      endpoint: 'wss://ise-api-sg.xf-yun.com/v2/ise',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      now,
    });
    const url = new URL(signedUrl);
    const signature = createHmac('sha256', 'test-api-secret')
      .update(
        [
          'host: ise-api-sg.xf-yun.com',
          `date: ${now.toUTCString()}`,
          'GET /v2/ise HTTP/1.1',
        ].join('\n'),
      )
      .digest('base64');

    expect(url.searchParams.get('host')).toBe('ise-api-sg.xf-yun.com');
    expect(url.searchParams.get('date')).toBe(now.toUTCString());
    expect(
      Buffer.from(url.searchParams.get('authorization')!, 'base64').toString(
        'utf8',
      ),
    ).toBe(
      `api_key="test-api-key", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`,
    );
  });

  it('extracts sentence and word scores from an iFLYTEK XML response', () => {
    const result = parseIflytekPronunciationXml(`
      <?xml version="1.0" encoding="utf-8"?>
      <read_sentence
        total_score="86"
        phone_score="92"
        accuracy_score="91"
        fluency_score="76"
        integrity_score="88"
        standard_score="84"
      >
        <sentence>
          <word content="Hello" total_score="89" beg_pos="1" end_pos="20" />
          <word content="world" phone_score="87" beg_pos="21" end_pos="42" />
        </sentence>
      </read_sentence>
    `);

    expect(result).toEqual(
      expect.objectContaining({
        pronunciation: 92,
        accuracy: 91,
        fluency: 76,
        completeness: 88,
        standard: 84,
        total: 86,
      }),
    );
    expect(result.words).toEqual([
      {
        content: 'Hello',
        score: 89,
        beginPosition: 1,
        endPosition: 20,
      },
      {
        content: 'world',
        score: 87,
        beginPosition: 21,
        endPosition: 42,
      },
    ]);
  });

  it('rejects XML that does not contain assessment scores', () => {
    expect(() =>
      parseIflytekPronunciationXml(
        '<FinalResult><ret value="0" /></FinalResult>',
      ),
    ).toThrow('without pronunciation scores');
  });
});
