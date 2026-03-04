import Image from "next/image";
import Icon from "@/components/ui/Icon";
import { resolveMediaAlt, resolveMediaUrl } from "@/lib/media";

type CeoFeedbackProps = {
  section: any;
};

export default function CeoFeedback({ section }: CeoFeedbackProps) {
  if (!section) return null;
  const portraitUrl = resolveMediaUrl(section.portraitImage || null);
  const videoUrl = resolveMediaUrl(section.video || null);

  return (
    <section className="ceo-feedback" data-stitch-block="ceo_address_and_feedback_page">
      <div className="ceo-feedback__content">
        {section.title && <h2 className="ceo-feedback__title">{section.title}</h2>}
        {section.description && <p className="ceo-feedback__description">{section.description}</p>}
        {section.note && (
          <div className="ceo-feedback__note">
            {section.noteIcon && <Icon name={section.noteIcon} size={20} />}
            <span>{section.note}</span>
          </div>
        )}
        {portraitUrl && (
          <div className="ceo-feedback__portrait">
            <Image
              src={portraitUrl}
              alt={resolveMediaAlt(section.portraitImage || null, section.title)}
              width={420}
              height={520}
            />
          </div>
        )}
        {videoUrl && (
          <div className="ceo-feedback__video">
            <video controls src={videoUrl} />
          </div>
        )}
      </div>
      <form className="ceo-feedback__form" action="#" method="post">
        <label className="ceo-feedback__field">
          <span>{section.nameLabel || "Имя и фамилия"}</span>
          <input type="text" placeholder={section.namePlaceholder || ""} />
        </label>
        <label className="ceo-feedback__field">
          <span>{section.companyLabel || "Компания"}</span>
          <input type="text" placeholder={section.companyPlaceholder || ""} />
        </label>
        <label className="ceo-feedback__field">
          <span>{section.emailLabel || "Ваш E-mail"}</span>
          <input type="email" placeholder={section.emailPlaceholder || ""} />
        </label>
        <label className="ceo-feedback__field">
          <span>{section.messageLabel || "Сообщение"}</span>
          <textarea placeholder={section.messagePlaceholder || ""} />
        </label>
        <button type="submit" className="ceo-feedback__submit">
          {section.submitLabel || "Отправить обращение"}
        </button>
        {section.disclaimer && <p className="ceo-feedback__disclaimer">{section.disclaimer}</p>}
      </form>
    </section>
  );
}
