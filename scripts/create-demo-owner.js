const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > -1) {
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

(async () => {
  const email = 'owner@demo.local';
  const password = 'Owner123!';

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'owner', full_name: 'Demo Owner' },
  });

  if (userError) {
    console.error('createUser error:', JSON.stringify(userError, null, 2));
    process.exit(1);
  }

  const userId = userData?.user?.id;
  if (!userId) {
    console.error('No user id returned');
    process.exit(1);
  }

  console.log(JSON.stringify({
    id: userId,
    email,
    password,
    role: 'owner',
  }, null, 2));
  process.exit(0);
})();
