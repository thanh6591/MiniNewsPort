#!/bin/bash

BASE_URL="https://mini-news-port.vercel.app"
HEALTH_URL="$BASE_URL/api/health"
MAX_TRIES=18
INTERVAL=10

echo "Polling health check..."
for ((i=1; i<=MAX_TRIES; i++)); do
  RESPONSE=$(curl -s "$HEALTH_URL")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    MIGRATIONS_OK=$(echo "$RESPONSE" | jq -r '.checks.migrations.ok')
    if [ "$MIGRATIONS_OK" == "true" ]; then
      echo "Health check passed!"
      break
    fi
  fi
  
  if [ $i -eq $MAX_TRIES ]; then
    echo "Health check failed after $MAX_TRIES tries."
    exit 1
  fi
  
  echo "Try $i: Health check not ready. Waiting ${INTERVAL}s..."
  sleep $INTERVAL
done

echo "Fetching categories..."
curl -s "$BASE_URL/api/categories" | jq .

CATEGORIES=("politics" "business" "technology" "lifestyle")

for slug in "${CATEGORIES[@]}"; do
  echo "----------------------------------------"
  echo "Category: $slug"
  NEWS_URL="$BASE_URL/api/news?categorySlug=$slug&limit=100"
  RESPONSE=$(curl -s "$NEWS_URL")
  
  TOTAL=$(echo "$RESPONSE" | jq '.total')
  COUNT=$(echo "$RESPONSE" | jq '.items | length')
  FIRST_TITLE=$(echo "$RESPONSE" | jq -r '.items[0].title')
  
  echo "Total: $TOTAL"
  echo "Items Length: $COUNT"
  echo "First Title: $FIRST_TITLE"
done
