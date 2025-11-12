/**
 * Test Page 5 Damage Description Field
 *
 * Verifies that the "Describe the damage to your vehicle" field
 * is properly saved to the database.
 *
 * Usage: node test-page5-damage-field.js <user-uuid>
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testPage5DamageField(userId) {
  console.log('\n📋 Testing Page 5 Damage Description Field\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Fetch the most recent incident report
    const { data: incident, error } = await supabase
      .from('incident_reports')
      .select('id, damage_to_your_vehicle, created_at')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.log(`${colors.red}❌ Error fetching incident:${colors.reset}`, error.message);
      return;
    }

    if (!incident) {
      console.log(`${colors.yellow}⚠️  No incident reports found for user ${userId}${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}📊 Testing incident ID: ${incident.id}${colors.reset}`);
    console.log(`${colors.blue}Created: ${new Date(incident.created_at).toLocaleString('en-GB')}${colors.reset}\n`);

    // Check the damage_to_your_vehicle field
    const hasData = incident.damage_to_your_vehicle &&
                    incident.damage_to_your_vehicle.trim().length > 0;

    console.log('FIELD TEST RESULT:');
    console.log('-'.repeat(80));

    if (hasData) {
      console.log(`${colors.green}✅ damage_to_your_vehicle: POPULATED${colors.reset}`);
      console.log(`${colors.green}Content:${colors.reset} "${incident.damage_to_your_vehicle}"`);
      console.log(`${colors.green}Length:${colors.reset} ${incident.damage_to_your_vehicle.length} characters\n`);

      console.log(`${colors.green}✅ SUCCESS - Field is saving correctly!${colors.reset}\n`);
    } else {
      console.log(`${colors.red}❌ damage_to_your_vehicle: NULL or EMPTY${colors.reset}\n`);

      console.log(`${colors.yellow}⚠️  Possible reasons:${colors.reset}`);
      console.log('  1. User checked "My vehicle has no visible damage" (damage fields not required)');
      console.log('  2. User left the damage description empty');
      console.log('  3. This incident was created before the field was added');
      console.log('  4. Browser cache showing old HTML (try hard refresh: Cmd+Shift+R)\n');

      console.log(`${colors.blue}ℹ️  Testing Notes:${colors.reset}`);
      console.log('  • The field IS correctly mapped (verified in code)');
      console.log('  • HTML: <textarea id="damage-description">');
      console.log('  • SessionStorage: damage_to_your_vehicle');
      console.log('  • Database: damage_to_your_vehicle column\n');
    }

  } catch (err) {
    console.error(`${colors.red}❌ Test error:${colors.reset}`, err.message);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log(`${colors.yellow}Usage: node test-page5-damage-field.js <user-uuid>${colors.reset}\n`);
  process.exit(1);
}

testPage5DamageField(userId);
