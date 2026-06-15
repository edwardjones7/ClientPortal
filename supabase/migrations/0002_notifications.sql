-- ============================================================================
-- Notifications — database webhooks → portal /api/notify → Discord
-- ----------------------------------------------------------------------------
-- Fires an HTTP POST to the portal whenever a client inserts a ticket, a chat
-- message, or a ticket comment. The endpoint filters out admin-authored rows
-- and pings Discord. Account-activation notifications fire separately from the
-- set-password server action (auth events aren't in the portal schema).
--
-- Uses pg_net for the outbound HTTP call. Replace <NOTIFY_WEBHOOK_SECRET> with
-- the same secret set as the NOTIFY_WEBHOOK_SECRET env var in Vercel. (Do not
-- commit the real secret — it's injected when this is applied.)
-- ============================================================================

create extension if not exists pg_net;

create or replace function portal.notify_webhook()
returns trigger
language plpgsql
security definer
set search_path = portal
as $$
begin
  perform net.http_post(
    url := 'https://portal.elenos.ai/api/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<NOTIFY_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
  );
  return NEW;
end $$;

drop trigger if exists notify_ticket on portal.tickets;
create trigger notify_ticket after insert on portal.tickets
  for each row execute function portal.notify_webhook();

drop trigger if exists notify_chat on portal.chat_messages;
create trigger notify_chat after insert on portal.chat_messages
  for each row execute function portal.notify_webhook();

drop trigger if exists notify_comment on portal.ticket_comments;
create trigger notify_comment after insert on portal.ticket_comments
  for each row execute function portal.notify_webhook();
