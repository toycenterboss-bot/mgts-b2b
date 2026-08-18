/**
 * Аналитика (B-17, спринт Ф0).
 *
 * На сайте не было ни одного счётчика: `grep -E "ym\(|gtag\(|dataLayer|matomo"`
 * по фронту давал ноль. Без него нельзя решить ни судьбу 13 страниц МТС (Q-R01.1),
 * ни вопрос о скоринге профиля посетителя — не на чем.
 *
 * Идентификатор счётчика — вводная владельца, которой пока нет. По §2.2 плана
 * это не повод ждать: код готов, а вместо счётчика стоит заглушка, которая
 * ГРОМКО молчит. Тихо молчащая аналитика — это К-04: страница работает,
 * событий нет, никто не замечает месяцами.
 */

export const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID?.trim() || "";

/** Счётчик настроен — значит события действительно уходят. */
export const analyticsEnabled = (): boolean => METRIKA_ID.length > 0;

/**
 * События, которые нужны плану. Список закрытый: свободные строки
 * расползаются по коду и через месяц отчёт невозможно свести.
 */
export type AnalyticsEvent =
  | "fork_proptech"        // развилка: посетитель ушёл в PropTech
  | "fork_infratech"       // развилка: ушёл в InfraTech
  | "fork_account"         // развилка: личный кабинет
  | "fork_spec"            // развилка: спецсегмент
  | "form_submit"          // форма отправлена
  | "mts_forward";         // переход на МТС Бизнес с 13 страниц

interface YandexMetrika {
  (id: string, action: string, ...args: unknown[]): void;
}

declare global {
  interface Window {
    ym?: YandexMetrika;
  }
}

/**
 * Отправить событие. Без счётчика — не падает и не притворяется:
 * в разработке пишет в консоль, чтобы отсутствие аналитики было видно глазами.
 */
export function track(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!analyticsEnabled()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[аналитика] событие «${event}» никуда не ушло: NEXT_PUBLIC_METRIKA_ID не задан`);
    }
    return;
  }
  window.ym?.(METRIKA_ID, "reachGoal", event, params);
}
