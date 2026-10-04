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

const email = 'admin@demo.local';
const password = 'Admin123!';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function createDemoAdmin() {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let user = usersData.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (user && user.user_metadata?.role !== 'admin') {
    throw new Error(`${email} already exists with a non-admin role; no account changes were made.`);
  }

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', full_name: 'Demo Admin' },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from('profiles').upsert([{
    id: user.id,
    email,
    role: 'admin',
    full_name: user.user_metadata?.full_name || 'Demo Admin',
  }]);
  if (profileError) throw profileError;

  console.log(`Demo admin ready: ${email}`);
}

createDemoAdmin().catch((error) => {
  console.error(`Unable to create demo admin: ${error.message}`);
  process.exitCode = 1;
});