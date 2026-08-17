#!/bin/sh
# check-memory.sh — машина, которая проверяет мемори-банк.
# Запускать в начале каждой сессии:  sh memory-bank/check-memory.sh
#
# POSIX sh намеренно: на macOS живёт bash 3.2 из 2007 года, современные bash-измы падают.
# Выход: 0 — всё чисто, 1 — есть нарушения.

set -u

MB="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$MB/.." && pwd)"
FAIL=0
WARN=0

red()  { printf '\033[31m%s\033[0m\n' "$1"; }
yell() { printf '\033[33m%s\033[0m\n' "$1"; }
grn()  { printf '\033[32m%s\033[0m\n' "$1"; }
head_() { printf '\n\033[1m%s\033[0m\n' "$1"; }

fail() { red  "  ✗ $1"; FAIL=1; }
warn() { yell "  ! $1"; WARN=1; }
ok()   { grn  "  ✓ $1"; }

# ---------------------------------------------------------------- 1. лимиты строк
head_ "1. Лимиты строк"

check_limit() {
  f="$1"; lim="$2"
  [ -f "$f" ] || { fail "нет файла: ${f#$ROOT/}"; return; }
  n=$(wc -l < "$f" | tr -d ' ')
  if [ "$n" -gt "$lim" ]; then
    fail "${f#$ROOT/}: $n строк при лимите $lim — режь сейчас, а не «когда-нибудь»"
  else
    ok "${f#$ROOT/}: $n/$lim"
  fi
}

check_limit "$MB/activeContext.md" 60
for f in "$MB"/context/*.md; do
  [ -e "$f" ] || continue
  check_limit "$f" 120
done

# ------------------------------------------------------- 2. покрытие индексом
head_ "2. Каждый topic и план — в index.md"

IDX="$MB/index.md"
if [ ! -f "$IDX" ]; then
  fail "нет index.md"
else
  for f in "$MB"/topics/*.md "$MB"/implementation-plans/*.md "$MB"/patterns/*.md; do
    [ -e "$f" ] || continue
    rel=$(printf '%s' "${f#$MB/}")
    if grep -qF "$rel" "$IDX"; then
      ok "$rel"
    else
      fail "$rel не упомянут в index.md"
    fi
  done
fi

# --------------------------------------------------------- 3. битые ссылки
head_ "3. Ссылки между файлами мемори-банка"

BROKEN=0
for f in $(find "$MB" -name '*.md' -type f); do
  d=$(dirname "$f")
  # вытаскиваем ](...) — только относительные пути
  grep -o ']([^)]*)' "$f" 2>/dev/null | sed 's/^](//; s/)$//' | while read -r link; do
    case "$link" in
      ''|http*|'#'*|mailto:*|*'://'*) continue ;;
    esac
    target=$(printf '%s' "$link" | sed 's/#.*$//')
    [ -n "$target" ] || continue
    if [ ! -e "$d/$target" ] && [ ! -e "$ROOT/$target" ]; then
      printf 'BROKEN\t%s -> %s\n' "${f#$ROOT/}" "$target"
    fi
  done
done > /tmp/.mb_links 2>/dev/null

if [ -s /tmp/.mb_links ]; then
  while IFS= read -r line; do fail "$(printf '%s' "$line" | cut -f2-)"; done < /tmp/.mb_links
else
  ok "битых ссылок нет"
fi
rm -f /tmp/.mb_links

# ------------------------------------------------------------ 4. секреты
head_ "4. Секреты в мемори-банке"

# ищем не имена переменных, а похожее на значения
if grep -rInE 'pplx-[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|[0-9a-f]{64,}' \
     "$MB" --exclude='secrets.local.md' --exclude='check-memory.sh' >/dev/null 2>&1; then
  grep -rInE 'pplx-[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|[0-9a-f]{64,}' \
     "$MB" --exclude='secrets.local.md' --exclude='check-memory.sh' 2>/dev/null \
     | cut -c1-140 | while IFS= read -r l; do red "  ✗ похоже на секрет: $l"; done
  FAIL=1
else
  ok "значений секретов не найдено"
fi

if [ -f "$MB/secrets.local.md" ]; then
  if (cd "$ROOT" && git ls-files --error-unmatch "memory-bank/secrets.local.md" >/dev/null 2>&1); then
    fail "secrets.local.md ОТСЛЕЖИВАЕТСЯ git — немедленно: git rm --cached memory-bank/secrets.local.md"
  else
    ok "secrets.local.md не в git"
  fi
fi

# ------------------------------------------------- 5. абсолютные пути машины
head_ "5. Абсолютные пути конкретной машины"

# topics/security-and-hygiene.md цитирует такие пути как НАХОДКИ — это по замыслу.
if grep -rIn '/Users/[a-z_]*/' "$MB" \
     --exclude='check-memory.sh' --exclude='security-and-hygiene.md' --exclude='agent-environment.md' >/dev/null 2>&1; then
  grep -rIn '/Users/[a-z_]*/' "$MB" \
     --exclude='check-memory.sh' --exclude='security-and-hygiene.md' --exclude='agent-environment.md' 2>/dev/null \
     | cut -c1-140 | while IFS= read -r l; do yell "  ! $l"; done
  warn "абсолютные пути /Users/... не переживут смену машины"
