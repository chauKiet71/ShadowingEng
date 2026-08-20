const PREFERRED_VOICE_NAMES = [
  'google us english',
  'google uk english female',
  'microsoft aria',
  'microsoft jenny',
  'microsoft zira',
  'samantha',
  'siri',
];

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith('en-us')) score += 40;
  else if (lang.startsWith('en-gb')) score += 25;
  else if (lang.startsWith('en')) score += 15;
  else return -1;

  if (name.includes('google')) score += 50;
  if (name.includes('natural') || name.includes('online')) score += 30;
  if (PREFERRED_VOICE_NAMES.some((preferred) => name.includes(preferred))) {
    score += 20;
  }
  if (voice.default) score += 5;
  if (name.includes('compact') || name.includes('espeak')) score -= 25;

  return score;
}

function pickEnglishVoice(): SpeechSynthesisVoice | undefined {
  const ranked = window.speechSynthesis
    .getVoices()
    .map((voice) => ({ voice, score: scoreEnglishVoice(voice) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.voice;
}

function speakWithCurrentVoices(text: string, rate: number) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  const voice = pickEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  window.speechSynthesis.speak(utterance);
}

export function speakEnglishText(text: string, rate = 0.85) {
  if (!('speechSynthesis' in window) || !text.trim()) return;

  window.speechSynthesis.cancel();

  if (window.speechSynthesis.getVoices().length > 0) {
    speakWithCurrentVoices(text, rate);
    return;
  }

  let spoken = false;
  const speakWhenReady = () => {
    if (spoken) return;
    spoken = true;
    speakWithCurrentVoices(text, rate);
  };

  window.speechSynthesis.addEventListener('voiceschanged', speakWhenReady, {
    once: true,
  });
  window.setTimeout(speakWhenReady, 300);
}
