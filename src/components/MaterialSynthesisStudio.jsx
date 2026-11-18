import { useRef, useState } from 'react';
import {
  BrainCircuit,
  FileDown,
  FilePlus2,
  FileText,
  Layers3,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildDeepThinkingTrace,
  buildMaterialPromptEnvelope,
  mergeMaterials,
  parseMaterialSources,
  summarizeMaterials,
} from '../lib/material-intelligence.js';
import CurriculumPdfModal from './CurriculumPdfModal.jsx';

let sourceItemSequence = 3;
function newSourceItem(title = '', content = '') {
  sourceItemSequence += 1;
  return {
    id: globalThis.crypto?.randomUUID?.() || `src-item-${sourceItemSequence}`,
    title,
    content,
  };
}

export default function MaterialSynthesisStudio({
  language = 'ar',
  onRunPrompt,
  onInstantAnswer,
  onGenerateCustomAiSummary,
  deepThink = false,
  onToggleDeepThink,
  notify,
  compact = false,
}) {
  const en = language === 'en';
  const [open, setOpen] = useState(!compact);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [materials, setMaterials] = useState(() => [
    { id: 'src-item-1', title: en ? 'Unit / Lecture 1' : 'الوحدة / المحاضرة 1', content: '' },
    { id: 'src-item-2', title: en ? 'Unit / Lecture 2' : 'الوحدة / المحاضرة 2', content: '' },
  ]);
  const [customFocus, setCustomFocus] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validMaterials = parseMaterialSources(materials);
  const totalWords = validMaterials.reduce((sum, item) => sum + item.wordCount, 0);

  const addEmptyMaterial = () => {
    setMaterials((current) => [
      ...current,
      newSourceItem(en ? `Unit / Lecture ${current.length + 1}` : `الوحدة / المحاضرة ${current.length + 1}`, ''),
    ]);
  };

  const updateMaterial = (id, patch) => {
    setMaterials((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeMaterial = (id) => {
    setMaterials((current) => {
      const filtered = current.filter((item) => item.id !== id);
      return filtered.length ? filtered : [newSourceItem(en ? 'Unit / Lecture 1' : 'الوحدة / المحاضرة 1', '')];
    });
  };

  const clearAllMaterials = () => {
    setMaterials([
      newSourceItem(en ? 'Unit / Lecture 1' : 'الوحدة / المحاضرة 1', ''),
      newSourceItem(en ? 'Unit / Lecture 2' : 'الوحدة / المحاضرة 2', ''),
    ]);
    setCustomFocus('');
  };

  const ingestFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 12);
    if (!files.length) return;
    const loaded = [];

    for (const file of files) {
      try {
        const text = await file.text();
        if (text && text.trim()) {
          loaded.push(newSourceItem(file.name.replace(/\.[^.]+$/, ''), text.slice(0, 35_000)));
        }
      } catch {
        // Skip unreadable binary files gracefully
      }
    }

    if (!loaded.length) {
      notify?.(en ? 'Could not read text from the selected file(s). Use .txt, .md, .csv, .json, or paste notes directly.' : 'تعذر قراءة نص من الملف؛ استخدم ملفات نصية (.txt, .md, .csv, .json) أو الصق المحاضرة مباشرة.');
      return;
    }

    setMaterials((current) => {
      const nonEmpty = current.filter((item) => item.content.trim());
      return [...nonEmpty, ...loaded];
    });
    setOpen(true);
    notify?.(en ? `Added ${loaded.length} material file(s) ready to summarize, merge, or export as PDF.` : `تم إرفاق ${loaded.length} ${loaded.length === 1 ? 'ملف جاهز' : 'ملفات جاهزة'} للتلخيص والدمج وتصدير الـ PDF.`);
  };

  const triggerAction = (action) => {
    if (!validMaterials.length) {
      notify?.(en ? 'Add or upload at least one lecture or curriculum text first.' : 'أضف أو ارفع مادة واحدة على الأقل (محاضرة، فصل، أو ملاحظات) أولًا.');
      return;
    }
    if (action === 'merge' && validMaterials.length < 2) {
      notify?.(en ? 'Add at least two materials so PathPilot can merge and cross-link them.' : 'أضف مادتين على الأقل عشان PathPilot يدمجهم ويربط النقاط المشتركة بينهم.');
      return;
    }

    const useDeep = action === 'think' ? true : deepThink;
    if (action === 'think' && !deepThink && onToggleDeepThink) {
      onToggleDeepThink(true);
    }

    const envelope = buildMaterialPromptEnvelope({
      action,
      materials: validMaterials,
      userPrompt: customFocus,
      deepThink: useDeep,
      language: en ? 'en' : 'ar',
    });

    const thinkingTrace = buildDeepThinkingTrace(customFocus || envelope, {
      materials: validMaterials,
      language: en ? 'en' : 'ar',
      intent: action === 'merge' ? 'synthesize & merge' : action === 'think' ? 'deep critical reasoning' : 'structured summary',
    });

    const instantSynthesis = action === 'merge'
      ? mergeMaterials(validMaterials, { language: en ? 'en' : 'ar', goal: customFocus })
      : summarizeMaterials(validMaterials, { depth: useDeep ? 'detailed' : 'balanced', language: en ? 'en' : 'ar', focus: customFocus });

    if (onRunPrompt) {
      onRunPrompt(envelope, {
        action,
        deepThink: useDeep,
        thinkingTrace,
        localPreview: instantSynthesis,
        materialCount: validMaterials.length,
      });
      return;
    }

    onInstantAnswer?.(instantSynthesis, thinkingTrace);
  };

  return (
    <section
      className={dragActive ? 'material-studio is-dragging' : 'material-studio'}
      aria-label={en ? 'Material Summarizer, Merger & Curriculum PDF Studio' : 'استوديو تلخيص ودمج المواد وملخصات PDF'}
      onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        ingestFiles(event.dataTransfer?.files);
      }}
    >
      <div className="material-studio-bar">
        <button
          type="button"
          className={open ? 'material-studio-toggle active' : 'material-studio-toggle'}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Layers3 size={16} />
          <strong>{en ? 'Curriculum Merge, Summary & PDF Studio' : 'استوديو تلخيص ودمج المنهج + PDF'}</strong>
          {validMaterials.length > 0 && (
            <span className="material-count-pill">
              {validMaterials.length} {en ? 'units' : 'وحدات'} · {totalWords.toLocaleString(en ? 'en-US' : 'ar-EG')} {en ? 'words' : 'كلمة'}
            </span>
          )}
        </button>

        <div className="material-quick-actions">
          <button
            type="button"
            className="material-pdf-trigger"
            onClick={() => setPdfModalOpen(true)}
          >
            <FileDown size={14} /> {en ? 'Build Curriculum PDF' : 'ملخص PDF للمنهج'}
          </button>
          <button
            type="button"
            className="material-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} /> {en ? 'Upload files' : 'رفع ملازم / ملفات'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml"
            style={{ display: 'none' }}
            onChange={(event) => {
              ingestFiles(event.target.files);
              event.target.value = '';
            }}
          />
          {onToggleDeepThink && (
            <button
              type="button"
              className={deepThink ? 'material-deep-chip active' : 'material-deep-chip'}
              aria-pressed={deepThink}
              onClick={() => onToggleDeepThink(!deepThink)}
            >
              <BrainCircuit size={14} /> {en ? 'Deep Think' : 'تفكير عميق'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="material-studio-body">
          <p className="material-studio-hint">
            {en
              ? 'Paste multiple lectures or chapters — or drag & drop files — to summarize, merge without repetition, or export a custom A4 Curriculum PDF.'
              : 'الصق فصول المنهج أو المحاضرات — أو اسحب الملفات النصية — ولخّصها، ادمجها بدون تكرار، أو صمّم ملخص PDF احترافي للمنهج حسب اختيارك.'}
          </p>

          <div className="material-cards-grid">
            {materials.map((item, index) => {
              const wordCount = item.content.trim() ? item.content.trim().split(/\s+/).length : 0;
              return (
                <div className="material-source-card" key={item.id}>
                  <div className="material-source-head">
                    <FileText size={15} />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(event) => updateMaterial(item.id, { title: event.target.value })}
                      placeholder={en ? `Unit ${index + 1} title` : `عنوان الفصل / المحاضرة ${index + 1}`}
                      aria-label={en ? `Unit ${index + 1} title` : `عنوان المادة ${index + 1}`}
                    />
                    <small>{wordCount} {en ? 'w' : 'كلمة'}</small>
                    <button
                      type="button"
                      className="material-remove-btn"
                      onClick={() => removeMaterial(item.id)}
                      title={en ? 'Remove source' : 'حذف المادة'}
                      aria-label={en ? 'Remove source' : 'حذف المادة'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={item.content}
                    onChange={(event) => updateMaterial(item.id, { content: event.target.value })}
                    placeholder={en ? 'Paste curriculum chapter, lecture notes, or key rules here…' : 'الصق نص الفصل، المحاضرة، أو القوانين المراد تلخيصها ودمجها هنا…'}
                  />
                </div>
              );
            })}
          </div>

          <div className="material-focus-row">
            <input
              type="text"
              value={customFocus}
              onChange={(event) => setCustomFocus(event.target.value)}
              placeholder={en ? 'Custom focus (e.g. Focus on exam laws, comparisons, and essay questions)…' : 'توجيه مخصص (مثال: ركّز على القوانين، المقارنات، وأسئلة الامتحان المتوقعة)…'}
            />
            <button type="button" className="material-secondary-btn" onClick={addEmptyMaterial}>
              <FilePlus2 size={15} /> {en ? 'Add unit' : 'إضافة فصل آخر'}
            </button>
            {validMaterials.length > 0 && (
              <button type="button" className="material-secondary-btn danger" onClick={clearAllMaterials}>
                <Trash2 size={14} /> {en ? 'Clear' : 'تفريغ'}
              </button>
            )}
          </div>

          <div className="material-action-buttons">
            <button type="button" className="material-primary-action summarize" onClick={() => triggerAction('summarize')}>
              <Sparkles size={16} /> {en ? 'Summarize Curriculum' : 'لخّص المواد بذكاء'}
            </button>
            <button type="button" className="material-primary-action merge" onClick={() => triggerAction('merge')}>
              <Layers3 size={16} /> {en ? 'Merge Units Together' : 'ادمج المواد في ملخص موحد'}
            </button>
            <button type="button" className="material-primary-action think" onClick={() => triggerAction('think')}>
              <BrainCircuit size={16} /> {en ? 'Deep Think & Connect' : 'فكّر بعمق واستخرج الروابط'}
            </button>
            <button type="button" className="material-primary-action pdf" onClick={() => setPdfModalOpen(true)}>
              <FileDown size={16} /> {en ? 'Custom Curriculum PDF' : 'تصدير ملخص PDF مخصص'}
            </button>
          </div>
        </div>
      )}

      <CurriculumPdfModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        language={en ? 'en' : 'ar'}
        materials={validMaterials}
        rawText={customFocus}
        defaultTitle={validMaterials[0]?.title || (en ? 'Curriculum Summary' : 'ملخص المنهج الشامل')}
        onGenerateCustomAiSummary={onGenerateCustomAiSummary}
        notify={notify}
      />
    </section>
  );
}
