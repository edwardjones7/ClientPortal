-- ============================================================================
-- Client notifications — email clients when their ticket status changes
-- ----------------------------------------------------------------------------
-- Extends the webhook in 0002. The existing AFTER INSERT triggers cover new
-- tickets / comments / chat; this adds an AFTER UPDATE trigger on tickets that
-- fires ONLY when the status actually changes, so /api/notify can email the
-- client who opened the ticket.
--
-- The `when (old.status is distinct from new.status)` guard is load-bearing:
-- bump_ticket_on_comment / tickets_touch_updated_at run UPDATEs on tickets for
-- every comment, so without the guard this would fire on every reply.
--
-- Uses pg_net (already created in 0002). Replace <NOTIFY_WEBHOOK_SECRET> with
-- the same secret set as the NOTIFY_WEBHOOK_SECRET env var in Vercel.
-- ============================================================================

create or replace function portal.notify_status_change()
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
    body := jsonb_build_object(
      'table', 'tickets',
      'event', 'status_change',
      'record', to_jsonb(NEW),
      'old', jsonb_build_object('status', OLD.status)
    )
  );
  return NEW;
end $$;

drop trigger if exists notify_status_change on portal.tickets;
create trigger notify_status_change after update on portal.tickets
  for each row
  when (old.status is distinct from new.status)
  execute function portal.notify_status_change();
