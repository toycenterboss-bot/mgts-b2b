import LeftMenu from "@/components/navigation/LeftMenu";

type FormSectionProps = {
  section: any;
  deepNavKey?: string | null;
  rootSlug?: string;
  currentSlug?: string;
};

const renderField = (field: any, idx: number) => {
  const key = `${field?.type || "field"}-${idx}`;
  const label = field?.label || field?.text || "";
  const placeholder = field?.placeholder || "";
  const optional = field?.optional ? " (необязательно)" : "";

  switch (field?.type) {
    case "textarea":
      return (
        <label key={key} className="flex flex-col gap-2">
          {label && (
            <span className="text-white text-xl font-bold tracking-tight">
              {label}
              {optional}
            </span>
          )}
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            placeholder={placeholder}
            maxLength={field?.maxLength || undefined}
            rows={field?.rows || 4}
          />
          {field?.description && <span className="text-white/60 text-sm">{field.description}</span>}
        </label>
      );
    case "select":
      return (
        <label key={key} className="flex flex-col gap-2">
          {label && (
            <span className="text-white text-xl font-bold tracking-tight">
              {label}
              {optional}
            </span>
          )}
          <select
            className="w-full bg-white/5 border border-white/10 rounded-xl h-14 px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            defaultValue=""
          >
            <option value="" disabled>
              {placeholder || "Выберите"}
            </option>
            {(field?.options || []).map((opt: any, optIdx: number) => {
              const value = opt?.value ?? opt?.key ?? opt?.label ?? opt;
              const text = opt?.label ?? opt?.text ?? opt?.name ?? opt;
              return (
                <option key={`${value}-${optIdx}`} value={value}>
                  {text}
                </option>
              );
            })}
          </select>
          {field?.description && <span className="text-white/60 text-sm">{field.description}</span>}
        </label>
      );
    case "file":
      return (
        <label key={key} className="flex flex-col gap-2">
          {label && (
            <span className="text-white text-xl font-bold tracking-tight">
              {label}
              {optional}
            </span>
          )}
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white file:text-white"
            type="file"
            accept={field?.accept || undefined}
          />
          {field?.description && <span className="text-white/60 text-sm">{field.description}</span>}
        </label>
      );
    case "button":
      return (
        <div key={key} className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
          <button
            className="glow-button w-full md:w-auto flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-primary text-white text-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
            type="submit"
          >
            <span>{field?.text || "Отправить ответ"}</span>
          </button>
        </div>
      );
    case "input":
    default:
      return (
        <label key={key} className="flex flex-col gap-2">
          {label && (
            <span className="text-white text-xl font-bold tracking-tight">
              {label}
              {optional}
            </span>
          )}
          <input
            className="w-full bg-white/5 border border-white/10 rounded-xl h-14 px-4 text-white placeholder:text-white/20 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            type={field?.inputType || "text"}
            placeholder={placeholder}
          />
          {field?.description && <span className="text-white/60 text-sm">{field.description}</span>}
        </label>
      );
  }
};

export default async function FormSection({
  section,
  deepNavKey,
  rootSlug,
  currentSlug = "",
}: FormSectionProps) {
  if (!section) return null;
  const elements = Array.isArray(section.elements) ? section.elements : [];
  const hasLeftMenu = Boolean(deepNavKey);

  return (
    <section
      className="bg-background-light dark:bg-background-dark font-display text-white min-h-screen relative overflow-x-hidden"
      data-stitch-block="b2b_survey_and_feedback_form"
    >
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] light-leak-1 -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] light-leak-2 -z-10"></div>
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root">
        <div className="layout-container flex h-full grow flex-col">
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="w-full">
              <div className="mb-10">
                <div className="flex min-w-72 flex-col gap-3">
                  {section.title && (
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                      {section.title}
                    </h1>
                  )}
                  {section.subtitle && (
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl font-light">
                      {section.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className={`grid grid-cols-1${hasLeftMenu ? " lg:grid-cols-12" : ""} gap-8`}>
                {hasLeftMenu && (
                  <LeftMenu
                    rootSlug={rootSlug}
                    currentSlug={currentSlug}
                    deepNavKey={deepNavKey}
                    variant="form"
                    asideClassName="lg:col-span-3 pr-6 border-r border-white/10"
                  />
                )}
                <div className={hasLeftMenu ? "lg:col-span-9 lg:pl-6" : ""} data-form-content>
                  <div className="glass-panel rounded-3xl p-6 md:p-10 flex flex-col gap-10" data-form-panel>
                    <form className="flex flex-col gap-10" action="#" method="post">
                      {elements.map((field: any, idx: number) => renderField(field, idx))}
                      {!elements.some((f: any) => f?.type === "button") && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10">
                          {section.disclaimerHtml && (
                            <p
                              className="text-white/40 text-xs max-w-sm text-center md:text-left"
                              dangerouslySetInnerHTML={{ __html: section.disclaimerHtml }}
                            />
                          )}
                          <button
                            className="glow-button w-full md:w-auto flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-primary text-white text-lg font-bold transition-all hover:scale-[1.02] active:scale-95"
                            type="submit"
                          >
                            <span>{section.submitText || "Отправить ответ"}</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
