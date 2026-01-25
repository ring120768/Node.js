#!/usr/bin/env node
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const INCIDENT_ID = "3d92a38e-a381-490e-9e0e-42c01e35b4c3";

async function releaseLock() {
  console.log("🔓 Releasing stuck PDF lock for incident:", INCIDENT_ID);

  const { data, error } = await supabase
    .from("incident_reports")
    .update({
      pdf_send_in_progress: false,
      pdf_send_started_at: null
    })
    .eq("id", INCIDENT_ID)
    .select();

  if (error) {
    console.error("❌ Error:", error.message);
    return;
  }

  console.log("✅ Lock released successfully");
  console.log("   pdf_send_in_progress:", data[0]?.pdf_send_in_progress);

  // Reset the queue entry so it can retry
  const { error: queueError } = await supabase
    .from("pdf_generation_queue")
    .update({
      status: "pending",
      last_error: null,
      next_attempt_at: new Date().toISOString()
    })
    .eq("create_user_id", "61033b12-c351-42c0-9647-725eb1ee9154")
    .eq("status", "pending");

  if (queueError) {
    console.error("❌ Queue reset error:", queueError.message);
  } else {
    console.log("✅ Queue entry reset - will retry soon");
  }
}

releaseLock();
