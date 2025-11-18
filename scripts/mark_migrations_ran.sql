-- mark_migrations_ran.sql
-- Run after backing up DB. Inserts migration metadata so Laravel treats
-- the listed migrations as already applied.

SET @b := (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations);

INSERT INTO migrations (migration, batch) VALUES
  ('2025_11_18_000002_create_flight_status_table', @b),
  ('2025_11_18_000003_create_flights_table', @b),
  ('2025_11_18_000004_create_minimal_lookups_for_tests', @b),
  ('2025_11_18_000005_create_flight_events_table', @b),
  ('2025_11_18_000006_add_deleted_at_to_flights', @b),
  ('2025_11_18_000007_add_description_to_flight_events', @b);
