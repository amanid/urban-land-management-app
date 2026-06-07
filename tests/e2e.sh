#!/bin/bash
# Comprehensive E2E test suite for Urban Land
set +e
BASE="http://localhost:5173/api/v1"
PASS=0
FAIL=0
FAILURES=()

check() {
  local name="$1"; local actual="$2"; local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  OK $name (got $actual)"; PASS=$((PASS+1))
  else
    echo "  KO $name (got $actual, expected $expected)"; FAIL=$((FAIL+1)); FAILURES+=("$name")
  fi
}

section() { echo; echo "-- $1 --"; }

# Get tokens
SA_TOK=$(curl -sX POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"superadmin@urban-land.local","password":"UrbanLand!2026"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
AD_TOK=$(curl -sX POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"admin@urban-land.local","password":"UrbanLand!2026"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
AG_TOK=$(curl -sX POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"agent@urban-land.local","password":"UrbanLand!2026"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
CA_TOK=$(curl -sX POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"caisse@urban-land.local","password":"UrbanLand!2026"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)
VW_TOK=$(curl -sX POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"lecteur@urban-land.local","password":"UrbanLand!2026"}' | python -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null)

section "1. AUTHENTIFICATION"
check "Login superadmin" "$([ -n "$SA_TOK" ] && echo OK || echo KO)" "OK"
check "Login admin" "$([ -n "$AD_TOK" ] && echo OK || echo KO)" "OK"
check "Login agent" "$([ -n "$AG_TOK" ] && echo OK || echo KO)" "OK"
check "Login caissier" "$([ -n "$CA_TOK" ] && echo OK || echo KO)" "OK"
check "Login lecteur" "$([ -n "$VW_TOK" ] && echo OK || echo KO)" "OK"
check "Mauvais mot de passe 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/auth/login/ -H 'Content-Type: application/json' -d '{"email":"admin@urban-land.local","password":"WRONG"}')" "401"
check "API sans token 401" "$(curl -s -o /dev/null -w '%{http_code}' $BASE/lots/)" "401"

section "2. PERMISSIONS GRADUELLES"
check "Lecteur GET lots" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $VW_TOK" $BASE/lots/)" "200"
check "Lecteur POST lot 403" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $VW_TOK" -H 'Content-Type: application/json' -d '{}' $BASE/lots/)" "403"
check "Caissier POST lot 403" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $CA_TOK" -H 'Content-Type: application/json' -d '{}' $BASE/lots/)" "403"
check "Caissier GET payments" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CA_TOK" $BASE/transactions/payments/)" "200"
check "Lecteur dashboard admin 403" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $VW_TOK" $BASE/dashboard/admin/)" "403"
check "Admin user-performance 200" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" $BASE/dashboard/user-performance/)" "200"
check "Agent user-performance 403" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AG_TOK" $BASE/dashboard/user-performance/)" "403"

section "3. IDENTIFIANTS SEMANTIQUES"
LOT_RESP=$(curl -s -X POST $BASE/lots/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"title":"Lot E2E","city":1,"surface_m2":"450","asking_price":"7500000","lot_type":"residential","has_water":true}')
LOT_REF=$(echo "$LOT_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('reference',''))" 2>/dev/null)
LOT_ID=$(echo "$LOT_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Format ref lot" "$(echo "$LOT_REF" | grep -E '^LOT-[A-Z]+-[0-9]{4}-[A-F0-9]{8}$' >/dev/null && echo OK || echo "got=$LOT_REF")" "OK"

CLI_RESP=$(curl -s -X POST $BASE/clients/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"kind":"individual","first_name":"Aya","last_name":"E2E","email":"aya.e2e@x.ci","id_kind":"cni","id_number":"E2E001"}')
CLI_ID=$(echo "$CLI_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
CLI_CODE=$(echo "$CLI_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
check "Format code client" "$(echo "$CLI_CODE" | grep -E '^CLT-[0-9]{4}-[A-F0-9]{8}$' >/dev/null && echo OK || echo "got=$CLI_CODE")" "OK"

section "4. CYCLE DE VENTE"
SALE_RESP=$(curl -s -X POST $BASE/transactions/sales/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"lot\":$LOT_ID,\"client\":$CLI_ID,\"price\":\"7500000\",\"payment_mode\":\"installment\",\"down_payment\":\"1500000\",\"installment_count\":3,\"installment_frequency_days\":30}")
SALE_ID=$(echo "$SALE_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
SALE_REF=$(echo "$SALE_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('reference',''))" 2>/dev/null)
SALE_STATUS=$(echo "$SALE_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
check "Ref vente" "$(echo "$SALE_REF" | grep -E '^VTE-[0-9]{4}-[A-F0-9]{8}$' >/dev/null && echo OK || echo "got=$SALE_REF")" "OK"
check "Vente initiale draft" "$SALE_STATUS" "draft"

CONFIRM=$(curl -s -X POST $BASE/transactions/sales/$SALE_ID/confirm/ -H "Authorization: Bearer $AD_TOK")
check "Apres confirm reserved" "$(echo "$CONFIRM" | python -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)" "reserved"
check "Echeancier 4 lignes" "$(echo "$CONFIRM" | python -c "import sys,json; print(len(json.load(sys.stdin)['payment_plan']['installments']))" 2>/dev/null)" "4"

PAY_RESP=$(curl -s -X POST $BASE/transactions/payments/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"sale\":$SALE_ID,\"amount\":\"1500000\",\"method\":\"mobile_money\",\"reference\":\"MM-E2E\"}")
PAY_ID=$(echo "$PAY_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
REC_NUM=$(echo "$PAY_RESP" | python -c "import sys,json; print(json.load(sys.stdin).get('receipt_number',''))" 2>/dev/null)
check "Format recu" "$(echo "$REC_NUM" | grep -E '^REC-[0-9]{8}-[A-F0-9]{8}$' >/dev/null && echo OK || echo "got=$REC_NUM")" "OK"

SALE_NOW=$(curl -s $BASE/transactions/sales/$SALE_ID/ -H "Authorization: Bearer $AD_TOK")
check "Apres apport in_progress" "$(echo "$SALE_NOW" | python -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)" "in_progress"
check "Solde du 6 000 000" "$(echo "$SALE_NOW" | python -c "import sys,json; print(int(float(json.load(sys.stdin)['balance_due'])))" 2>/dev/null)" "6000000"

section "5. SOLDE INTEGRAL ANTICIPE"
SETTLE=$(curl -s -X POST $BASE/transactions/sales/$SALE_ID/settle_in_full/ -H "Authorization: Bearer $AD_TOK")
check "Statut completed" "$(echo "$SETTLE" | python -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)" "completed"
check "Lot vendu" "$(echo "$SETTLE" | python -c "import sys,json; print(json.load(sys.stdin)['lot_detail']['status'])" 2>/dev/null)" "sold"

section "6. HASH CHAIN INTEGRITY"
INT_RESP=$(curl -s $BASE/integrity/ -H "Authorization: Bearer $AD_TOK")
check "Hash chain status" "$(echo "$INT_RESP" | python -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)" "ok"

section "7. DESISTEMENT + REVERSEMENT"
LOT2_ID=$(curl -sX POST $BASE/lots/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"title":"Lot D","city":1,"surface_m2":"300","asking_price":"5000000","lot_type":"residential"}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
CLI2_ID=$(curl -sX POST $BASE/clients/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"kind":"individual","first_name":"D","last_name":"T","email":"d@x.ci","id_kind":"cni","id_number":"D1"}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
S2=$(curl -sX POST $BASE/transactions/sales/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"lot\":$LOT2_ID,\"client\":$CLI2_ID,\"price\":\"5000000\",\"payment_mode\":\"installment\",\"down_payment\":\"1500000\",\"installment_count\":3}" | python -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
curl -sX POST $BASE/transactions/sales/$S2/confirm/ -H "Authorization: Bearer $AD_TOK" >/dev/null
curl -sX POST $BASE/transactions/payments/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"sale\":$S2,\"amount\":\"1500000\",\"method\":\"cash\"}" >/dev/null

WD=$(curl -sX POST $BASE/transactions/sales/$S2/withdraw/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"by":"buyer","reason":"Test desistement E2E"}')
check "Statut withdrawn_buyer" "$(echo "$WD" | python -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)" "withdrawn_buyer"
check "Lot redevenu available" "$(echo "$WD" | python -c "import sys,json; print(json.load(sys.stdin)['lot_detail']['status'])" 2>/dev/null)" "available"
check "Refund payment cree" "$(echo "$WD" | python -c "import sys,json; print(len([p for p in json.load(sys.stdin)['payments'] if p.get('is_refund')]))" 2>/dev/null)" "1"

S2_NOW=$(curl -s $BASE/transactions/sales/$S2/ -H "Authorization: Bearer $AD_TOK")
check "Total net 150k (90% rembourse)" "$(echo "$S2_NOW" | python -c "import sys,json; print(int(float(json.load(sys.stdin)['total_paid'])))" 2>/dev/null)" "150000"

section "8. PDF GENERATION"
curl -s -H "Authorization: Bearer $AD_TOK" $BASE/reports/receipt/$PAY_ID/ -o /tmp/r.pdf
check "Receipt PDF magic" "$(head -c 5 /tmp/r.pdf 2>/dev/null)" "%PDF-"
curl -s -H "Authorization: Bearer $AD_TOK" $BASE/reports/contract/$SALE_ID/ -o /tmp/c.pdf
check "Contract PDF magic" "$(head -c 5 /tmp/c.pdf 2>/dev/null)" "%PDF-"
curl -s -H "Authorization: Bearer $AD_TOK" $BASE/reports/statement/$SALE_ID/ -o /tmp/s.pdf
check "Statement PDF magic" "$(head -c 5 /tmp/s.pdf 2>/dev/null)" "%PDF-"

section "9. MODIFICATION AVEC MOTIF"
check "PATCH sans motif 400" "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $BASE/lots/$LOT_ID/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"notes":"x"}')" "400"
check "PATCH avec motif 200" "$(curl -s -o /dev/null -w '%{http_code}' -X PATCH $BASE/lots/$LOT_ID/ -H "Authorization: Bearer $AD_TOK" -H 'X-Change-Reason: Motif E2E suffisant' -H 'Content-Type: application/json' -d '{"notes":"y"}')" "200"
check "DELETE sans motif 400" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/clients/$CLI2_ID/ -H "Authorization: Bearer $AD_TOK")" "400"
# Client CLI2 a une vente protegee -> DELETE refuse (400 attendu)
check "DELETE client avec ventes refuse" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/clients/$CLI2_ID/ -H "Authorization: Bearer $AD_TOK" -H 'X-Change-Reason: Tente suppression')" "400"
# Creer un client SANS ventes -> DELETE OK
SOLO_ID=$(curl -sX POST $BASE/clients/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d '{"kind":"individual","first_name":"Solo","last_name":"NoSales","email":"solo@x.ci","id_kind":"cni","id_number":"S1"}' | python -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
check "DELETE client sans ventes 204" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/clients/$SOLO_ID/ -H "Authorization: Bearer $AD_TOK" -H 'X-Change-Reason: Client sans relation')" "204"

section "10. RECHERCHE GLOBALE + EXPORTS"
SEARCH=$(curl -s "$BASE/search/?q=$LOT_REF" -H "Authorization: Bearer $AD_TOK")
check "Search trouve lot" "$(echo "$SEARCH" | python -c "import sys,json; print(len(json.load(sys.stdin)['results']['lots']))" 2>/dev/null)" "1"
check "Export CSV lots" "$(curl -s -o /tmp/lx.csv -w '%{content_type}' -H "Authorization: Bearer $AD_TOK" $BASE/export/lots/ | head -c 8)" "text/csv"
check "Export CSV clients" "$(curl -s -o /tmp/cx.csv -w '%{content_type}' -H "Authorization: Bearer $AD_TOK" $BASE/export/clients/ | head -c 8)" "text/csv"
check "Export CSV ventes" "$(curl -s -o /tmp/sx.csv -w '%{content_type}' -H "Authorization: Bearer $AD_TOK" $BASE/export/sales/ | head -c 8)" "text/csv"
check "Export CSV versements" "$(curl -s -o /tmp/px.csv -w '%{content_type}' -H "Authorization: Bearer $AD_TOK" $BASE/export/payments/ | head -c 8)" "text/csv"
# XLSX
check "Export XLSX lots (magic PK)" "$(curl -s -H "Authorization: Bearer $AD_TOK" "$BASE/export/lots/?type=xlsx" -o /tmp/lx.xlsx; head -c 2 /tmp/lx.xlsx)" "PK"
check "Export XLSX clients (magic PK)" "$(curl -s -H "Authorization: Bearer $AD_TOK" "$BASE/export/clients/?type=xlsx" -o /tmp/cx.xlsx; head -c 2 /tmp/cx.xlsx)" "PK"
check "Export XLSX ventes (magic PK)" "$(curl -s -H "Authorization: Bearer $AD_TOK" "$BASE/export/sales/?type=xlsx" -o /tmp/sx.xlsx; head -c 2 /tmp/sx.xlsx)" "PK"
check "Export XLSX versements (magic PK)" "$(curl -s -H "Authorization: Bearer $AD_TOK" "$BASE/export/payments/?type=xlsx" -o /tmp/px.xlsx; head -c 2 /tmp/px.xlsx)" "PK"

section "11. UPLOAD + DOWNLOAD + DELETE DOCS"
echo "doc test" > /tmp/dx.txt
DOC=$(curl -sX POST $BASE/lots/$LOT_ID/upload-document/ -H "Authorization: Bearer $AD_TOK" -F "file=@/tmp/dx.txt" -F "kind=title_deed" -F "label=Test")
DOC_ID=$(echo "$DOC" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
DOC_URL=$(echo "$DOC" | python -c "import sys,json; print(json.load(sys.stdin).get('file_url',''))" 2>/dev/null)
check "Upload lot doc OK" "$([ -n "$DOC_ID" ] && echo OK || echo KO)" "OK"
check "file_url relatif" "$(echo "$DOC_URL" | grep -E '^/media' >/dev/null && echo OK || echo KO)" "OK"
check "Download via proxy" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5173$DOC_URL)" "200"
check "Delete doc" "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE $BASE/lots/documents/$DOC_ID/ -H "Authorization: Bearer $AD_TOK" -H 'X-Change-Reason: Test delete')" "204"

section "12. DASHBOARDS + ANALYTICS"
check "Dashboard admin" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" $BASE/dashboard/admin/)" "200"
check "Dashboard agent" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AG_TOK" $BASE/dashboard/agent/)" "200"
check "Advanced analytics" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" $BASE/dashboard/advanced/)" "200"
check "User performance" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" $BASE/dashboard/user-performance/)" "200"
check "Impersonation as_user" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" "$BASE/dashboard/agent/?as_user=3")" "200"

section "13. HISTORIQUE"
check "History lot" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" $BASE/lots/$LOT_ID/history/)" "200"
check "Audit log" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $AD_TOK" "$BASE/history/?entity=Lot")" "200"

section "14. NOTES + TAGS (premium)"
TAG_ID=$(curl -sX POST $BASE/notes/tags/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"name\":\"E2E-$RANDOM\",\"color\":\"violet\"}" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Tag cree" "$([ -n "$TAG_ID" ] && echo OK || echo KO)" "OK"
NOTE_ID=$(curl -sX POST $BASE/notes/notes/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"entity\":\"lot\",\"entity_id\":$LOT_ID,\"body\":\"Note E2E\",\"visibility\":\"internal\"}" | python -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
check "Note creee" "$([ -n "$NOTE_ID" ] && echo OK || echo KO)" "OK"
check "Fetch notes du lot" "$(curl -s "$BASE/notes/entity/lot/$LOT_ID/" -H "Authorization: Bearer $AD_TOK" | python -c "import sys,json; d=json.load(sys.stdin); print('OK' if len(d.get('notes',[]))>0 else 'KO')" 2>/dev/null)" "OK"
check "Attach tag" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/notes/tagged-items/ -H "Authorization: Bearer $AD_TOK" -H 'Content-Type: application/json' -d "{\"tag\":$TAG_ID,\"entity\":\"lot\",\"entity_id\":$LOT_ID}")" "201"

echo
echo "============================================"
echo "RESULTATS: $PASS passes / $FAIL echoues"
echo "============================================"
if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "Echecs:"
  printf '  - %s\n' "${FAILURES[@]}"
fi
exit $FAIL
