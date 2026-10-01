#!/usr/bin/env bash
set -euo pipefail

API="${API_URL:-http://127.0.0.1:8000/api/v1}"
EMAIL="${HFL_ADMIN_EMAIL:-admin@hfl-logistics.com}"
PASSWORD="${HFL_ADMIN_PASSWORD:-change-me}"
TRACKING="${HFL_TRACKING:-777777777001}"

json() { curl -fsS -H "Accept: application/json" "$@"; }
auth_json() { curl -fsS -H "Accept: application/json" -H "Authorization: Bearer $TOKEN" "$@"; }
post_json() { curl -fsS -H "Accept: application/json" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -X POST "$@"; }

command -v jq >/dev/null || { echo "ERROR: jq is required." >&2; exit 2; }

echo "[1/12] Login"
LOGIN=$(curl -fsS -H 'Accept: application/json' -H 'Content-Type: application/json' -X POST "$API/auth/login" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(printf '%s' "$LOGIN" | jq -r '.data.token // .token')
test -n "$TOKEN" && test "$TOKEN" != "null"

echo "[2/12] Mock China API"
MOCK=$(auth_json "$API/china-sync/mock/package/$TRACKING")
printf '%s' "$MOCK" | jq -e '.success == true' >/dev/null
CONTAINER=$(printf '%s' "$MOCK" | jq -r '.data.InsideNO // .data.container_number')

echo "[3/12] Sync Mock China API"
SYNC=$(post_json "$API/china-sync/mock/sync")
printf '%s' "$SYNC" | jq -e '.success == true' >/dev/null
printf '%s' "$SYNC" | jq '{received,created,updated,containers_created,packages_attached}'

echo "[4/12] Find package"
PKG=$(auth_json "$API/packages?search=$TRACKING")
PACKAGE_ID=$(printf '%s' "$PKG" | jq -r '.data.data[0].id // .data[0].id')
test -n "$PACKAGE_ID" && test "$PACKAGE_ID" != "null"

echo "Package ID: $PACKAGE_ID | Container: $CONTAINER"
CONTAINER_JSON=$(auth_json "$API/containers?search=$CONTAINER&per_page=10")
CONTAINER_ID=$(printf '%s' "$CONTAINER_JSON" | jq -r '.data.data[0].id // .data[0].id')
test -n "$CONTAINER_ID" && test "$CONTAINER_ID" != "null"

echo "[5/12] Container lifecycle"
for row in \
  'Cambodia Port|Phnom Penh Port' \
  'Customs|Cambodia Customs' \
  'Cambodia Warehouse|HFL Cambodia Warehouse'; do
  STATUS="${row%%|*}"; LOCATION="${row#*|}"
  post_json "$API/containers/$CONTAINER_ID/transition" \
    -d "{\"status\":\"$STATUS\",\"location\":\"$LOCATION\",\"remarks\":\"Step 8 E2E test\"}" | jq -e '.success == true' >/dev/null
 done

echo "[6/12] Warehouse receive"
post_json "$API/cambodia-warehouse/packages/$PACKAGE_ID/receive" \
  -d '{"warehouse_location":"HFL Cambodia Warehouse","condition":"Good","note":"Step 8 E2E test"}' | jq -e '.success == true' >/dev/null

echo "[7/12] Warehouse measurement"
post_json "$API/cambodia-warehouse/packages/$PACKAGE_ID/measure" \
  -d '{"boxes":[{"length":50,"width":40,"height":30,"quantity":1,"unit":"cm"}],"total_weight":10,"warehouse_location":"HFL Cambodia Warehouse","note":"Step 8 E2E test"}' | jq -e '.success == true' >/dev/null

echo "[8/12] Ready for billing"
post_json "$API/cambodia-warehouse/packages/$PACKAGE_ID/ready-for-billing" \
  -d '{"warehouse_location":"HFL Cambodia Warehouse","note":"Step 8 E2E test"}' | jq -e '.success == true' >/dev/null

echo "[9/12] Invoice"
INV=$(post_json "$API/invoices/from-package/$PACKAGE_ID" -d '{}')
printf '%s' "$INV" | jq -e '.success == true' >/dev/null
INVOICE_ID=$(printf '%s' "$INV" | jq -r '.data.id')
OUTSTANDING=$(printf '%s' "$INV" | jq -r '.data.outstanding')

echo "[10/12] Partial payment"
PARTIAL=$(python3 - "$OUTSTANDING" <<'PY'
import sys
x=float(sys.argv[1]); print(max(0.01, round(x/2,2)))
PY
)
PAY1=$(post_json "$API/payments" -d "{\"invoice_id\":$INVOICE_ID,\"amount\":$PARTIAL,\"method\":\"TEST\",\"reference\":\"STEP8-PARTIAL\",\"idempotency_key\":\"STEP8-$INVOICE_ID-1\"}")
printf '%s' "$PAY1" | jq -e '.success == true' >/dev/null

echo "[11/12] Final payment"
REMAIN=$(printf '%s' "$PAY1" | jq -r '.data.invoice.outstanding')
PAY2=$(post_json "$API/payments" -d "{\"invoice_id\":$INVOICE_ID,\"amount\":$REMAIN,\"method\":\"TEST\",\"reference\":\"STEP8-FINAL\",\"idempotency_key\":\"STEP8-$INVOICE_ID-2\"}")
printf '%s' "$PAY2" | jq -e '.success == true' >/dev/null

echo "[12/12] Delivery + POD + tracking"
DEL=$(post_json "$API/deliveries" -d "{\"package_id\":$PACKAGE_ID,\"delivery_address\":\"Step 8 Test Address\",\"phone\":\"010000000\",\"status\":\"Scheduled\"}")
DELIVERY_ID=$(printf '%s' "$DEL" | jq -r '.data.id')
post_json "$API/deliveries/$DELIVERY_ID" -d '{"status":"Out for Delivery"}' | jq -e '.success == true' >/dev/null
post_json "$API/deliveries/$DELIVERY_ID" -d '{"status":"Delivered","proof_type":"photo","proof_url":"https://example.invalid/step8-proof.jpg","receiver_name":"E2E Test Receiver","proof_note":"Step 8 automated test"}' | jq -e '.success == true' >/dev/null

echo "PASS: $TRACKING completed China → Container → Cambodia Warehouse → Billing → Payment → Delivery → Delivered."
