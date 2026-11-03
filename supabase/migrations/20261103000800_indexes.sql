-- 8. Indexes. Each one names the query it serves. Unique constraints declared earlier already
--    index: applications(student_id, scholarship_id), notifications(user_id, dedupe_key),
--    scholarship_*(scholarship_id, position), providers(name), scholarships(slug).

-- Explore and landing: published listings ordered/filtered by deadline ("closing soon", status filter).
create index scholarships_status_closes_idx on public.scholarships (listing_status, closes_on);

-- "Newest" sort and new-match notifications: published listings by publish time.
create index scholarships_published_at_idx on public.scholarships (published_at desc) where listing_status = 'published';

-- Join to providers on every list query; provider filter; FK check when a provider is deleted.
create index scholarships_provider_idx on public.scholarships (provider_id);

-- Provider-type filter ("Government", "Private", ...). Type lives on providers (normalised).
create index providers_type_idx on public.providers (type);

-- Coordinator "my listings" view and the RLS update check (assigned_coordinator_id = auth.uid()).
create index scholarships_assigned_idx on public.scholarships (assigned_coordinator_id) where assigned_coordinator_id is not null;

-- Full-text prefix search over name + provider + summary (search_scholarships p_q).
create index scholarships_search_idx on public.scholarships using gin (search_doc);

-- Trigram search on names for the staff listings table's "contains" search.
create index scholarships_name_trgm_idx on public.scholarships using gin (lower(name) extensions.gin_trgm_ops);

-- Array criteria: "which listings accept this course / region / year" (filters, new-match job).
create index scholarship_criteria_fields_idx on public.scholarship_criteria using gin (fields);
create index scholarship_criteria_regions_idx on public.scholarship_criteria using gin (regions);
create index scholarship_criteria_years_idx on public.scholarship_criteria using gin (year_levels);

-- Deadline history per listing, newest first (staff history; change-alert job).
create index deadline_changes_scholarship_idx on public.deadline_changes (scholarship_id, changed_at desc);
-- Change-alert job: changes not yet notified.
create index deadline_changes_unnotified_idx on public.deadline_changes (changed_at) where notified_at is null;

-- Dashboard and tracker tabs: a student's applications by stage.
create index applications_student_stage_idx on public.applications (student_id, stage);
-- Reminder and change jobs: who tracks this scholarship; FK cascade from scholarships.
create index applications_scholarship_stage_idx on public.applications (scholarship_id, stage);

-- FK cascade when a document is removed from a listing.
create index application_documents_document_idx on public.application_documents (document_id);

-- Alerts page and unread badge: a user's notifications, unread first, newest first.
create index notifications_user_read_created_idx on public.notifications (user_id, read_at, created_at desc);
-- Email dispatcher: the queue of notifications still to email.
create index notifications_email_pending_idx on public.notifications (created_at) where email_status = 'pending';

-- Audit log page: newest first with keyset pagination on (created_at, id).
create index audit_logs_created_idx on public.audit_logs (created_at desc, id desc);
-- Audit filters: by actor, and by entity (history of one listing or user).
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- Dashboard and staff announcements list, newest first.
create index announcements_published_idx on public.announcements (published_at desc);

-- Staff inquiry queue (open first, oldest waiting first) and a student's own questions.
create index inquiries_status_created_idx on public.inquiries (status, created_at);
create index inquiries_student_idx on public.inquiries (student_id, created_at desc) where student_id is not null;
create index inquiry_replies_inquiry_idx on public.inquiry_replies (inquiry_id, created_at);

-- Web push fan-out per user.
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Admin users table: filter by role/status; last-active-admin guard.
create index profiles_role_status_idx on public.profiles (role, status);
-- Admin users table search by name or email (contains, case-insensitive).
create index profiles_search_trgm_idx on public.profiles
  using gin ((lower(coalesce(full_name, '') || ' ' || coalesce(email, ''))) extensions.gin_trgm_ops);
