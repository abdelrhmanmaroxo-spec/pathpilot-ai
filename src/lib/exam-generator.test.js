import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractPastOnlineExamQuestions,
  generateInteractiveExam,
  gradeExamSubmission,
  hasOnlineExamSignal,
} from './exam-generator.js';
import { generateNaturalConversationalAnswer } from './natural-tutor.js';

test('hasOnlineExamSignal and extractPastOnlineExamQuestions detect user-pasted online exams', () => {
  const sample = `
دول امتحانات اونلاين كانت عندنا في مادة قواعد البيانات:
1) ما هو المفتاح الذي يميز كل صف في الجدول ولا يقبل NULL؟
أ) Foreign Key
ب) Primary Key (صحيحة)
ج) Candidate Index
د) View

2) صح أم خطأ: بروتوكول TCP لا يضمن وصول البيانات بالترتيب. (صح / خطأ)
الإجابة: خطأ
  `;

  assert.equal(hasOnlineExamSignal(sample), true);
  const extracted = extractPastOnlineExamQuestions(sample);
  assert.equal(extracted.length, 2);
  assert.equal(extracted[0].type, 'mcq');
  assert.equal(extracted[0].correctIndex, 1);
  assert.equal(extracted[1].type, 'tf');
  assert.equal(extracted[1].correctIndex, 1);
});

test('generateInteractiveExam builds complete graded interactive exam and scores answers accurately', () => {
  const exam = generateInteractiveExam({
    title: 'امتحان قواعد البيانات',
    topic: 'SQL Databases',
    questionCount: 6,
    questionTypes: 'mixed',
    language: 'ar',
  });

  assert.equal(exam.questions.length, 6);
  const perfectAnswers = {};
  for (const q of exam.questions) {
    perfectAnswers[q.id] = q.correctIndex;
  }

  const report = gradeExamSubmission(exam, perfectAnswers);
  assert.equal(report.percentage, 100);
  assert.equal(report.correctCount, 6);
  assert.equal(report.wrongCount, 0);
  assert.equal(report.grade, 'A+');
});

test('natural tutor answers naturally without debug banners and highlights online exams when mentioned', () => {
  const examReply = generateNaturalConversationalAnswer({
    prompt: 'دول امتحانات اونلاين كانت عندنا:\n1. أي بروتوكول يشفر اتصال الويب؟\nA) HTTP\nB) HTTPS (صح)\nC) FTP\nD) DNS',
  });
  assert.match(examReply, /امتحانات أونلاين/);
  assert.doesNotMatch(examReply, /Local Intelligence Beta/);

  const normalReply = generateNaturalConversationalAnswer({
    prompt: 'اشرحلي الفرق بين React و Vue في الشغل',
  });
  assert.doesNotMatch(normalReply, /Local Intelligence Beta/);
  assert.ok(normalReply.length > 40);
});
