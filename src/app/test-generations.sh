#!/bin/bash
BASE_URL="${BASE_URL:-http://localhost:3000}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass()  { echo -e "${GREEN}✓  $1${NC}"; }
fail()  { echo -e "${RED}✗  $1${NC}"; }
info()  { echo -e "${YELLOW}→  $1${NC}"; }
title() { echo -e "\n${CYAN}$1${NC}"; echo "────────────────────────────────────────"; }

# URL-encode using printf (no node/python needed)
urlencode() {
  local string="$1"
  local encoded=""
  local i c
  for (( i=0; i<${#string}; i++ )); do
    c="${string:$i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) encoded+="$c" ;;
      *) printf -v encoded "%s%%%02X" "$encoded" "'$c" ;;
    esac
  done
  echo "$encoded"
}

trpc_post() {
  curl -s -X POST \
    "${BASE_URL}/api/trpc/${1}?batch=1" \
    -H "Content-Type: application/json" \
    -d "{\"0\":{\"json\":${2}}}"
}

trpc_get() {
  local proc="$1" input="$2"
  local wrapper="{\"0\":{\"json\":${input}}}"
  local encoded
  encoded=$(python3 -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=''),end='')" "$wrapper" 2>/dev/null) \
    || encoded=$(python -c "import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1],safe=''),end='')" "$wrapper" 2>/dev/null)
  curl -s "${BASE_URL}/api/trpc/${proc}?batch=1&input=${encoded}"
}

