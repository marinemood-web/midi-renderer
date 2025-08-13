Auto MP3 renderer repo.
Trigger via repository_dispatch (event_type: render-music) with client_payload:
  { "phrase": "hello", "bpm": 120, "chat_id": "<TELEGRAM_CHAT_ID>", "telegram_bot_token": "<optional token>" }
If telegram_bot_token provided in payload, workflow will use it; otherwise put TELEGRAM_BOT_TOKEN in repo secrets.
