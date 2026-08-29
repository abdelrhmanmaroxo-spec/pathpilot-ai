const MAX_MODEL_LOAD_ATTEMPTS = 3;

function memoryGb() {
  return Math.max(2, Number(globalThis.navigator?.deviceMemory || 4));
}

export function localDeviceProfile(memory = memoryGb()) {
  if (memory >= 16) return 'expert';
  if (memory >= 8) return 'strong';
  return 'lite';
}

function preferredModels(profile) {
  if (profile === 'expert') {
    return [
      'Qwen3-4B-q4f16_1-MLC',
      'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      'Qwen3-1.7B-q4f16_1-MLC',
      'Qwen3.5-0.8B-q4f16_1-MLC',
      'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    ];
  }
  if (profile === 'strong') {
    return [
      'Qwen3-1.7B-q4f16_1-MLC',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      'Qwen3.5-0.8B-q4f16_1-MLC',
      'Qwen3-0.6B-q4f16_1-MLC',
      'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    ];
  }
  return [
    'Qwen3.5-0.8B-q4f16_1-MLC',
    'Qwen3-0.6B-q4f16_1-MLC',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    'Qwen3-1.7B-q4f16_1-MLC',
  ];
}

function findModelId(ids, fragment) {
  return ids.find((id) => id === fragment) || ids.find((id) => id.toLowerCase().includes(fragment.toLowerCase()));
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

export function localModelCandidates(ids, memory = memoryGb()) {
  if (!Array.isArray(ids) || !ids.length) throw new Error('LOCAL_LLM_MODEL_LIST_EMPTY');
  const profile = localDeviceProfile(memory);
  const candidates = [];

  for (const preferred of preferredModels(profile)) pushUnique(candidates, findModelId(ids, preferred));

  if (profile === 'expert') pushUnique(candidates, ids.find((id) => /(?:qwen|llama|phi).*(?:3b|4b).*?(?:instruct|q4f16)/i.test(id)));
  pushUnique(candidates, ids.find((id) => /qwen.*(?:0\.6|0\.8|1\.5|1\.7)b.*q4f16/i.test(id)));
  pushUnique(candidates, ids.find((id) => /(?:0\.5b|0\.6b|0\.8b|1b|1\.5b|1\.7b).*instruct/i.test(id)));

  for (const id of ids) if (/(?:qwen|llama|phi).*(?:instruct|q4f16)/i.test(id)) pushUnique(candidates, id);
  if (!candidates.length) throw new Error('LOCAL_LLM_COMPATIBLE_MODEL_NOT_FOUND');
  return candidates;
}

export function selectLocalModelId(ids, memory = memoryGb()) {
  return localModelCandidates(ids, memory)[0];
}

export function localModelScale(modelId = '') {
  const match = String(modelId).match(/(\d+(?:\.\d+)?)b/i);
  return match ? Number(match[1]) : 1;
}

export function localModelLoadCandidates(ids, memory = memoryGb()) {
  return localModelCandidates(ids, memory).slice(0, MAX_MODEL_LOAD_ATTEMPTS);
}
