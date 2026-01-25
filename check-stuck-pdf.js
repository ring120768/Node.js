#!/usr/bin/env node
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: incident } = await supabase
    .from("incident_reports")
    .select("*")
    .eq("pdf_send_in_progress", true)
    .single();

  if (!incident) {
    console.log("✅ No stuck incidents found");
    return;
  }

  console.log("🔒 STUCK INCIDENT FOUND:\n");
  console.log("ID:", incident.id);
  console.log("User:", incident.create_user_id);
  console.log("PDF Started:", incident.pdf_send_started_at);
  console.log("PDF Sent:", incident.pdf_sent_at || "Never");
  console.log("In Progress:", incident.pdf_send_in_progress);

  const startTime = new Date(incident.pdf_send_started_at);
  const now = new Date();
  const minutesStuck = Math.round((now - startTime) / 60000);
  console.log("\n⏱️ Stuck for:", minutesStuck, "minutes");

  // Check for completed forms
  const { data: forms } = await supabase
    .from("completed_incident_forms")
    .select("id, created_at, pdf_storage_path")
    .eq("create_user_id", incident.create_user_id)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log("\n📄 Completed Forms for this user:", forms?.length || 0);
  if (forms) {
    forms.forEach(f => {
      console.log("  -", f.id.substring(0,8) + "...", "created", new Date(f.created_at).toLocaleString("en-GB"));
      console.log("    Storage:", f.pdf_storage_path || "None");
    });
  }

  // Check queue
  const { data: queue } = await supabase
    .from("pdf_generation_queue")
    .select("*")
    .eq("create_user_id", incident.create_user_id)
    .order("created_at", { ascending: false })
    .limit(3);

  console.log("\n📥 Queue entries:", queue?.length || 0);
  if (queue) {
    queue.forEach(q => {
      console.log("  - Status:", q.status, "Attempts:", q.attempt_count || 0);
      console.log("    Error:", q.last_error || "None");
    });
  }
}

check();
