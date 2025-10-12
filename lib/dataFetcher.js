// lib/dataFetcher.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * Fetch all data needed for PDF generation
 * @param {string} createUserId - The UUID from Typeform
 * @returns {object} All collected data from various tables
 */
async function fetchAllData(createUserId) {
  try {
    console.log(`📊 Fetching data for user: ${createUserId}`);

    // Fetch user signup data
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', createUserId)
      .single();

    if (userError) throw new Error(`User data error: ${userError.message}`);

    // Fetch incident reports
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', createUserId)
      .order('created_at', { ascending: false });

    // Fetch DVLA vehicle info
    const { data: dvlaData, error: dvlaError } = await supabase
      .from('dvla_vehicle_info_new')
      .select('*')
      .eq('create_user_id', createUserId);

    // Fetch incident images
    const { data: imagesData, error: imagesError } = await supabase
      .from('incident_images')
      .select('*')
      .eq('create_user_id', createUserId)
      .is('deletion_completed', null);

    // Organize images by type
    const imagesByType = {};
    if (imagesData) {
      imagesData.forEach(img => {
        imagesByType[img.image_type] = img;
      });
    }

    // Get signed URLs for images (valid for 1 hour)
    const signedUrls = {};
    for (const [type, image] of Object.entries(imagesByType)) {
      if (image.file_name) {
        const { data, error } = await supabase.storage
          .from('incident-images-secure')
          .createSignedUrl(image.file_name, 3600);

        if (data && !error) {
          signedUrls[type] = data.signedUrl;
        }
      }
    }

    // Compile all data
    const allData = {
      user: userData || {},
      incidents: incidentData || [],
      currentIncident: incidentData && incidentData.length > 0 ? incidentData[0] : {},
      dvla: dvlaData || [],
      images: imagesByType,
      imageUrls: signedUrls,
      metadata: {
        create_user_id: createUserId,
        generated_at: new Date().toISOString(),
        total_incidents: incidentData ? incidentData.length : 0,
        total_images: imagesData ? imagesData.length : 0
      }
    };

    console.log(`✅ Data fetched successfully: ${allData.metadata.total_incidents} incidents, ${allData.metadata.total_images} images`);

    return allData;

  } catch (error) {
    console.error('❌ Error fetching data:', error);
    throw error;
  }
}

module.exports = { fetchAllData };