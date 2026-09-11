const { createClient } = require('@supabase/supabase-js');

// Test with publishable key (public/anon client)
const supabase = createClient(
  'https://yljqayjeimaampvuutlo.supabase.co',
  'sb_publishable_1E0GGxWLIWP4Nx50_P0wvA_kHhCt-vh'
);

(async () => {
  // Test public read with anon key
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, type, active')
    .eq('type', 'Rent')
    .eq('active', true);
  
  if (error) {
    console.error('Anon/Public key error:', error);
  } else {
    console.log('Anon key query succeeded. Found:', data?.length, 'listings');
    data?.slice(0, 2).forEach(d => console.log(`  - ${d.title} (type: ${d.type})`));
  }
})();
