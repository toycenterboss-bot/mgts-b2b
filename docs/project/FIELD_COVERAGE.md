# Покрытие полей форм (текущий сайт)

Источник: HTML страницы из `SiteMGTS/`.

## government/index_old.html — форма 1
Метаданные: action=#, method=POST

Поля:
- input, type=text, name=name, id=name_gov, required
- input, type=tel, name=phone, id=phone_gov, required
- input, type=text, name=organization, id=org_gov, required

## operators/index_old.html — форма 1
Метаданные: action=#, method=POST

Поля:
- input, type=text, name=name, id=name_ops, required
- input, type=tel, name=phone, id=phone_ops, required
- input, type=text, name=company, id=company_ops, required

## contacts/index2.html — форма 1
Поля:
- input, type=text, name=name, id=name, required
- input, type=tel, name=phone, id=phone, required
- input, type=email, name=email, id=email
- textarea, type=textarea, name=message, id=message

## business/index_old.html — форма 1
Метаданные: action=#, method=POST

Поля:
- input, type=text, name=name, id=name2, required
- input, type=tel, name=phone, id=phone2, required
- input, type=email, name=email, id=email2, required

## components/service-order-form-example.html — форма 1
Метаданные: action=#, method=POST, class=order-form

Поля:
- input, type=text, name=name, id=order-name, placeholder="Иван Иванов", required
- input, type=tel, name=phone, id=order-phone, placeholder="+7 (999) 123-45-67", required
- input, type=email, name=email, id=order-email, placeholder="ivan@example.com", required
- input, type=text, name=company, id=order-company, placeholder="ООО «Пример»"
- textarea, type=textarea, name=message, id=order-message, placeholder="Расскажите о ваших потребностях..."
- input, type=checkbox, name=consent, required

## partners/index_old.html — форма 1
Метаданные: action=#, method=POST

Поля:
- input, type=text, name=name, id=name_part, required
- input, type=tel, name=phone, id=phone_part, required
- input, type=text, name=company, id=company_part, required
- select, type=select, name=type, id=type_part

## developers/index_old.html — форма 1
Метаданные: action=#, method=POST

Поля:
- input, type=text, name=name, id=name_dev, required
- input, type=tel, name=phone, id=phone_dev, required
- input, type=text, name=object, id=object_dev, required

## Сводка типов полей
- checkbox
- email
- select
- tel
- text
- textarea
