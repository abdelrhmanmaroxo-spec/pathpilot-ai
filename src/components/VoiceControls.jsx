import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

function speechRecognitionConstructor() {
  return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
}

export default function VoiceControls({ value, onChange, answer, notify }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const Recognition = speechRecognitionConstructor();
  const voiceInputSupported = Boolean(Recognition);
  const readAloudSupported = Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);
  const en = isEnglish();

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    globalThis.speechSynthesis?.cancel?.();
  }, []);

  const toggleListening = () => {
    if (!voiceInputSupported) {
      notify?.(en ? 'Voice input is not supported in this browser.' : 'الإدخال الصوتي غير مدعوم في المتصفح ده.');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = en ? 'en-US' : 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = true;
    const original = String(value || '').trim();
    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error !== 'aborted') notify?.(en ? 'Voice input stopped. Try again.' : 'الإدخال الصوتي وقف. جرّب تاني.');
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0]?.transcript || '';
      onChange?.([original, transcript.trim()].filter(Boolean).join(original ? ' ' : ''));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleSpeaking = () => {
    if (!readAloudSupported) {
      notify?.(en ? 'Read aloud is not supported in this browser.' : 'قراءة الرد بصوت غير مدعومة في المتصفح ده.');
      return;
    }
    if (speaking) {
      globalThis.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = String(answer || '').trim();
    if (!text) {
      notify?.(en ? 'Generate an answer first.' : 'أنشئ إجابة الأول عشان أقراها.');
      return;
    }
    globalThis.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 20_000));
    utterance.lang = en ? 'en-US' : 'ar-EG';
    utterance.rate = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    globalThis.speechSynthesis.speak(utterance);
  };

  return (
    <div className="voice-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={toggleListening} disabled={!voiceInputSupported} title={en ? 'Voice input' : 'إدخال صوتي'} aria-label={en ? 'Voice input' : 'إدخال صوتي'}>
        {listening ? <MicOff size={17} /> : <Mic size={17} />} {listening ? (en ? 'Listening…' : 'بسمعك…') : (en ? 'Voice' : 'صوت')}
      </button>
      <button type="button" onClick={toggleSpeaking} disabled={!readAloudSupported || !answer} title={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'} aria-label={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'}>
        {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />} {speaking ? (en ? 'Stop audio' : 'وقف الصوت') : (en ? 'Read aloud' : 'اقرأ الرد')}
      </button>
    </div>
  );
}
