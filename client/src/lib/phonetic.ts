type PhonemizeModule = typeof import('phonemize');

let phonemizeModule: PhonemizeModule | null = null;
const cache = new Map<string, string>();

async function loadPhonemize() {
  if (!phonemizeModule) {
    phonemizeModule = await import('phonemize');
  }
  return phonemizeModule;
}

export function getStoredPhonetic(storedPhonetic?: string): string {
  return storedPhonetic?.trim() ?? '';
}

export async function resolvePhoneticText(
  english: string,
  storedPhonetic?: string,
): Promise<string> {
  const stored = getStoredPhonetic(storedPhonetic);
  if (stored) return stored;

  const cached = cache.get(english);
  if (cached) return cached;

  const { toIPA } = await loadPhonemize();
  const ipa = toIPA(english).trim();
  const result = ipa ? (ipa.startsWith('/') ? ipa : `/${ipa}/`) : '';
  cache.set(english, result);
  return result;
}

export async function resolveLessonPhonetics(
  sentences: Array<{ english: string; phonetic?: string }>,
): Promise<string[]> {
  return Promise.all(
    sentences.map((sentence) =>
      resolvePhoneticText(sentence.english, sentence.phonetic),
    ),
  );
}
