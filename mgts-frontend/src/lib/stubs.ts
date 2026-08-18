/**
 * Механизм заглушек (PLAN-01 §2.2, задача B-27).
 *
 * Правило: нет вводной — ставим заглушку, а не паузу. Заглушка обязана быть
 * видимой в данных, видимой на стенде и НЕВОЗМОЖНОЙ в проде.
 *
 * Здесь — только правила. Обход страниц и падение сборки — в scripts/check-stubs.mts,
 * чтобы правила можно было проверить мутациями без сети и без Strapi.
 */

export type StubStatus = "stub" | "draft" | "approved";

export interface StubMeta {
  status?: StubStatus;
  owner?: string;
  due?: string;
  expectedForm?: string;
  source?: string;
  approvedBy?: string;
  approvedAt?: string;
  note?: string;
}

/** Любой блок, несущий заглушку: компонент секции, показатель, отзыв, логотип. */
export interface StubbedBlock {
  /** где это лежит — путь для отчёта: «/business → fact-strip[2].value» */
  where: string;
  /** видимое значение: число, текст, цитата. Пусто — если значения ещё нет. */
  value?: string | null;
  /** для показателей: кому адресована цифра */
  audience?: "client" | "company";
  stub?: StubMeta | null;
}

export interface Violation {
  where: string;
  rule: string;
  message: string;
}

const DIGITS = /\d/;
/** Дата «сегодня» приходит снаружи: время — это вход, а не факт из воздуха. */
export type Today = Date;

/**
 * Р-1. В статусе `stub` цифры запрещены.
 * Иначе правдоподобное число из головы неотличимо от настоящего (К-14, К-07).
 */
function ruleNoDigitsInStub(b: StubbedBlock): Violation | null {
  if (b.stub?.status !== "stub") return null;
  if (b.value && DIGITS.test(b.value)) {
    return {
      where: b.where,
      rule: "Р-1 цифра в заглушке",
      message: `значение «${b.value}» содержит цифры при status: stub — настоящее число живёт только в draft (с source) или approved`,
    };
  }
  return null;
}

/**
 * Р-2. `stub` без `expectedForm` — это «нужны данные», то есть бесполезно.
 * Владелец должен видеть форму ответа: единицу, знак, порядок.
 */
function ruleStubNeedsExpectedForm(b: StubbedBlock): Violation | null {
  if (b.stub?.status !== "stub") return null;
  if (!b.stub.expectedForm?.trim()) {
    return {
      where: b.where,
      rule: "Р-2 заглушка без формы ответа",
      message: "при status: stub обязателен expectedForm — «⟨N⟩ кВт на стойку», «⟨N⟩ раб. дней»",
    };
  }
  return null;
}

/** Р-3. `draft` обязан назвать источник: цифра из документа, а не из головы. */
function ruleDraftNeedsSource(b: StubbedBlock): Violation | null {
  if (b.stub?.status !== "draft") return null;
  if (!b.stub.source?.trim()) {
    return {
      where: b.where,
      rule: "Р-3 черновик без источника",
      message: "при status: draft обязателен source — «стратегия 2027–2029, с. 47»",
    };
  }
  return null;
}

/** Р-4. `approved` без следа согласования — это `stub`, которому дописали статус. */
function ruleApprovedNeedsProof(b: StubbedBlock): Violation | null {
  if (b.stub?.status !== "approved") return null;
  const missing = (["source", "approvedBy", "approvedAt"] as const).filter(
    (k) => !b.stub?.[k]?.trim()
  );
  if (missing.length) {
    return {
      where: b.where,
      rule: "Р-4 согласование без следа",
      message: `status: approved, но не заполнено: ${missing.join(", ")}`,
    };
  }
  return null;
}

/**
 * Р-5. Показатель с `audience: company` на публичной странице.
 * «×4 роста выручки» — наша метрика, не польза клиента. Класс К-14,
 * уже случалось на этом проекте, поймал владелец.
 */
function ruleNoCompanyMetrics(b: StubbedBlock): Violation | null {
  if (b.audience !== "company") return null;
  return {
    where: b.where,
    rule: "Р-5 своя метрика вместо клиентской",
    message: "audience: company на публичной странице — цифра говорит о нас, а не о пользе клиента",
  };
}

/** Р-6. Просроченная заглушка: без срока годности пометка становится мебелью. */
function ruleOverdue(b: StubbedBlock, today: Today): Violation | null {
  const s = b.stub;
  if (!s || s.status === "approved" || !s.due) return null;
  const due = new Date(s.due);
  if (Number.isNaN(due.getTime())) return null;
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (days > 14) {
    return {
      where: b.where,
      rule: "Р-6 заглушка просрочена",
      message: `срок ${s.due} истёк ${days} дн. назад, ждёт: ${s.owner || "не назначен"}`,
    };
  }
  return null;
}

const RULES = [
  ruleNoDigitsInStub,
  ruleStubNeedsExpectedForm,
  ruleDraftNeedsSource,
  ruleApprovedNeedsProof,
  ruleNoCompanyMetrics,
];

/** Нарушения правил — то, что красное всегда, и на стенде, и в проде. */
export function findViolations(blocks: StubbedBlock[], today: Today = new Date()): Violation[] {
  const out: Violation[] = [];
  for (const b of blocks) {
    for (const rule of RULES) {
      const v = rule(b);
      if (v) out.push(v);
    }
    const overdue = ruleOverdue(b, today);
    if (overdue) out.push(overdue);
  }
  return out;
}

/** Блоки, которым нельзя в прод: всё, что не `approved`. */
export function notApproved(blocks: StubbedBlock[]): StubbedBlock[] {
  return blocks.filter((b) => b.stub && b.stub.status !== "approved");
}

/** Реестр для владельца: docs/ЗАГЛУШКИ.md. */
export function renderRegistry(blocks: StubbedBlock[], today: Today = new Date()): string {
  const pending = notApproved(blocks);
  const lines = [
    "# Заглушки: что ждёт владельца",
    "",
    `Сгенерировано ${today.toISOString().slice(0, 10)} скриптом \`check-stubs.mts\`. Руками не править.`,
    "",
    `Всего блоков без согласования: **${pending.length}**.`,
    "",
    "| Где | Статус | Чего ждём | Кто снимает | Срок |",
    "|---|---|---|---|---|",
  ];
  for (const b of pending) {
    const s = b.stub!;
    lines.push(
      `| ${b.where} | \`${s.status ?? "—"}\` | ${s.expectedForm || s.source || "—"} | ${s.owner || "не назначен"} | ${s.due || "—"} |`
    );
  }
  if (!pending.length) lines.push("| — | — | всё согласовано | — | — |");
  return lines.join("\n") + "\n";
}
