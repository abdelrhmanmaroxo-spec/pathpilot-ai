import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

function isEnglish() {
  return document.body?.dataset?.language === 'en';
}

function speechRecognitionConstructor() {
  return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
}

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function VoiceControls({ value, onChange, answer, notify }) {
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);
  const baseTextRef = useRef('');
  const committedTextRef = useRef('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const Recognition = speechRecognitionConstructor();
  const voiceInputSupported = Boolean(Recognition);
  const readAloudSupported = Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);
  const en = isEnglish();

  useEffect(() => {
    if (!listening) return undefined;
    const timer = globalThis.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => globalThis.clearInterval(timer);
  }, [listening]);

  useEffect(() => () => {
    shouldListenRef.current = false;
    globalThis.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort?.();
    globalThis.speechSynthesis?.cancel?.();
  }, []);

  const publishTranscript = (interim = '') => {
    const dictated = [committedTextRef.current, interim].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    const full = [baseTextRef.current, dictated].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    onChange?.(full);
  };

  const startRecognitionCycle = () => {
    if (!Recognition || !shouldListenRef.current) return;
    const recognition = new Recognition();
    recognition.lang = en ? 'en-US' : 'ar-EG';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionRef.current = recognition;
      setListening(true);
    };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0]?.transcript || '').trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) finalChunk += `${transcript} `;
        else interimChunk += `${transcript} `;
      }
      if (finalChunk.trim()) {
        committedTextRef.current = [committedTextRef.current, finalChunk.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      }
      publishTranscript(interimChunk.trim());
    };

    recognition.onerror = (event) => {
      const error = String(event?.error || '');
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
        shouldListenRef.current = false;
        setListening(false);
        notify?.(en ? 'Microphone permission is required for voice input.' : 'لازم تسمح للمتصفح باستخدام الميكروفون عشان التسجيل الصوتي.');
      } else if (!['aborted', 'no-speech'].includes(error)) {
        notify?.(en ? 'Voice recognition paused and will try to resume.' : 'التعرف على الصوت اتوقف لحظة وهيحاول يكمل تلقائيًا.');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!shouldListenRef.current) {
        setListening(false);
        return;
      }
      // Browsers often terminate Web Speech sessions after silence or an internal time limit.
      // Restarting keeps long-form dictation continuous until the user explicitly stops it.
      globalThis.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = globalThis.setTimeout(() => {
        if (shouldListenRef.current) startRecognitionCycle();
      }, 220);
    };

    try {
      recognition.start();
    } catch {
      globalThis.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = globalThis.setTimeout(() => {
        if (shouldListenRef.current) startRecognitionCycle();
      }, 350);
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    globalThis.clearTimeout(restartTimerRef.current);
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
    publishTranscript();
  };

  const toggleListening = () => {
    if (!voiceInputSupported) {
      notify?.(en ? 'Voice input is not supported in this browser.' : 'الإدخال الصوتي غير مدعوم في المتصفح ده.');
      return;
    }
    if (shouldListenRef.current || listening) {
      stopListening();
      return;
    }

    baseTextRef.current = String(value || '').trim();
    committedTextRef.current = '';
    setElapsed(0);
    shouldListenRef.current = true;
    startRecognitionCycle();
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
    <div className={listening ? 'voice-controls is-listening' : 'voice-controls'}>
      <button className="voice-record-button" type="button" onClick={toggleListening} disabled={!voiceInputSupported} title={en ? 'Long-form voice input' : 'تسجيل صوتي طويل'} aria-label={en ? 'Long-form voice input' : 'تسجيل صوتي طويل'}>
        <span className="voice-record-icon">{listening ? <MicOff size={19} /> : <Mic size={19} />}</span>
        <span>
          <strong>{listening ? (en ? 'Stop recording' : 'إيقاف التسجيل') : (en ? 'Long voice input' : 'تسجيل صوتي طويل')}</strong>
          <small>{listening ? `${formatElapsed(elapsed)} · ${en ? 'auto-resume active' : 'استكمال تلقائي مفعّل'}` : (en ? 'Keeps listening until you stop it' : 'يكمل لحد ما توقفه بنفسك')}</small>
        </span>
      </button>
      <button className="voice-read-button" type="button" onClick={toggleSpeaking} disabled={!readAloudSupported || !answer} title={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'} aria-label={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'}>
        {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
        {speaking ? (en ? 'Stop audio' : 'وقف الصوت') : (en ? 'Read aloud' : 'اقرأ الرد')}
      </button>
    </div>
  );
}
