#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:3000"

echo "1) Health check"
curl -s -o /dev/null -w "   GET /health → HTTP %{http_code}\n" "$BASE/health"

echo "2) Route inexistante"
curl -s -o /dev/null -w "   GET /foobar → HTTP %{http_code}\n" "$BASE/foobar"

echo "3) Reset Redis + SQLite"
docker-compose exec redis redis-cli FLUSHALL >/dev/null || true
rm -f todos.db

echo "4) Rebuild & up"
docker-compose down >/dev/null 2>&1 || true
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 \
  docker-compose up -d --build
sleep 5

echo "5) Création d’un todo valide"
resp=$(curl -s -w "\n   HTTP: %{http_code}\n" -X POST "$BASE/todos" \
  -H "Content-Type: application/json" \
  -d '{"title":"Faire mes courses"}')
echo "   $resp"
ID=$(echo "$resp" | head -n1 | jq .id)
echo "   → ID=$ID"

echo "6) Idempotency-key (2 appels)"
for i in 1 2; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/todos" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: same-key" \
    -d '{"title":"Faire mes courses"}')
  echo "   Attempt #$i → HTTP $code"
done

echo "7) POST invalide (pas de title)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$BASE/todos" \
  -H "Content-Type: application/json" \
  -d '{}'

echo "8) Lecture des todos"
curl -s "$BASE/todos" | jq .

echo "9) PATCH done=true"
curl -s -w "\n   HTTP: %{http_code}\n" -X PATCH "$BASE/todos/$ID/done" \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

echo "10) PATCH invalide (done non-boolean)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X PATCH "$BASE/todos/$ID/done" \
  -H "Content-Type: application/json" \
  -d '{"done":"oui"}'

echo "11) Cache Redis (2 appels successifs)"
docker-compose exec redis redis-cli DEL cache:todos >/dev/null || true
t1=$(curl -s -w "%{time_total}" "$BASE/todos" -o /dev/null)
t2=$(curl -s -w "%{time_total}" "$BASE/todos" -o /dev/null)
echo "   miss → ${t1}s, hit → ${t2}s"

echo "12) GZIP compression"
hdr=$(curl -s -D - -H "Accept-Encoding: gzip" "$BASE/todos" -o /dev/null \
  | grep -i "^Content-Encoding")
echo "   $hdr"

echo "13) Rate limiter (102×GET /health → 429)"
for i in $(seq 1 102); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
  if [ "$i" -eq 102 ] && [ "$code" != "429" ]; then
    echo "   ❌ Req #$i returned $code (attendu 429)"
    exit 1
  fi
done
echo "   ✅ Rate limiter OK"


echo "15) Vérification EXPLAIN QUERY PLAN"
docker-compose exec api node src/scripts/explain.js

echo "16) Vérification du histogramme HTTP (buckets)"
# on génère un peu de trafic
for i in $(seq 1 5); do curl -s -o /dev/null http://localhost:3000/health; done
for i in $(seq 1 3); do curl -s -o /dev/null http://localhost:3000/todos; done

# on teste la présence des buckets
if curl -s http://localhost:3000/metrics \
     | grep -q '^http_request_duration_seconds_bucket'; then
  echo "   ✅ Buckets http_request_duration_seconds_bucket trouvés"
else
  echo "   ❌ pas de bucket HTTP trouvé"
  exit 1
fi

echo "🎉 Tous les tests sont passés !"


echo "🎉 Tous les tests sont passés !"
