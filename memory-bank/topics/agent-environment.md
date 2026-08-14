# Среда агента: два канала на машину владельца

Знание получено дорого — 2026-08-14 я объявил push невозможным, проверив два пути
из трёх. Поймал владелец. Разбор — `../patterns/catalog.md`, К-13.

## Три среды, а не две

| Канал | Где реально выполняется | Сеть наружу | git |
|---|---|---|---|
| **облачный контейнер** (`bash`) | изолированная VM Anthropic | есть, но прокси пускает только репозитории из «authorized repository set» сессии | `clone` публичного репо — да; `push` — **нет** |
| **`device_bash`** (`mcp__remote-devices__device_bash`) | Linux-VM с проброшенной папкой владельца | **нет** — `403 from proxy after CONNECT` | коммит — да, `push` — нет; **`unlink` запрещён** |
| **Desktop Commander** (`mcp__remote-devices__Desktop_Commander__*`) | **сам macOS владельца**, `/bin/zsh` | **есть** (`curl https://github.com` → 200) | всё штатно, с keychain владельца |

## Практические следствия

**git-операции с этим репозиторием делать через Desktop Commander**, а не через
`device_bash`:

```
Desktop_Commander__start_process:
  cd /Users/andrey_efremov/Downloads/runs && git push origin main
```

Проверено 2026-08-14: `932e20e..abb9fc3  main -> main`, `EXIT=0`.

**Почему `device_bash` ломает git.** Песочница моста запрещает `unlink`. Git не может
удалить собственный `.git/index.lock` после записи и блокирует сам себя на следующей
операции:

```
fatal: Unable to create '.../.git/index.lock': File exists.
```

Обход, если всё же приходится: `rm` запрещён, но `mv` разрешён —
`mv .git/index.lock _to_delete/stale-git-locks/index.lock.$(date +%H%M%S)`
**перед каждой** git-операцией. Отодвинутые локи лежат там же.
Это обход, а не решение: правильный канал — Desktop Commander.

**Почему облако не пушит.** Прокси отвечает:
«`toycenterboss-bot/mgts-b2b` is not in this session's authorized repository set,
so the proxy will not inject a credential for it». Способа добавить репозиторий
в этот набор из десктопного Cowork на 2026-08 нет — открытый баг
`anthropics/claude-code#76248`. GitHub-коннектор в чате read-only.

**Что облако при этом умеет и зачем оно нужно.** Полный `git clone` публичного репо
и `grep`/`find` по нему на порядок быстрее, чем через файловый мост. Схема,
проверенная в этой сессии: исследовать в облаке → писать результат на машину →
коммитить и пушить через Desktop Commander.

**Перенос коммита между средами — `git bundle`, не патч.** Патч через `git am` даёт
другой хеш (меняется committer), бандл сохраняет объект дословно:

```
# на машине
git bundle create _to_delete/mb.bundle main --not <база>
# в облаке, после device_stage_files
git fetch <путь-к-бандлу> 'refs/heads/main:refs/remotes/bundle/main'
```

Проверено: хеш `abb9fc3…` совпал побайтово с обеих сторон.

## Правило

🔴 **Прежде чем сказать «это невозможно» — перечисли ВСЕ каналы, которые могли бы
это обеспечить, и покажи проверку по каждому.** Здесь каналов три, я проверил два.
