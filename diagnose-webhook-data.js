#!/usr/bin/env node
/**
 * Diagnostic: Show exactly what data was saved for a user
 * Compare database values vs expected field refs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.argv[2] || 'nkwxh49sm2swwlzxtx1bnkwxhroukfn7';

async function diagnose() {
  console.log('\n🔍 WEBHOOK DATA DIAGNOSTIC');
  console.log('User ID:', userId);
  console.log('='.repeat(80));

  // Get incident report
  const { data: incident, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) {
    console.error('❌ Error fetching incident:', error.message);
    return;
  }

  // Critical text fields that SHOULD be populated
  const expectedTextFields = [
    'when_did_the_accident_happen',
    'what_time_did_the_accident_happen',
    'where_exactly_did_this_happen',
    'make_of_car',
    'model_of_car',
    'license_plate_number',
    'detailed_account_of_what_happened',
    'medical_how_are_you_feeling',
    'direction_and_speed',
    'damage_caused_by_accident'
  ];

  console.log('\n📝 CRITICAL TEXT FIELDS:');
  console.log('-'.repeat(80));

  let populatedCount = 0;
  let emptyCount = 0;

  expectedTextFields.forEach(field => {
    const value = incident[field];
    const hasValue = value !== null && value !== undefined && value !== '';
    
    if (hasValue) {
      console.log(`✅ ${field.padEnd(40)} = "${String(value).substring(0, 50)}"`);
      populatedCount++;
    } else {
      console.log(`❌ ${field.padEnd(40)} = (empty)`);
      emptyCount++;
    }
  });

  console.log('\n📊 SUMMARY:');
  console.log(`   Populated: ${populatedCount}/${expectedTextFields.length}`);
  console.log(`   Empty: ${emptyCount}/${expectedTextFields.length}`);

  // Show ALL non-system fields
  console.log('\n📋 ALL SAVED FIELDS (non-system):');
  console.log('-'.repeat(80));

  const systemFields = ['id', 'created_at', 'updated_at', 'create_user_id', 'deleted_at', 'retention_until'];
  const savedFields = Object.keys(incident)
    .filter(key => !systemFields.includes(key))
    .filter(key => {
      const value = incident[key];
      return value !== null && value !== undefined;
    });

  console.log(`Total non-null fields: ${savedFields.length}`);
  
  savedFields.slice(0, 20).forEach(field => {
    const value = incident[field];
    const display = typeof value === 'boolean' 
      ? `(boolean: ${value})`
      : `"${String(value).substring(0, 50)}"`;
    console.log(`   ${field.padEnd(40)} = ${display}`);
  });

  if (savedFields.length > 20) {
    console.log(`   ... and ${savedFields.length - 20} more fields`);
  }

  console.log('\n='.repeat(80));
  console.log('DIAGNOSIS COMPLETE\n');
}

diagnose().catch(console.error);