else
  ok "абсолютных путей нет (кроме цитат-находок в topics/security-and-hygiene.md)"
fi

# ------------------------------------------------- 6. расхождение с origin
head_ "6. Расхождение с origin"

if [ -d "$ROOT/.git" ]; then
  BR=$(cd "$ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null)
  ok "текущая ветка: $BR  (сверь её ПЕРЕД коммитом — сосед мог переключить)"

  if (cd "$ROOT" && git rev-parse --verify "origin/$BR" >/dev/null 2>&1); then
    AHEAD=$(cd "$ROOT" && git rev-list --count "origin/$BR..HEAD" 2>/dev/null || echo 0)
    BEHIND=$(cd "$ROOT" && git rev-list --count "HEAD..origin/$BR" 2>/dev/null || echo 0)
    [ "$AHEAD"  -gt 0 ] && fail "$AHEAD незапушенных коммитов — соседняя машина работает по вчерашней памяти"
    [ "$BEHIND" -gt 0 ] && fail "$BEHIND коммитов позади origin — сделай git pull --rebase ДО работы"
    [ "$AHEAD" -eq 0 ] && [ "$BEHIND" -eq 0 ] && ok "синхронизировано с origin/$BR"
  else
    warn "нет origin/$BR (не сравнивал; сделай git fetch)"
  fi

  DIRTY=$(cd "$ROOT" && git status --porcelain -- memory-bank 2>/dev/null | wc -l | tr -d ' ')
  [ "$DIRTY" -gt 0 ] && warn "$DIRTY несохранённых изменений в memory-bank/ — не забудь коммит в конце сессии"
else
  warn "не git-репозиторий, сверку с origin пропускаю"
fi

# -------------------------------------------------- 7. просроченные ритуалы
head_ "7. Ритуалы"

LATEST_INBOX=$(ls -1 "$MB"/inbox/*.md 2>/dev/null | tail -1)
if [ -z "${LATEST_INBOX:-}" ]; then
  fail "нет ни одного файла inbox/ — находки некуда записывать"
else
  if [ -n "$(find "$MB/inbox" -name '*.md' -mtime +14 -print 2>/dev/null | head -1)" ] \
     && [ -z "$(find "$MB/inbox" -name '*.md' -mtime -14 -print 2>/dev/null | head -1)" ]; then
    fail "inbox не трогали >14 дней — разбор просрочен"
  else
    ok "inbox свежий: ${LATEST_INBOX#$ROOT/}"
  fi
fi

if [ -n "$(find "$MB/activeContext.md" -mtime +7 -print 2>/dev/null)" ]; then
  warn "activeContext.md не обновлялся >7 дней — он врёт про «сейчас»"
else
  ok "activeContext.md свежий"
fi

# ------------------------------------------- 8. память не отстала от работы
head_ "8. Память не отстала от работы"

# Каталоги, изменение которых означает «шла работа над проектом».
# temp/, uploads/, .dev/ намеренно не включены: они шумят и не отражают работу.
WORK_PATHS="docs design mgts-frontend/src mgts-backend/src scripts"

if [ -d "$ROOT/.git" ]; then
  W=$(cd "$ROOT" && git log -1 --format=%ct -- $WORK_PATHS 2>/dev/null)
  M=$(cd "$ROOT" && git log -1 --format=%ct -- memory-bank/activeContext.md 2>/dev/null)
  if [ -n "$W" ] && [ -n "$M" ]; then
    if [ "$W" -gt "$M" ]; then
      D=$(( (W - M) / 86400 ))
      if [ "$D" -ge 1 ]; then GAP="$D дн."; else GAP="$(( (W - M) / 3600 )) ч."; fi
      fail "проект правился позже, чем activeContext — разрыв $GAP Работа шла, знание не записано"
      (cd "$ROOT" && git log -1 --format='      последняя правка проекта: %h %ad · %s' \
         --date=short -- $WORK_PATHS 2>/dev/null | cut -c1-130)
      (cd "$ROOT" && git log -1 --format='      последняя запись в память: %h %ad · %s' \
         --date=short -- memory-bank/activeContext.md 2>/dev/null | cut -c1-130)
    else
      ok "activeContext не старше последней правки проекта"
    fi
  else
    warn "не с чем сравнить: нет коммитов по одной из сторон"
  fi

  # незакоммиченная работа при нетронутой памяти — тот же провал, только раньше
  DW=$(cd "$ROOT" && git status --porcelain -- $WORK_PATHS 2>/dev/null | wc -l | tr -d ' ')
  DM=$(cd "$ROOT" && git status --porcelain -- memory-bank 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DW" -gt 0 ] && [ "$DM" -eq 0 ]; then
    fail "$DW незакоммиченных правок в проекте и НИ ОДНОЙ в memory-bank — запиши, что делаешь"
  elif [ "$DW" -gt 0 ]; then
    ok "работа идёт и память вместе с ней ($DW правок в проекте, $DM в памяти)"
  fi
else
  warn "не git-репозиторий, сверку с работой пропускаю"
fi

# ------------------------------------------------- 9. планы по стандарту
head_ "9. Планы по стандарту"

# Правила из implementation-plans/README.md, принципы 11, 12, 13.
PLANS=$(ls "$ROOT"/memory-bank/implementation-plans/*.md 2>/dev/null | grep -v '/README\.md$')
if [ -z "$PLANS" ]; then
  warn "планов нет — нечего проверять"
else
  for P in $PLANS; do
    N=$(basename "$P")
    if grep -q '^## 0\.0' "$P"; then
      ok "$N: §0.0 табло на месте"
    else
      fail "$N: нет §0.0 табло состояния (принцип 13)"
    fi

    PH=$(grep -c '^### Ф[0-9]' "$P" 2>/dev/null | head -1 | tr -dc '0-9')
    RB=$(grep -c '^\*\*Откат\.\*\*' "$P" 2>/dev/null | head -1 | tr -dc '0-9')
    PH=${PH:-0}; RB=${RB:-0}
    if [ "$PH" -gt 0 ]; then
      if [ "$RB" -lt "$PH" ]; then
        fail "$N: фаз $PH, строк отката $RB — фаза без отката считается необратимой (принцип 11)"
      else
        ok "$N: у всех $PH фаз назван откат"
      fi
    fi

    CL=$(grep -c '^—— ЗАКРЫТА' "$P" 2>/dev/null | head -1 | tr -dc '0-9')
    ND=$(grep -c 'Что НЕ доказано' "$P" 2>/dev/null | head -1 | tr -dc '0-9')
    CL=${CL:-0}; ND=${ND:-0}
    if [ "$CL" -gt 0 ]; then
      if [ "$ND" -lt "$CL" ]; then
        fail "$N: закрытых фаз $CL, полей «что НЕ доказано» $ND — фаза, у которой всё доказано, неотличима от непроверенной (принцип 12)"
      else
        ok "$N: у всех $CL закрытых фаз назван недоказанный остаток"
      fi
    fi
  done
fi

# ------------------------------------------------------------------- итог
head_ "Итог"
if [ "$FAIL" -ne 0 ]; then
  red "ЕСТЬ НАРУШЕНИЯ — почини до начала работы."
  exit 1
elif [ "$WARN" -ne 0 ]; then
  yell "Замечания есть, блокеров нет."
  exit 0
else
  grn "Чисто."
  exit 0
fi
