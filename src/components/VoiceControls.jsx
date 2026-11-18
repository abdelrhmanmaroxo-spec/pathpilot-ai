import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Bookmark,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Square,
  Volume2,
} from 'lucide-react';
import PinnedPrompts from './PinnedPrompts.jsx';
import { getDocumentLanguage, subscribeLanguageChanges } from '../lib/language-state.js';
import {
  applyVoiceTranscriptCommands,
  loadVoiceSettings,
  pickBestVoice,
  rankAvailableVoices,
  resolveRecognitionLanguage,
  saveVoiceSettings,
  splitSpeechChunks,
} from '../lib/voice-engine.js';

function speechRecognitionConstructor() {
  return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
}

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function VoiceControls({ value, onChange, answer, notify, onAutoSubmit, compact = false }) {
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const baseTextRef = useRef('');
  const committedTextRef = useRef('');
  const latestPublishedRef = useRef('');
  const lastAutoSpokenAnswerRef = useRef('');
  const activeChunksRef = useRef([]);
  const activeChunkIndexRef = useRef(0);
  const speechSessionIdRef = useRef(0);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const meterFrameRef = useRef(0);

  const [lang, setLang] = useState(getDocumentLanguage);
  useEffect(() => subscribeLanguageChanges(setLang), []);
  const en = lang === 'en';

  const [settings, setSettings] = useState(loadVoiceSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [voices, setVoices] = useState([]);
  const [listening, setListening] = useState(false);
  const [interimPreview, setInterimPreview] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunkTotal, setChunkTotal] = useState(0);
  const [currentSpokenText, setCurrentSpokenText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [meterBars, setMeterBars] = useState([18, 28, 22, 34, 24, 30, 20, 26]);

  const Recognition = speechRecognitionConstructor();
  const voiceInputSupported = Boolean(Recognition);
  const readAloudSupported = Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);

  const arabicVoices = useMemo(() => rankAvailableVoices(voices, 'ar'), [voices]);
  const englishVoices = useMemo(() => rankAvailableVoices(voices, 'en'), [voices]);

  const updateSettings = (patch) => {
    setSettings((prev) => saveVoiceSettings({ ...prev, ...patch }));
  };

  useEffect(() => {
    if (!readAloudSupported) return undefined;
    const syncVoices = () => {
      const available = globalThis.speechSynthesis?.getVoices?.() || [];
      setVoices(available);
    };
    syncVoices();
    globalThis.speechSynthesis?.addEventListener?.('voiceschanged', syncVoices);
    return () => globalThis.speechSynthesis?.removeEventListener?.('voiceschanged', syncVoices);
  }, [readAloudSupported]);

  const stopAudioVisualizer = useCallback(() => {
    if (meterFrameRef.current) {
      globalThis.cancelAnimationFrame?.(meterFrameRef.current);
      meterFrameRef.current = 0;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks?.().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close?.().catch?.(() => undefined);
      audioContextRef.current = null;
    }
    setMeterBars([18, 28, 22, 34, 24, 30, 20, 26]);
  }, []);

  const startAudioVisualizer = useCallback(async () => {
    const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtx || !globalThis.navigator?.mediaDevices?.getUserMedia) return;
    try {
      const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      if (!shouldListenRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        if (!shouldListenRef.current || !audioContextRef.current) return;
        analyser.getByteFrequencyData(buffer);
        const nextBars = Array.from({ length: 8 }, (_, idx) => {
          const val = buffer[idx * 2] || 0;
          return Math.max(14, Math.min(100, Math.round((val / 255) * 96)));
        });
        setMeterBars(nextBars);
        meterFrameRef.current = globalThis.requestAnimationFrame(sample);
      };
      meterFrameRef.current = globalThis.requestAnimationFrame(sample);
    } catch {
      // SpeechRecognition can still operate even if Web Audio visualizer stream is declined.
    }
  }, []);

  useEffect(() => {
    if (!listening) return undefined;
    const timer = globalThis.setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => globalThis.clearInterval(timer);
  }, [listening]);

  const stopSpeaking = useCallback(() => {
    speechSessionIdRef.current += 1;
    globalThis.speechSynthesis?.cancel?.();
    activeChunksRef.current = [];
    activeChunkIndexRef.current = 0;
    setSpeaking(false);
    setPaused(false);
    setChunkIndex(0);
    setChunkTotal(0);
    setCurrentSpokenText('');
  }, []);

  const speakChunkAt = useCallback((initialIndex, sessionId, customSettings = settings) => {
    function playChunkAt(index) {
      if (!readAloudSupported || sessionId !== speechSessionIdRef.current) return;
      const chunks = activeChunksRef.current;
      if (!chunks.length || index < 0 || index >= chunks.length) {
        setSpeaking(false);
        setPaused(false);
        setCurrentSpokenText('');
        return;
      }

      activeChunkIndexRef.current = index;
      const chunk = chunks[index];
      setChunkIndex(index + 1);
      setChunkTotal(chunks.length);
      setCurrentSpokenText(chunk.text);

      globalThis.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const chosenVoice = pickBestVoice(voices, chunk.lang, customSettings);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
        utterance.lang = chosenVoice.lang || chunk.lang;
      } else {
        utterance.lang = chunk.lang;
      }
      utterance.rate = customSettings.rate || 1;
      utterance.pitch = customSettings.pitch || 1;

      utterance.onstart = () => {
        if (sessionId !== speechSessionIdRef.current) return;
        setSpeaking(true);
        setPaused(false);
      };
      utterance.onend = () => {
        if (sessionId !== speechSessionIdRef.current) return;
        if (index + 1 < chunks.length) {
          playChunkAt(index + 1);
        } else {
          setSpeaking(false);
          setPaused(false);
          setCurrentSpokenText('');
        }
      };
      utterance.onerror = () => {
        if (sessionId !== speechSessionIdRef.current) return;
        setSpeaking(false);
        setPaused(false);
        setCurrentSpokenText('');
      };

      globalThis.speechSynthesis.speak(utterance);
    }

    playChunkAt(initialIndex);
  }, [readAloudSupported, settings, voices]);

  const startSpeakingText = useCallback((rawText, overrideSettings = settings) => {
    if (!readAloudSupported) {
      notify?.(en ? 'Read aloud is not supported in this browser.' : 'قراءة الرد بصوت غير مدعومة في المتصفح ده.');
      return;
    }
    const chunks = splitSpeechChunks(rawText, 210);
    if (!chunks.length) {
      notify?.(en ? 'Generate an answer first.' : 'أنشئ إجابة الأول عشان أقراها.');
      return;
    }
    const nextSession = speechSessionIdRef.current + 1;
    speechSessionIdRef.current = nextSession;
    activeChunksRef.current = chunks;
    speakChunkAt(0, nextSession, overrideSettings);
  }, [en, notify, readAloudSupported, settings, speakChunkAt]);

  useEffect(() => () => {
    shouldListenRef.current = false;
    globalThis.clearTimeout(restartTimerRef.current);
    globalThis.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.abort?.();
    stopAudioVisualizer();
    globalThis.speechSynthesis?.cancel?.();
  }, [stopAudioVisualizer]);

  useEffect(() => {
    const cleanAnswer = String(answer || '').trim();
    if (!cleanAnswer) {
      lastAutoSpokenAnswerRef.current = '';
      return;
    }
    if ((settings.autoSpeakReplies || settings.handsFreeAutoSend) && cleanAnswer !== lastAutoSpokenAnswerRef.current && readAloudSupported) {
      lastAutoSpokenAnswerRef.current = cleanAnswer;
      startSpeakingText(cleanAnswer, settings);
    }
  }, [answer, readAloudSupported, settings, startSpeakingText]);

  const publishTranscript = (interim = '') => {
    const formattedCommitted = applyVoiceTranscriptCommands(committedTextRef.current, settings);
    const formattedInterim = applyVoiceTranscriptCommands(interim, settings);
    setInterimPreview(formattedInterim);
    const dictated = [formattedCommitted, formattedInterim].filter(Boolean).join(' ').replace(/[ \t]+/g, ' ').trim();
    const full = [baseTextRef.current, dictated].filter(Boolean).join(' ').replace(/[ \t]+/g, ' ').trim();
    latestPublishedRef.current = full;
    onChange?.(full);
  };

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    globalThis.clearTimeout(restartTimerRef.current);
    globalThis.clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
    setInterimPreview('');
    stopAudioVisualizer();
    publishTranscript();
  }, [stopAudioVisualizer]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleHandsFreeSubmit = () => {
    if (!settings.handsFreeAutoSend || !onAutoSubmit) return;
    globalThis.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = globalThis.setTimeout(() => {
      const candidate = String(latestPublishedRef.current || '').trim();
      if (candidate.length >= 3 && shouldListenRef.current) {
        stopListening();
        onAutoSubmit(candidate);
      }
    }, settings.silenceSubmitMs || 2200);
  };

  function startRecognitionCycle() {
    if (!Recognition || !shouldListenRef.current) return;
    const recognition = new Recognition();
    recognition.lang = resolveRecognitionLanguage(settings, en ? 'en' : 'ar');
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
        committedTextRef.current = [committedTextRef.current, finalChunk.trim()].filter(Boolean).join(' ').replace(/[ \t]+/g, ' ').trim();
      }
      publishTranscript(interimChunk.trim());
      scheduleHandsFreeSubmit();
    };

    recognition.onerror = (event) => {
      const error = String(event?.error || '');
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
        shouldListenRef.current = false;
        setListening(false);
        stopAudioVisualizer();
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
      globalThis.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = globalThis.setTimeout(() => {
        if (shouldListenRef.current) startRecognitionCycle();
      }, 200);
    };

    try {
      recognition.start();
    } catch {
      globalThis.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = globalThis.setTimeout(() => {
        if (shouldListenRef.current) startRecognitionCycle();
      }, 320);
    }
  }

  const toggleListening = () => {
    if (!voiceInputSupported) {
      notify?.(en ? 'Voice input is not supported in this browser.' : 'الإدخال الصوتي غير مدعوم في المتصفح ده.');
      return;
    }
    if (shouldListenRef.current || listening) {
      stopListening();
      return;
    }

    stopSpeaking();
    baseTextRef.current = String(value || '').trim();
    committedTextRef.current = '';
    latestPublishedRef.current = baseTextRef.current;
    setElapsed(0);
    setInterimPreview('');
    shouldListenRef.current = true;
    startAudioVisualizer();
    startRecognitionCycle();
  };

  const toggleSpeaking = () => {
    if (speaking) {
      stopSpeaking();
      return;
    }
    startSpeakingText(answer, settings);
  };

  const togglePauseResume = () => {
    if (!speaking || !readAloudSupported) return;
    if (paused) {
      globalThis.speechSynthesis.resume?.();
      setPaused(false);
    } else {
      globalThis.speechSynthesis.pause?.();
      setPaused(true);
    }
  };

  const stepChunk = (delta) => {
    if (!speaking || !activeChunksRef.current.length) return;
    const nextIdx = Math.max(0, Math.min(activeChunksRef.current.length - 1, activeChunkIndexRef.current + delta));
    speakChunkAt(nextIdx, speechSessionIdRef.current, settings);
  };

  const toggleHandsFree = () => {
    const nextVal = !settings.handsFreeAutoSend;
    updateSettings({
      handsFreeAutoSend: nextVal,
      autoSpeakReplies: nextVal ? true : settings.autoSpeakReplies,
    });
    notify?.(nextVal
      ? (en ? 'Live Voice Conversation enabled: speak naturally and PathPilot will send and reply aloud automatically.' : 'تم تفعيل المحادثة الصوتية الحية: اتكلم براحتك وPathPilot هيرسل ويرد عليك بالصوت تلقائيًا.')
      : (en ? 'Live Voice Conversation turned off.' : 'تم إيقاف وضع المحادثة الصوتية التلقائية.'));
  };

  const testVoiceSample = () => {
    const sample = en ? 'Hello! PathPilot studio voice is active, clear, and ready to summarize and discuss your materials.' : 'أهلًا بيك في PathPilot! منظومة الصوت الذكية شغالة دلوقتي بوضوح وجاهزة تلخص وتناقش معاك كل المواد.';
    startSpeakingText(sample, settings);
  };

  const activeMicLabel = settings.micLang === 'auto'
    ? (en ? 'Auto (EN)' : 'تلقائي (مصري)')
    : settings.micLang === 'ar-EG'
      ? (en ? 'Arabic (Egypt)' : 'عربي مصري')
      : settings.micLang === 'ar-SA'
        ? (en ? 'Arabic (MSA)' : 'عربي فصحى')
        : 'English (US)';

  return (
    <div className={compact ? 'voice-controls-shell is-compact' : 'voice-controls-shell'}>
      <div className={listening ? 'voice-controls voice-studio-bar is-listening' : speaking ? 'voice-controls voice-studio-bar is-speaking' : 'voice-controls voice-studio-bar'}>
        <button
          className={compact ? 'voice-pill-button voice-mic-compact' : 'voice-record-button'}
          type="button"
          onClick={toggleListening}
          disabled={!voiceInputSupported}
          title={en ? 'Long-form voice input' : 'تسجيل صوتي طويل'}
          aria-label={en ? 'Long-form voice input' : 'تسجيل صوتي طويل'}
        >
          {compact ? (
            <>
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
              <span>{listening ? `${formatElapsed(elapsed)}` : (en ? 'Voice' : 'صوت')}</span>
            </>
          ) : (
            <>
              <span className="voice-record-icon">{listening ? <MicOff size={19} /> : <Mic size={19} />}</span>
              <span>
                <strong>{listening ? (en ? 'Stop recording' : 'إيقاف التسجيل') : (en ? 'Smart Voice Input' : 'تحدث بالصوت بمرونة')}</strong>
                <small>
                  {listening
                    ? `${formatElapsed(elapsed)} · ${activeMicLabel}`
                    : `${activeMicLabel} · ${en ? 'Continuous & punctuation-aware' : 'استماع مستمر وتنسيق ذكي للكلام'}`}
                </small>
              </span>
            </>
          )}
        </button>

        {listening && (
          <div className="voice-waveform" aria-hidden="true">
            {meterBars.map((height, idx) => (
              <span key={`bar-${idx}`} style={{ height: `${Math.max(20, height)}%` }} />
            ))}
          </div>
        )}

        <div className="voice-action-cluster">
          {onAutoSubmit && (
            <button
              type="button"
              className={settings.handsFreeAutoSend ? 'voice-pill-button is-active' : 'voice-pill-button'}
              onClick={toggleHandsFree}
              aria-pressed={settings.handsFreeAutoSend}
              title={en ? 'Hands-free voice conversation (auto-send & auto-reply aloud)' : 'حوار صوتي تفاعلي (إرسال تلقائي ورد صوتي)'}
            >
              <Radio size={14} />
              <span>{en ? 'Live Voice' : 'حوار حي'}</span>
            </button>
          )}

          <button
            className={speaking ? 'voice-read-button is-active' : 'voice-read-button'}
            type="button"
            onClick={toggleSpeaking}
            disabled={!readAloudSupported || !answer}
            title={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'}
            aria-label={en ? 'Read answer aloud' : 'اقرأ الإجابة بصوت'}
          >
            {speaking ? <Square size={14} /> : <Volume2 size={16} />}
            <span>{speaking ? (en ? 'Stop' : 'وقف الصوت') : (en ? 'Read' : 'اقرأ الرد')}</span>
          </button>

          {speaking && (
            <div className="voice-playback-transport">
              <button type="button" onClick={() => stepChunk(-1)} disabled={chunkIndex <= 1} title={en ? 'Previous sentence' : 'الجملة السابقة'} aria-label={en ? 'Previous sentence' : 'الجملة السابقة'}>
                <SkipBack size={13} />
              </button>
              <button type="button" onClick={togglePauseResume} title={paused ? (en ? 'Resume' : 'استئناف') : (en ? 'Pause' : 'إيقاف مؤقت')} aria-label={paused ? (en ? 'Resume' : 'استئناف') : (en ? 'Pause' : 'إيقاف مؤقت')}>
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
              <button type="button" onClick={() => stepChunk(1)} disabled={chunkIndex >= chunkTotal} title={en ? 'Next sentence' : 'الجملة التالية'} aria-label={en ? 'Next sentence' : 'الجملة التالية'}>
                <SkipForward size={13} />
              </button>
              <small className="voice-chunk-counter">{chunkIndex}/{chunkTotal}</small>
            </div>
          )}

          <button
            type="button"
            className={settingsOpen ? 'voice-settings-trigger is-active' : 'voice-settings-trigger'}
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-expanded={settingsOpen}
            title={en ? 'Voice & speech studio settings' : 'إعدادات استوديو الصوت والنطق'}
            aria-label={en ? 'Voice & speech studio settings' : 'إعدادات استوديو الصوت والنطق'}
          >
            <SlidersHorizontal size={14} />
            <span>{`${settings.rate}x`}</span>
          </button>

          {compact && (
            <button
              type="button"
              className={pinsOpen ? 'voice-settings-trigger is-active' : 'voice-settings-trigger'}
              onClick={() => setPinsOpen((prev) => !prev)}
              title={en ? 'Pinned prompts' : 'Prompts مثبتة'}
              aria-label={en ? 'Pinned prompts' : 'Prompts مثبتة'}
            >
              <Bookmark size={14} />
            </button>
          )}
        </div>
      </div>

      {listening && interimPreview && (
        <div className="voice-live-caption" role="status" aria-live="polite">
          <AudioLines size={15} />
          <span>{interimPreview}</span>
        </div>
      )}

      {speaking && currentSpokenText && (
        <div className="voice-spoken-subtitle" role="status" aria-live="polite">
          <Volume2 size={15} />
          <span>{currentSpokenText}</span>
        </div>
      )}

      {settingsOpen && (
        <section className="voice-studio-drawer" aria-label={en ? 'Voice & Speech Studio' : 'إعدادات الصوت والكلام'}>
          <div className="voice-studio-grid">
            <label>
              <span>{en ? 'Recognition dialect' : 'لهجة ولغة المايكروفون'}</span>
              <select value={settings.micLang} onChange={(event) => updateSettings({ micLang: event.target.value })}>
                <option value="auto">{en ? 'Automatic (follows app)' : 'تلقائي (مصري / English)'}</option>
                <option value="ar-EG">{en ? 'Egyptian Arabic (ar-EG)' : 'العربية — عامية مصرية (ar-EG)'}</option>
                <option value="ar-SA">{en ? 'Modern Standard Arabic (ar-SA)' : 'العربية الفصحى (ar-SA)'}</option>
                <option value="en-US">{en ? 'English (en-US)' : 'الإنجليزية (en-US)'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'Reading speed' : 'سرعة القراءة الصوتية'} ({settings.rate}x)</span>
              <select value={String(settings.rate)} onChange={(event) => updateSettings({ rate: Number(event.target.value) })}>
                <option value="0.8">{en ? '0.8x — Calm & clear' : '0.8x — هادئة للشرح المركّز'}</option>
                <option value="1">{en ? '1.0x — Natural' : '1.0x — طبيعية متوازنة'}</option>
                <option value="1.15">{en ? '1.15x — Brisk' : '1.15x — سريعة ومريحة'}</option>
                <option value="1.3">{en ? '1.3x — Fast review' : '1.3x — مراجعة سريعة'}</option>
                <option value="1.5">{en ? '1.5x — Turbo summary' : '1.5x — قراءة مكثفة'}</option>
                <option value="1.75">{en ? '1.75x — Ultra fast' : '1.75x — فائقة السرعة'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'Voice tone (Pitch)' : 'نبرة الصوت'}</span>
              <select value={String(settings.pitch)} onChange={(event) => updateSettings({ pitch: Number(event.target.value) })}>
                <option value="0.9">{en ? 'Warm & deep (0.9)' : 'عميقة وهادئة (0.9)'}</option>
                <option value="1">{en ? 'Natural studio (1.0)' : 'طبيعية واضحة (1.0)'}</option>
                <option value="1.1">{en ? 'Bright & energetic (1.1)' : 'حيوية ونشطة (1.1)'}</option>
              </select>
            </label>

            <label>
              <span>{en ? 'Arabic narrator voice' : 'صوت القارئ العربي'}</span>
              <select
                value={settings.preferredArabicVoice}
                onChange={(event) => updateSettings({ preferredArabicVoice: event.target.value })}
              >
                <option value="">{en ? 'Best available natural Arabic voice' : 'أفضل صوت عربي طبيعي متاح تلقائيًا'}</option>
                {arabicVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>{`${voice.name} (${voice.lang})`}</option>
                ))}
              </select>
            </label>

            <label>
              <span>{en ? 'English narrator voice' : 'صوت القارئ الإنجليزي'}</span>
              <select
                value={settings.preferredEnglishVoice}
                onChange={(event) => updateSettings({ preferredEnglishVoice: event.target.value })}
              >
                <option value="">{en ? 'Best available natural English voice' : 'أفضل صوت إنجليزي طبيعي متاح تلقائيًا'}</option>
                {englishVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>{`${voice.name} (${voice.lang})`}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="voice-studio-toggles">
            <label className="voice-check-pill">
              <input
                type="checkbox"
                checked={settings.autoSpeakReplies}
                onChange={(event) => updateSettings({ autoSpeakReplies: event.target.checked })}
              />
              <span>{en ? 'Auto-read every new reply aloud' : 'قراءة كل رد جديد بالصوت تلقائيًا'}</span>
            </label>

            <label className="voice-check-pill">
              <input
                type="checkbox"
                checked={settings.smartPunctuation}
                onChange={(event) => updateSettings({ smartPunctuation: event.target.checked })}
              />
              <span>{en ? 'Smart spoken punctuation (comma, period, new line)' : 'ترقيم صوتي ذكي (فصلة، نقطة، سطر جديد)'}</span>
            </label>

            <button type="button" className="voice-test-button" onClick={testVoiceSample}>
              <Volume2 size={14} /> {en ? 'Test voice' : 'اختبار الصوت الآن'}
            </button>
          </div>
        </section>
      )}

      {(!compact || pinsOpen) && <PinnedPrompts currentPrompt={value} onSelect={onChange} notify={notify} />}
    </div>
  );
}
