const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Simple UUID v4 generator
function generateUUID() {
  return crypto.randomUUID();
}

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > -1) {
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE, 
  { auth: { persistSession: false } }
);

(async () => {
  try {
    // Get the owner user
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Error listing users:', usersError);
      process.exit(1);
    }

    const ownerUser = users.users.find(u => u.user_metadata?.role === 'owner');
    if (!ownerUser) {
      console.error('No owner user found. Run create-demo-owner.js first.');
      process.exit(1);
    }

    const ownerId = ownerUser.id;
    const ownerEmail = ownerUser.email;
    console.log(`Using owner ID: ${ownerId} (${ownerEmail})`);

    // Create demo listing (using absolute minimal columns)
    const listingId = generateUUID();
    const demoListing = {
      id: listingId,
      title: 'Beautiful 2-Bedroom Apartment Near Campus',
      description: 'Spacious and modern apartment perfect for students. Walking distance to university campus, equipped with high-speed internet, furnished, and utilities included. Safe neighborhood with nearby transit.',
      address: '123 University Avenue, San Francisco, CA 94105',
      price: 8500,
      type: 'Rent',
      propertyType: 'Apartment',
      bedroom: 2,
      bathroom: 1,
      active: true,
      createdBy: ownerEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: insertedListing, error: insertError } = await supabase
      .from('listings')
      .insert([demoListing])
      .select();

    if (insertError) {
      console.error('Error creating listing:', insertError);
      process.exit(1);
    }

    console.log('\n✅ Demo Listing Created:');
    console.log(JSON.stringify(demoListing, null, 2));

    // Add sample images (using placeholder image URLs)
    const demoImages = [
      {
        id: generateUUID(),
        listing_id: listingId,
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        created_at: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        listing_id: listingId,
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
        created_at: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        listing_id: listingId,
        url: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
        created_at: new Date().toISOString(),
      },
    ];

    const { error: imagesError } = await supabase
      .from('listingImages')
      .insert(demoImages);

    if (imagesError) {
      console.warn('⚠️  Warning: Could not add images (listingImages table may not exist yet)');
      console.warn('Note: Run the migration script to create the listingImages table');
    } else {
      console.log('\n✅ Demo Images Added:');
      console.log(`Added ${demoImages.length} images to listing`);
    }

    console.log('\n🎉 Demo property created successfully!');
    console.log(`\nListing Details:`);
    console.log(`- ID: ${listingId}`);
    console.log(`- Title: ${demoListing.title}`);
    console.log(`- Price: $${demoListing.price}`);
    console.log(`- Address: ${demoListing.address}`);
    console.log(`\n🌐 View at: http://localhost:3001/rent`);
    console.log(`📝 Edit at: http://localhost:3001/edit-listing/${listingId}`);

    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
})();
