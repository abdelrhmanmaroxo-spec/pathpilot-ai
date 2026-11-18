import { useEffect, useRef, useState } from 'react';
import {
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CornerUpLeft,
  FileDown,
  Sparkles,
  Square,
  UserRound,
  Volume2,
} from 'lucide-react';
import ResponseContent from './ResponseContent.jsx';
import { getDocumentLanguage, subscribeLanguageChanges } from '../lib/language-state.js';
import {
  loadVoiceSettings,
  pickBestVoice,
  splitSpeechChunks,
} from '../lib/voice-engine.js';

export default function ConversationThread({ turns = [], onReuse, onExportTurnPdf, maxTurns = 200 }) {
  const [lang, setLang] = useState(getDocumentLanguage);
  const [speakingTurnId, setSpeakingTurnId] = useState('');
  const [copiedTurnId, setCopiedTurnId] = useState('');
  const [expandedPrompts, setExpandedPrompts] = useState({});
  const sessionRef = useRef(0);

  useEffect(() => subscribeLanguageChanges(setLang), []);

  useEffect(() => () => {
    sessionRef.current += 1;
    globalThis.speechSynthesis?.cancel?.();
  }, []);

  if (!turns.length) return null;
  const en = lang === 'en';
  const visibleTurns = turns.slice(-Math.max(1, Number(maxTurns || 200)));
  const canSpeak = Boolean(globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance);

  const toggleTurnSpeech = (turn) => {
    if (!canSpeak) return;
    if (speakingTurnId === turn.id) {
      sessionRef.current += 1;
      globalThis.speechSynthesis.cancel();
      setSpeakingTurnId('');
      return;
    }

    const chunks = splitSpeechChunks(turn.answer, 210);
    if (!chunks.length) return;

    const settings = loadVoiceSettings();
    const voices = globalThis.speechSynthesis?.getVoices?.() || [];
    const currentSession = sessionRef.current + 1;
    sessionRef.current = currentSession;
    setSpeakingTurnId(turn.id);

    const speakIndex = (idx) => {
      if (currentSession !== sessionRef.current) return;
      if (idx >= chunks.length) {
        setSpeakingTurnId('');
        return;
      }
      globalThis.speechSynthesis.cancel();
      const chunk = chunks[idx];
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const voice = pickBestVoice(voices, chunk.lang, settings);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || chunk.lang;
      } else {
        utterance.lang = chunk.lang;
      }
      utterance.rate = settings.rate || 1;
      utterance.pitch = settings.pitch || 1;
      utterance.onend = () => speakIndex(idx + 1);
      utterance.onerror = () => setSpeakingTurnId('');
      globalThis.speechSynthesis.speak(utterance);
    };

    speakIndex(0);
  };

  const copyTurnAnswer = async (turn) => {
    if (!turn?.answer) return;
    try {
      await globalThis.navigator?.clipboard?.writeText?.(turn.answer);
      setCopiedTurnId(turn.id);
      globalThis.setTimeout(() => {
        setCopiedTurnId((current) => (current === turn.id ? '' : current));
      }, 1600);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <section className="conversation-thread chatgpt-thread" aria-label={en ? 'Conversation messages' : 'رسائل المحادثة'}>
      {visibleTurns.map((turn, idx) => {
        const promptText = String(turn.prompt || '');
        const isLongPrompt = promptText.length > 340 || promptText.split('\n').length > 6;
        const isPromptExpanded = Boolean(expandedPrompts[turn.id]);
        const displayedPrompt = isLongPrompt && !isPromptExpanded
          ? `${promptText.slice(0, 290).trim()}…`
          : promptText;

        return (
          <article
            key={turn.id}
            data-turn-index={idx}
            className={turn.streaming ? 'conversation-turn chatgpt-turn is-streaming' : 'conversation-turn chatgpt-turn'}
          >
            <div className="chatgpt-user-row">
              <div className="conversation-user-bubble chatgpt-user-bubble">
                <div className="chatgpt-user-head">
                  <strong><UserRound size={14} /> {en ? 'You' : 'أنت'}</strong>
                  <div className="chatgpt-user-actions">
                    {isLongPrompt && (
                      <button
                        type="button"
                        className="turn-inline-action"
                        onClick={() => setExpandedPrompts((prev) => ({ ...prev, [turn.id]: !prev[turn.id] }))}
                      >
                        {isPromptExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        <span>{isPromptExpanded ? (en ? 'Collapse' : 'طي النص') : (en ? 'Show full' : 'عرض الكل')}</span>
                      </button>
                    )}
                    {onReuse && (
                      <button
                        type="button"
                        className="turn-inline-action"
                        onClick={() => onReuse(turn.rawPrompt || turn.prompt)}
                        title={en ? 'Edit and resubmit' : 'تعديل وإعادة الإرسال'}
                        aria-label={en ? 'Edit and resubmit' : 'تعديل وإعادة الإرسال'}
                      >
                        <CornerUpLeft size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p>{displayedPrompt}</p>
              </div>
            </div>

            <div className="conversation-assistant-answer chatgpt-assistant-row" aria-live={turn.streaming ? 'polite' : undefined}>
              <div className="chatgpt-assistant-avatar" aria-hidden="true">
                <Sparkles size={16} />
              </div>
              <div className="chatgpt-assistant-body">
                <div className="conversation-assistant-head">
                  <strong>PathPilot AI</strong>
                  {turn.answer && !turn.streaming && (
                    <div className="conversation-turn-tools">
                      {canSpeak && (
                        <button
                          type="button"
                          className={speakingTurnId === turn.id ? 'turn-inline-action is-speaking' : 'turn-inline-action'}
                          onClick={() => toggleTurnSpeech(turn)}
                          title={speakingTurnId === turn.id ? (en ? 'Stop reading' : 'إيقاف القراءة') : (en ? 'Listen to this reply' : 'استمع لهذا الرد')}
                          aria-label={speakingTurnId === turn.id ? (en ? 'Stop reading' : 'إيقاف القراءة') : (en ? 'Listen to this reply' : 'استمع لهذا الرد')}
                        >
                          {speakingTurnId === turn.id ? <Square size={12} /> : <Volume2 size={13} />}
                          <span>{speakingTurnId === turn.id ? (en ? 'Stop' : 'إيقاف') : (en ? 'Listen' : 'استماع')}</span>
                        </button>
                      )}
                      {onExportTurnPdf && (
                        <button
                          type="button"
                          className="turn-inline-action"
                          onClick={() => onExportTurnPdf(turn)}
                          title={en ? 'Export as Curriculum PDF' : 'تحويل لملف PDF منظم'}
                          aria-label={en ? 'Export as Curriculum PDF' : 'تحويل لملف PDF منظم'}
                        >
                          <FileDown size={13} />
                          <span>PDF</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="turn-inline-action"
                        onClick={() => copyTurnAnswer(turn)}
                        title={en ? 'Copy reply' : 'نسخ الرد'}
                        aria-label={en ? 'Copy reply' : 'نسخ الرد'}
                      >
                        {copiedTurnId === turn.id ? <Check size={12} /> : <Copy size={13} />}
                        <span>{copiedTurnId === turn.id ? (en ? 'Copied' : 'تم النسخ') : (en ? 'Copy' : 'نسخ')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {turn.thinkingTrace?.steps?.length > 0 && (
                  <details className="thinking-trace-card">
                    <summary>
                      <BrainCircuit size={14} />
                      <span>{en ? 'Structured Thinking & Synthesis Steps' : 'مسار التفكير والدمج المنطقي'}</span>
                    </summary>
                    <ol className="thinking-trace-steps">
                      {turn.thinkingTrace.steps.map((step) => (
                        <li key={step.id}>
                          <strong>{step.title}</strong>
                          <span>{step.detail}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                {turn.answer ? <ResponseContent answer={turn.answer} /> : null}
                {turn.streaming && <span className="chat-stream-caret" aria-hidden="true" />}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
