const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yljqayjeimaampvuutlo.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_API_KEY;

if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const tables = ['listings', 'listing', 'marketplace_items', 'profiles', 'messages'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    console.log(table, error ? 'ERROR:' + error.message : 'OK:' + (data?.length ?? 0));
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
