"use client";

import { useMemo, useState } from "react";

type SurveyQuestion = {
  text?: string;
  label?: string;
  options?: any[];
  optional?: boolean;
  placeholder?: string;
  rows?: number;
};

type PartnersFeedbackSurveyProps = {
  questions: SurveyQuestion[];
  submitText?: string;
  disclaimerHtml?: string;
};

const isSuspicious = (value: string) => {
  const v = String(value || "").toLowerCase();
  return (
    /<\s*script|<\/\s*script|javascript:|onerror=|onload=/.test(v) ||
    /\b(system|assistant|user)\s*:/.test(v) ||
    /```|<\s*\/?\s*(html|body|iframe)\b/.test(v) ||
    /\b(drop|delete|truncate|insert|update)\b\s+\b(table|from|into)\b/.test(v) ||
    /(?:\bshutdown\b|\bexec\b|\bsubprocess\b)/.test(v)
  );
};

export default function PartnersFeedbackSurvey({
  questions,
  submitText,
  disclaimerHtml,
}: PartnersFeedbackSurveyProps) {
  const surveyQuestions = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const [answers, setAnswers] = useState(() => surveyQuestions.map(() => ""));
  const [errors, setErrors] = useState(() => surveyQuestions.map(() => ""));

  const updateAnswer = (idx: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    setErrors((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      next[idx] = "";
      return next;
    });
  };

  const handleSubmit = () => {
    const nextErrors = surveyQuestions.map((question, idx) => {
      const optional = Boolean(question?.optional);
      const value = String(answers[idx] || "").trim();
      const options = Array.isArray(question?.options) ? question.options.filter(Boolean) : [];
      if (optional && !value) return "";
      if (options.length && !value) return "Ответьте на вопрос.";
      if (!options.length && !value) return "Заполните поле.";
      if (!options.length && isSuspicious(value)) {
        return "Обнаружены недопустимые символы или команды.";
      }
      return "";
    });
    setErrors(nextErrors);
    const firstError = nextErrors.findIndex((err) => Boolean(err));
    if (firstError >= 0) {
      const target = document.getElementById(`survey-q-${firstError}`);
      if (target?.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-10 flex flex-col gap-8" data-form-panel>
      {surveyQuestions.map((question, idx) => {
        const title = String(question?.text || question?.label || `Вопрос ${idx + 1}`);
        const options = Array.isArray(question?.options) ? question.options.filter(Boolean) : [];
        const error = errors[idx];
        return (
          <section key={`survey-q-${idx}`} id={`survey-q-${idx}`} className="space-y-4">
            <h3 className="text-white text-lg font-bold tracking-tight">{title}</h3>
            {options.length > 0 ? (
              <div className="flex flex-col gap-3">
                {options.map((opt: any, optIdx: number) => {
                  const value = opt?.value ?? opt?.key ?? opt?.label ?? opt;
                  const text = opt?.label ?? opt?.text ?? opt?.name ?? opt;
                  return (
                    <label
                      key={`${value}-${optIdx}`}
                      className="flex items-center gap-4 cursor-pointer group"
                    >
                      <input
                        className="w-5 h-5 border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                        name={`survey_q_${idx + 1}`}
                        type="radio"
                        value={String(value)}
                        checked={answers[idx] === String(value)}
                        onChange={(event) => updateAnswer(idx, event.target.value)}
                      />
                      <span className="text-white/80 group-hover:text-white transition-colors">
                        {String(text)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder={question?.placeholder || "Напишите здесь свой ответ..."}
                rows={question?.rows || 4}
                value={answers[idx]}
                onChange={(event) => updateAnswer(idx, event.target.value)}
              />
            )}
            {error && <div className="text-xs text-red-400">{error}</div>}
          </section>
        );
      })}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
        <p
          className="text-white/40 text-xs max-w-sm text-center md:text-left"
          dangerouslySetInnerHTML={{
            __html:
              disclaimerHtml ||
              "Нажимая кнопку «Отправить», вы соглашаетесь с условиями обработки персональных данных.",
          }}
        />
        <button
          className="glow-button w-full md:w-auto flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-primary text-white text-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
          type="button"
          onClick={handleSubmit}
        >
          <span>{submitText || "Отправить"}</span>
        </button>
      </div>
    </div>
  );
}
