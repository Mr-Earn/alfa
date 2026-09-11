const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://yljqayjeimaampvuutlo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsanFheWplaW1hYW1wdnV1dGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI3Nzc1NCwiZXhwIjoyMTAwODUzNzU0fQ.S6vPj0LqTXfdPfrRx0Uh8M657awsEh5RPSgt2C6zGcU'
);

(async () => {
  // Test public read with service role
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, type, active')
    .eq('type', 'Rent')
    .eq('active', true);
  
  if (error) {
    console.error('Service role error:', error);
  } else {
    console.log('Service role query succeeded. Found:', data?.length, 'listings');
  }
})();
