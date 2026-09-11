const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > -1) env[line.slice(0, idx)] = line.slice(idx + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function ensureOwner() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;

  const owner = users.users.find((u) => u.email === 'owner@demo.local' || u.user_metadata?.role === 'owner');
  if (owner) return owner;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: 'owner@demo.local',
    password: 'Owner123!',
    email_confirm: true,
    user_metadata: { role: 'owner', full_name: 'Demo Owner' },
  });

  if (createError) throw createError;
  return created.user;
}

(async () => {
  try {
    const owner = await ensureOwner();
    const payload = [
      {
        id: crypto.randomUUID(),
        title: 'Sunny 2BR Apartment Near Campus',
        description: 'Bright apartment with kitchen, balcony, Wi‑Fi and close to campus.',
        address: '145 University Avenue, San Francisco, CA 94105',
        bedroom: 2,
        price: 7500,
        propertyType: 'Apartment',
        type: 'Rent',
        active: true,
        status: 'published',
        createdBy: owner.email || 'owner@demo.local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Modern Studio for Students',
        description: 'Fully furnished studio with safe access, laundry, and transit nearby.',
        address: '88 Market Street, San Francisco, CA 94103',
        bedroom: 1,
        price: 5400,
        propertyType: 'Studio',
        type: 'Rent',
        active: true,
        status: 'published',
        createdBy: owner.email || 'owner@demo.local',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data, error } = await supabase.from('listings').insert(payload).select();
    if (error) throw error;

    console.log('Inserted listing rows:', data.length);
    for (const item of data) {
      console.log('LISTING', item.id, item.title, item.createdBy, item.type, item.active);
    }

    const { data: rentals, error: rentalsError } = await supabase
      .from('listings')
      .select('id,title,address,price,type,active,createdby')
      .eq('type', 'Rent')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (rentalsError) throw rentalsError;

    console.log('RENTAL_ROWS=', rentals.length);
    console.log(JSON.stringify(rentals, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('FATAL_ERROR=', JSON.stringify(error, null, 2));
    process.exit(1);
  }
})();
