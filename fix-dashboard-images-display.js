#!/usr/bin/env node

/**
 * Fix Dashboard Images Display
 *
 * Problem: Images are stored as URLs in user_signup table but dashboard expects them in user_documents table
 * Solution: Create user_documents records from existing user_signup image URLs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixDashboardImages() {
  try {
    log(colors.cyan, '\n🔧 Fixing Dashboard Image Display\n');

    // Get all users with image URLs
    const { data: users, error: fetchError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, driving_license_picture, vehicle_picture_front, vehicle_picture_back, vehicle_picture_driver_side, vehicle_picture_passenger_side')
      .not('driving_license_picture', 'is', null);

    if (fetchError) {
      log(colors.red, `❌ Error fetching users: ${fetchError.message}`);
      return;
    }

    log(colors.green, `Found ${users.length} users with images`);

    for (const user of users) {
      log(colors.cyan, `\nProcessing user: ${user.name || user.email} (${user.create_user_id})`);

      // Check if documents already exist
      const { data: existingDocs, error: checkError } = await supabase
        .from('user_documents')
        .select('id')
        .eq('create_user_id', user.create_user_id);

      if (existingDocs && existingDocs.length > 0) {
        log(colors.yellow, `  ⚠️  User already has ${existingDocs.length} documents - skipping`);
        continue;
      }

      // Map image fields to document types
      const imageFields = [
        { field: 'driving_license_picture', type: 'driving_license_picture' },
        { field: 'vehicle_picture_front', type: 'vehicle_picture_front' },
        { field: 'vehicle_picture_back', type: 'vehicle_picture_back' },
        { field: 'vehicle_picture_driver_side', type: 'vehicle_picture_driver_side' },
        { field: 'vehicle_picture_passenger_side', type: 'vehicle_picture_passenger_side' }
      ];

      const documentsToInsert = [];

      for (const { field, type } of imageFields) {
        const url = user[field];
        if (url) {
          // Extract UUID from URL if present
          const uuidMatch = url.match(/user-documents\/([a-f0-9-]+)\//);
          const docId = uuidMatch ? uuidMatch[1] : null;

          // Extract filename from URL
          const filenameMatch = url.match(/(\d+_[^\/]+\.(jpeg|jpg|png))$/i);
          const filename = filenameMatch ? filenameMatch[1] : `${type}.jpeg`;

          documentsToInsert.push({
            id: docId || undefined, // Use existing UUID if available
            create_user_id: user.create_user_id,
            document_type: type,
            document_category: 'image',
            status: 'completed',
            storage_path: `user-documents/${user.create_user_id}/${filename}`,
            public_url: url,
            original_url: url,
            original_filename: filename,
            file_size: 100000, // Default size as we don't have actual size
            mime_type: 'image/jpeg',
            file_extension: '.jpeg',
            source_type: 'typeform',
            source_field: field,
            storage_bucket: 'user-documents',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      if (documentsToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('user_documents')
          .insert(documentsToInsert)
          .select();

        if (insertError) {
          log(colors.red, `  ❌ Error inserting documents: ${insertError.message}`);
        } else {
          log(colors.green, `  ✅ Created ${inserted.length} document records`);
        }
      } else {
        log(colors.yellow, `  ⚠️  No image URLs found for user`);
      }
    }

    log(colors.green, '\n✅ Dashboard image fix complete!\n');
    log(colors.cyan, 'The dashboard should now display images properly.');

  } catch (error) {
    log(colors.red, `\n❌ Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Run the fix
fixDashboardImages().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});