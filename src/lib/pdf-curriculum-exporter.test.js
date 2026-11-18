import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCurriculumSummaryData,
  renderCurriculumPdfHtml,
} from './pdf-curriculum-exporter.js';

test('buildCurriculumSummaryData honors custom user template, language, and section toggles', () => {
  const data = buildCurriculumSummaryData({
    materials: [
      { title: 'المحاضرة 1: نظم التشغيل', content: 'إدارة العمليات تتحكم في جدولة المعالج وتخصيص الذاكرة بكفاءة عالية لمنع التوقف التام Deadlock.' },
      { title: 'المحاضرة 2: الذاكرة الافتراضية', content: 'الذاكرة الافتراضية تسمح بتشغيل برامج أكبر من الذاكرة الفعلية عبر تقسيم الصفحات Paging.' },
    ],
    options: {
      courseTitle: 'Operating Systems Final Guide',
      template: 'cornell',
      theme: 'emerald',
      language: 'en',
      density: 'detailed',
      customInstructions: 'Focus on Paging vs Deadlock',
      includeExamBank: true,
      includeStudyChecklist: false,
    },
    uiLanguage: 'en',
  });

  assert.equal(data.language, 'en');
  assert.equal(data.dir, 'ltr');
  assert.equal(data.stats.unitCount, 2);
  assert.equal(data.options.includeStudyChecklist, false);

  const html = renderCurriculumPdfHtml(data);
  assert.match(html, /CORNELL ACADEMIC STUDY SYSTEM/);
  assert.match(html, /Operating Systems Final Guide/);
  assert.match(html, /Focus on Paging vs Deadlock/);
  assert.doesNotMatch(html, /Self-Assessment Mastery Checklist/);
});