extract_id() { echo "$1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

check_ok() {
  if echo "$1" | grep -q '"result"'; then
    pass "$2"; return 0
  else
    fail "$2"
    echo "    Response: $(echo "$1" | head -c 300)"
    return 1
  fi
}

check_err() {
  if echo "$1" | grep -q '"error"'; then
    pass "$2"
  else
    fail "$2 — expected error, got: $(echo "$1" | head -c 200)"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
title "1 · Middleware — unauthenticated must return JSON not HTML"
# ══════════════════════════════════════════════════════════════════════════════
R=$(trpc_get "textGenerations.getAll" "null")
if echo "$R" | grep -q "<!DOCTYPE"; then
  fail "tRPC returned HTML"
elif echo "$R" | grep -q '"error"\|"result"'; then
  pass "tRPC returns JSON (not HTML)"
else
  fail "Unexpected: $(echo "$R" | head -c 150)"
fi

# ══════════════════════════════════════════════════════════════════════════════
title "2 · Text Generations — getAll"
# ══════════════════════════════════════════════════════════════════════════════
R=$(trpc_get "textGenerations.getAll" "null")
check_ok "$R" "textGenerations.getAll"

# ══════════════════════════════════════════════════════════════════════════════
title "3 · Text Generations — create (5 types)"
# ══════════════════════════════════════════════════════════════════════════════
TEXT_IDS=()

for TYPE_PROMPT in \
  'headline|Write a headline about the Ugandan tech startup scene in 2025' \
  'description|Summarise a story about MTN Uganda launching an AI-powered customer service chatbot' \
  'captions|Write captions for photos from the Kampala Innovation Week 2025 tech expo' \
  'script|Write a 60-second radio script for Studio AI promoting AI tools to African newsrooms' \
  'body|Write an article about how AI is transforming newsrooms in East Africa focusing on fact-checking'
do
  TYPE="${TYPE_PROMPT%%|*}"; PROMPT="${TYPE_PROMPT##*|}"
  info "create $TYPE"
  R=$(trpc_post "textGenerations.create" \
    "{\"type\":\"${TYPE}\",\"prompt\":\"${PROMPT}\"}")
  check_ok "$R" "create $TYPE"
  ID=$(extract_id "$R")
  [ -n "$ID" ] && TEXT_IDS+=("$ID") && echo "    id: $ID"
done

info "prompt too short — expect error"
R=$(trpc_post "textGenerations.create" '{"type":"headline","prompt":"Short"}')
check_err "$R" "prompt < 10 chars rejected"

info "headline > 300 chars — expect error"
LONG=$(printf 'A%.0s' {1..301})
R=$(trpc_post "textGenerations.create" "{\"type\":\"headline\",\"prompt\":\"${LONG}\"}")
check_err "$R" "headline > 300 chars rejected"

info "invalid type — expect error"
R=$(trpc_post "textGenerations.create" '{"type":"tweet","prompt":"This is a test prompt long enough"}')
check_err "$R" "invalid type rejected"

# ══════════════════════════════════════════════════════════════════════════════
title "4 · Text Generations — getById"
# ══════════════════════════════════════════════════════════════════════════════
if [ ${#TEXT_IDS[@]} -gt 0 ]; then
  ID="${TEXT_IDS[0]}"
  info "getById $ID"
  R=$(trpc_get "textGenerations.getById" "{\"id\":\"${ID}\"}")
  check_ok "$R" "getById returns record"
  echo "    $(echo "$R" | grep -o '"status":"[^"]*"' | head -1)"

  info "getById unknown id — expect NOT_FOUND"
  R=$(trpc_get "textGenerations.getById" '{"id":"nonexistent-000"}')
  check_err "$R" "NOT_FOUND for unknown id"
else
  info "Skipping — no ids from create"
fi

# ══════════════════════════════════════════════════════════════════════════════
title "5 · Image Generations — getAll"
# ══════════════════════════════════════════════════════════════════════════════
info "imageGenerations.getAll"
R=$(trpc_get "imageGenerations.getAll" "{}")
check_ok "$R" "imageGenerations.getAll"

info "imageGenerations.getAll with query"
R=$(trpc_get "imageGenerations.getAll" '{"query":"journalist"}')
check_ok "$R" "imageGenerations.getAll with query"

# ══════════════════════════════════════════════════════════════════════════════
title "6 · Image Generations — create (4 styles)"
# ══════════════════════════════════════════════════════════════════════════════
IMG_IDS=()

for STYLE_SIZE in \
  'photojournalistic|1024|1024|A Ugandan journalist interviewing a tech entrepreneur in Kampala at golden hour' \
  'editorial|1792|1024|Editorial photo of a busy African newsroom with journalists at computers' \
  'documentary|1024|1792|Documentary photograph of a radio presenter recording news in Kampala' \
  'portrait|1200|630|Portrait of a female African data journalist at a media conference'
do
  STYLE="${STYLE_SIZE%%|*}"; REST="${STYLE_SIZE#*|}"
  W="${REST%%|*}"; REST="${REST#*|}"
  H="${REST%%|*}"; PROMPT="${REST#*|}"
  info "create $STYLE ${W}x${H}"
  R=$(trpc_post "imageGenerations.create" \
    "{\"prompt\":\"${PROMPT}\",\"style\":\"${STYLE}\",\"width\":${W},\"height\":${H}}")
  check_ok "$R" "create $STYLE"
  ID=$(extract_id "$R")
  [ -n "$ID" ] && IMG_IDS+=("$ID") && echo "    id: $ID"
done

info "invalid style — expect error"
R=$(trpc_post "imageGenerations.create" \
  '{"prompt":"A test image prompt that meets the minimum length","style":"watercolor","width":1024,"height":1024}')
check_err "$R" "invalid style rejected"

info "prompt < 10 chars — expect error"
R=$(trpc_post "imageGenerations.create" \
  '{"prompt":"Short","style":"editorial","width":1024,"height":1024}')
check_err "$R" "image prompt too short rejected"

info "width 100 — expect error"
R=$(trpc_post "imageGenerations.create" \
  '{"prompt":"A valid test prompt for dimension validation","style":"editorial","width":100,"height":1024}')
check_err "$R" "width < 512 rejected"

# ══════════════════════════════════════════════════════════════════════════════
title "7 · Image Generations — getById"
# ══════════════════════════════════════════════════════════════════════════════
if [ ${#IMG_IDS[@]} -gt 0 ]; then
  ID="${IMG_IDS[0]}"
  info "getById $ID"
  R=$(trpc_get "imageGenerations.getById" "{\"id\":\"${ID}\"}")
  check_ok "$R" "getById returns record"
  echo "    $(echo "$R" | grep -o '"status":"[^"]*"' | head -1)"
  echo "    $(echo "$R" | grep -o '"outputUrl":[^,}]*' | head -1)"

  info "getById unknown id — expect NOT_FOUND"
  R=$(trpc_get "imageGenerations.getById" '{"id":"nonexistent-000"}')
  check_err "$R" "NOT_FOUND for unknown id"
else
  info "Skipping — no ids from create"
fi

# ══════════════════════════════════════════════════════════════════════════════
title "8 · Source entity context"
# ══════════════════════════════════════════════════════════════════════════════
ENTITY_ID="test-article-$(date +%s)"

info "create text with sourceEntityId"
R=$(trpc_post "textGenerations.create" \
  "{\"type\":\"headline\",\"prompt\":\"Write a headline about East African fintech growth in 2025\",\"sourceEntityId\":\"${ENTITY_ID}\",\"sourceApp\":\"zuriah\"}")
check_ok "$R" "create text with sourceEntityId"

info "getBySourceEntity text"
R=$(trpc_get "textGenerations.getBySourceEntity" \
  "{\"sourceEntityId\":\"${ENTITY_ID}\"}")
check_ok "$R" "getBySourceEntity text"

info "create image with sourceEntityId"
R=$(trpc_post "imageGenerations.create" \
  "{\"prompt\":\"Editorial photograph of a fintech conference in Nairobi with startup founders presenting\",\"style\":\"editorial\",\"width\":1200,\"height\":630,\"sourceEntityId\":\"${ENTITY_ID}\",\"sourceApp\":\"zuriah\"}")
check_ok "$R" "create image with sourceEntityId"

info "getBySourceEntity image"
R=$(trpc_get "imageGenerations.getBySourceEntity" \
  "{\"sourceEntityId\":\"${ENTITY_ID}\",\"sourceApp\":\"zuriah\"}")
check_ok "$R" "imageGenerations.getBySourceEntity"

# ══════════════════════════════════════════════════════════════════════════════
title "Summary"
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "Text ids: ${TEXT_IDS[*]:-none}"
echo "Image ids: ${IMG_IDS[*]:-none}"
echo ""
echo "NOTE: output=null / outputUrl=null until LLM/image APIs are wired."
