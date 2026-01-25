#!/usr/bin/env node
/**
 * Diagnose PDF generation crash
 * Checks for problematic data that might cause the PDF filler to crash
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// The stuck incident from the logs
const INCIDENT_ID = "3d92a38e-a381-490e-9e0e-42c01e35b4c3";
const USER_ID = "61033b12-c351-42c0-9647-725eb1ee9154";

async function diagnose() {
  console.log("🔍 Diagnosing PDF crash for incident:", INCIDENT_ID);
  console.log("   User ID:", USER_ID);
  console.log("");

  // 1. Check incident report data
  console.log("📋 INCIDENT REPORT DATA:");
  const { data: incident, error: incidentError } = await supabase
    .from("incident_reports")
    .select("*")
    .eq("id", INCIDENT_ID)
    .single();

  if (incidentError) {
    console.error("   ❌ Error fetching incident:", incidentError.message);
  } else {
    console.log("   Status:", incident.status);
    console.log("   PDF Send In Progress:", incident.pdf_send_in_progress);
    console.log("   PDF Sent At:", incident.pdf_sent_at || "Never");
    console.log("   Created:", new Date(incident.created_at).toLocaleString("en-GB"));

    // Check for problematic field values
    const textFields = ['voice_transcription', 'ai_summary', 'quality_review', 'closing_statement', 'final_review'];
    for (const field of textFields) {
      const value = incident[field];
      if (value) {
        console.log(`   ${field}: ${value.length} chars`);
        // Check for null bytes or other problematic characters
        if (value.includes('\x00')) {
          console.log(`   ⚠️  WARNING: ${field} contains NULL bytes!`);
        }
        if (value.length > 50000) {
          console.log(`   ⚠️  WARNING: ${field} is very large (${value.length} chars)`);
        }
      } else {
        console.log(`   ${field}: [EMPTY]`);
      }
    }

    // Check image URL fields
    const urlFields = [
      'scene_photo_1_url', 'scene_photo_2_url', 'scene_photo_3_url',
      'other_vehicle_photo_1_url', 'other_vehicle_photo_2_url', 'other_vehicle_photo_3_url',
      'vehicle_damage_photo_1_url', 'vehicle_damage_photo_2_url', 'vehicle_damage_photo_3_url',
      'vehicle_damage_photo_4_url', 'vehicle_damage_photo_5_url'
    ];

    console.log("\n📷 IMAGE URLs in incident_reports:");
    let urlCount = 0;
    for (const field of urlFields) {
      if (incident[field]) {
        urlCount++;
        console.log(`   ${field}: ${incident[field].length} chars`);
      }
    }
    console.log(`   Total URLs: ${urlCount}`);
  }

  // 2. Check emergency audio data
  console.log("\n🎤 EMERGENCY AUDIO (AI Eavesdropper):");
  const { data: emergencyAudio, error: audioError } = await supabase
    .from("ai_listening_transcripts")
    .select("*")
    .eq("create_user_id", USER_ID)
    .order("recorded_at", { ascending: false })
    .limit(3);

  if (audioError) {
    console.error("   ❌ Error fetching emergency audio:", audioError.message);
  } else if (!emergencyAudio || emergencyAudio.length === 0) {
    console.log("   No emergency audio recordings found");
  } else {
    console.log(`   Found ${emergencyAudio.length} recordings:`);
    for (const audio of emergencyAudio) {
      console.log(`   - ID: ${audio.id.substring(0, 8)}...`);
      console.log(`     Incident ID: ${audio.incident_id || "NOT LINKED"}`);
      console.log(`     Recorded: ${new Date(audio.recorded_at).toLocaleString("en-GB")}`);
      console.log(`     Transcription: ${audio.transcription_text ? audio.transcription_text.length + " chars" : "EMPTY"}`);
      console.log(`     Duration: ${audio.duration_seconds || "Unknown"} seconds`);

      // Check for problematic characters in transcription
      if (audio.transcription_text) {
        if (audio.transcription_text.includes('\x00')) {
          console.log(`     ⚠️  WARNING: Transcription contains NULL bytes!`);
        }
        if (audio.transcription_text.length > 50000) {
          console.log(`     ⚠️  WARNING: Transcription is very large (${audio.transcription_text.length} chars)`);
        }
        // Show first 200 chars
        console.log(`     Preview: "${audio.transcription_text.substring(0, 200)}..."`);
      }
    }
  }

  // 3. Check user documents
  console.log("\n📄 USER DOCUMENTS:");
  const { data: userDocs, error: docsError } = await supabase
    .from("user_documents")
    .select("*")
    .eq("create_user_id", USER_ID);

  if (docsError) {
    console.error("   ❌ Error fetching user documents:", docsError.message);
  } else {
    console.log(`   Total documents: ${userDocs?.length || 0}`);
    const byType = {};
    for (const doc of (userDocs || [])) {
      byType[doc.document_type] = (byType[doc.document_type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
      console.log(`   - ${type}: ${count}`);
    }

    // Show signed_url status for each document
    console.log("\n   📎 Signed URL Status:");
    for (const doc of (userDocs || [])) {
      const hasUrl = doc.signed_url ? "✅ YES" : "❌ NO";
      const urlPreview = doc.signed_url ? doc.signed_url.substring(0, 60) + "..." : "NONE";
      console.log(`   - ${doc.document_type}: ${hasUrl}`);
      console.log(`     URL: ${urlPreview}`);
    }

    // Check for location_map_screenshot or what3words
    const locationDocs = (userDocs || []).filter(d =>
      d.document_type === 'location_map_screenshot' ||
      d.document_type === 'what3words_screenshot' ||
      d.document_type === 'location_screenshot'
    );
    console.log(`\n   Location/What3Words documents: ${locationDocs.length}`);
    for (const doc of locationDocs) {
      console.log(`   - Type: ${doc.document_type}`);
      console.log(`     Has signed_url: ${doc.signed_url ? "YES" : "NO"}`);
      console.log(`     Storage path: ${doc.storage_path || "NONE"}`);
    }
  }

  // 4. Check PDF generation queue
  console.log("\n📥 PDF GENERATION QUEUE:");
  const { data: queue, error: queueError } = await supabase
    .from("pdf_generation_queue")
    .select("*")
    .eq("create_user_id", USER_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  if (queueError) {
    console.error("   ❌ Error fetching queue:", queueError.message);
  } else {
    for (const q of (queue || [])) {
      console.log(`   - Status: ${q.status}`);
      console.log(`     Attempts: ${q.attempt_count || 0}`);
      console.log(`     Source: ${q.source}`);
      console.log(`     Error: ${q.last_error || "None"}`);
      console.log(`     Created: ${new Date(q.created_at).toLocaleString("en-GB")}`);
      console.log("");
    }
  }

  console.log("\n✅ Diagnosis complete");
}

diagnose().catch(console.error);
