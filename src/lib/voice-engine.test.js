import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVoiceTranscriptCommands,
  cleanTextForSpeech,
  detectTextSpeechLang,
  pickBestVoice,
  rankAvailableVoices,
  resolveRecognitionLanguage,
  sanitizeVoiceSettings,
  splitSpeechChunks,
} from './voice-engine.js';

test('cleanTextForSpeech strips markdown formatting and code blocks for natural speech', () => {
  const cleaned = cleanTextForSpeech('### ملخص المحاضرة\n**نقطة مهمة** حول https://example.com\n```js\nconsole.log(1);\n```');
  assert.doesNotMatch(cleaned, /###|\*\*|https?:\/\//);
  assert.match(cleaned, /ملخص المحاضرة/);
  assert.match(cleaned, /نقطة مهمة/);
  assert.match(cleaned, /مقطع برمجي/);
});

test('splitSpeechChunks breaks long responses into natural bounded sentences with language tags', () => {
  const text = 'الشبكات العصبية تتعلم من البيانات تدريجيًا. Deep learning uses layered representations for complex features.';
  const chunks = splitSpeechChunks(text, 90);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].lang, 'ar-EG');
  assert.equal(chunks[1].lang, 'en-US');
});

test('applyVoiceTranscriptCommands converts spoken Arabic and English punctuation naturally', () => {
  const formatted = applyVoiceTranscriptCommands('أهلًا بك فصلة كيف حالك علامة استفهام سطر جديد تمام نقطة');
  assert.equal(formatted, 'أهلًا بك، كيف حالك؟\nتمام.');
});

test('voice settings sanitize bounds and rank Egyptian/Neural voices first', () => {
  const settings = sanitizeVoiceSettings({ rate: 9, pitch: 0.2, micLang: 'ar-EG' });
  assert.equal(settings.rate, 2);
  assert.equal(settings.pitch, 0.75);
  assert.equal(resolveRecognitionLanguage(settings, 'en'), 'ar-EG');

  const voices = [
    { name: 'Generic Arabic', lang: 'ar-SA', default: false },
    { name: 'Microsoft Salma Online (Natural) - Arabic (Egypt)', lang: 'ar-EG', default: false },
  ];
  const ranked = rankAvailableVoices(voices, 'ar');
  assert.match(ranked[0].name, /Salma/);
  assert.equal(pickBestVoice(voices, 'ar-EG', settings).name, ranked[0].name);
  assert.equal(detectTextSpeechLang('Hello world from PathPilot'), 'en-US');
});
