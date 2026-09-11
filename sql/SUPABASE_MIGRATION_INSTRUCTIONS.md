Supabase migration: add `listing_title` to `bookings`

Files
- `sql/add_listing_title_to_bookings.sql` — SQL migration that adds `listing_title` column and indices.
- `sql/create_messages_table.sql` — SQL to create `messages` table with sender/recipient columns and indices.

Options to apply the migration

1) Supabase SQL Editor (recommended)
- Open your Supabase project in the dashboard.
- Go to "SQL" → "New query".
- Copy the contents of `sql/add_listing_title_to_bookings.sql` and run it.

2) psql (local/CI)
- Use your database connection string from Supabase (Settings → Database → Connection string).
- Run:

```bash
PGPASSWORD="$DB_PASSWORD" psql "$DB_HOSTSTRING" -f sql/add_listing_title_to_bookings.sql
```

Replace `$DB_HOSTSTRING` with your full connection string (e.g., `postgres://user:password@host:5432/dbname`).

3) Supabase CLI
- Ensure `supabase` CLI is installed and authenticated.
- Run the SQL from a file directly (supabase CLI supports piping SQL into `supabase db query`):

```bash
cat sql/add_listing_title_to_bookings.sql | supabase db query

Also to create the `messages` table (if you plan to use Supabase for messaging):

```bash
cat sql/create_messages_table.sql | supabase db query
```
```

Notes
- The migration is additive (`IF NOT EXISTS`) and safe to run multiple times.
- After the migration, existing bookings will have `listing_title` = NULL until updated.
- Consider backfilling `listing_title` for existing rows by joining `bookings` with your `listings` table and updating rows where `listing_title` IS NULL.

Example backfill (adjust table/column names if different):

```sql
UPDATE bookings
SET listing_title = l.title
FROM listings l
WHERE bookings.listing_id = l.id
  AND bookings.listing_title IS NULL;
```

Run the backfill in the Supabase SQL editor or via CLI.
