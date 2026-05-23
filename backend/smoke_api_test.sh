#!/usr/bin/env bash
set -u

BASE="${BASE:-http://127.0.0.1:8000}"
ROOM="test-room"
SESSION_ID="smoke-session-$(date +%s)"

hit() {
  METHOD="$1"
  URL="$2"
  DATA="${3:-}"

  echo
  echo "### $METHOD $URL"
  if [ -n "$DATA" ]; then
    curl -sS -i -X "$METHOD" "$BASE$URL" \
      -H "Content-Type: application/json" \
      --data "$DATA" | sed -n '1,20p'
  else
    curl -sS -i -X "$METHOD" "$BASE$URL" | sed -n '1,20p'
  fi
}

echo "BASE=$BASE"

hit GET  "/docs"
hit GET  "/auth/me"
hit GET  "/rooms"
hit POST "/rooms" "{\"roomName\":\"$ROOM\"}"
hit GET  "/rooms/$ROOM/members"
hit GET  "/rooms/$ROOM/sessions"
hit POST "/rooms/$ROOM/invite-link"

hit POST "/meeting/session/create" "{\"roomName\":\"$ROOM\",\"title\":\"Smoke Meeting\",\"meetingTitle\":\"Smoke Meeting\",\"meetingType\":\"general\",\"keywords\":\"test\"}"

hit GET  "/library/room-tree?room_name=$ROOM"
hit GET  "/todo-calendar/todo/room/$ROOM"
hit GET  "/todo-calendar/calendar/events?room_name=$ROOM"
hit GET  "/calendar/events"
hit GET  "/chat/rooms/$ROOM/messages"

hit POST "/ai/chat" "{\"message\":\"테스트 응답해줘\",\"context\":\"\",\"mode\":\"test\"}"

echo
echo "DONE"
