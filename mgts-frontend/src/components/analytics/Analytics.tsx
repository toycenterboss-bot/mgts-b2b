/**
 * Счётчик Яндекс.Метрики. Вставляется в layout один раз.
 *
 * Если NEXT_PUBLIC_METRIKA_ID не задан — не рендерит ничего и оставляет
 * в разметке видимый след, чтобы отсутствие счётчика нельзя было принять
 * за работающую аналитику (К-04, молчание принято за исправность).
 */
import Script from "next/script";
import { METRIKA_ID, analyticsEnabled } from "@/lib/analytics";

export default function Analytics() {
  if (!analyticsEnabled()) {
    return (
      <div
        data-analytics="missing"
        data-stub="NEXT_PUBLIC_METRIKA_ID не задан · ждёт: владелец"
        hidden
      />
    );
  }

  return (
    <>
      <Script id="ym-init" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
        ym(${JSON.stringify(METRIKA_ID)},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${METRIKA_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
