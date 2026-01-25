#!/usr/bin/env node
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: queue, error } = await supabase
    .from("pdf_generation_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("📥 PDF Generation Queue:\n");
  queue.forEach((q, i) => {
    console.log(`${i+1}. User: ${q.create_user_id?.substring(0,8)}...`);
    console.log(`   Status: ${q.status}`);
    console.log(`   Attempts: ${q.attempt_count || 0}`);
    console.log(`   Source: ${q.source}`);
    console.log(`   Error: ${q.last_error || "None"}`);
    console.log(`   Created: ${new Date(q.created_at).toLocaleString("en-GB")}`);
    console.log("");
  });
}

check();
