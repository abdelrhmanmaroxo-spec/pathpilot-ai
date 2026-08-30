import { detectConversationLanguage } from './conversation-intent.js';
import { localConversationalReply } from './local-conversation.js';
import {
  adaptArabicConversationalReply,
  detectStrongUserGrammaticalGender,
  parseGrammarGenderHint,
} from './conversation-grammar.js';

function hasRelevantPriorTurns(contextPrompt) {
  const match = String(contextPrompt || '').match(/Relevant prior turns:\s*(\d+)/i);
  return Number(match?.[1] || 0) > 0;
}

export function contextualConversationalReply(prompt, options = {}) {
  const language = options.language === 'ar' || options.language === 'en'
    ? options.language
    : detectConversationLanguage(prompt);
  const answer = localConversationalReply(prompt, {
    ...options,
    language,
    hasPriorContext: options.hasPriorContext === true || hasRelevantPriorTurns(options.contextPrompt),
  });
  if (!answer || language !== 'ar') return answer;

  const gender = parseGrammarGenderHint(options.contextPrompt)
    || detectStrongUserGrammaticalGender(prompt);
  return adaptArabicConversationalReply(answer, gender);
}
