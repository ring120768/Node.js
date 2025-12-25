#!/usr/bin/env node
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sendLatest() {
  const formId = '331236db-3ac9-4966-ab83-d42cf2c2de5d';
  const userId = '62afcde2-80f4-4442-a993-861ed7169d59';

  // Get form with storage path
  const { data: form } = await supabase
    .from('completed_incident_forms')
    .select('pdf_storage_path')
    .eq('id', formId)
    .single();

  if (!form || !form.pdf_storage_path) {
    console.log('No PDF path found');
    return;
  }

  // Download PDF
  const { data: pdfData, error: pdfError } = await supabase.storage
    .from('generated_reports')
    .download(form.pdf_storage_path);

  if (pdfError) {
    console.log('Failed to download PDF:', pdfError.message);
    return;
  }

  const pdfBuffer = Buffer.from(await pdfData.arrayBuffer());
  console.log('Downloaded PDF:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');

  // Get user
  const { data: user } = await supabase
    .from('user_signup')
    .select('email, name, surname')
    .eq('create_user_id', userId)
    .single();

  console.log('Sending to:', user.email);

  // Send
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  await transporter.verify();
  console.log('SMTP verified');

  const timestamp = new Date().toISOString().split('T')[0];
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: 'Your Car Crash Lawyer AI Incident Report',
    html: `<h2>Your Incident Report is Ready</h2>
           <p>Dear ${user.name} ${user.surname},</p>
           <p>Please find your completed incident report attached.</p>
           <p>Best regards,<br>Car Crash Lawyer AI Team</p>`,
    attachments: [{
      filename: `Incident_Report_${timestamp}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });

  console.log('Email sent!');

  // Update DB
  await supabase
    .from('completed_incident_forms')
    .update({
      sent_to_user: true,
      email_status: { success: true, sent_at: new Date().toISOString(), method: 'manual' }
    })
    .eq('id', formId);

  console.log('Database updated');
}

sendLatest().catch(err => console.error('Error:', err.message));
