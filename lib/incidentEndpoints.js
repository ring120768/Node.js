// lib/incidentEndpoints.js

const Logger = require('../logger'); // Assuming you have a logger module

class IncidentEndpoints {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // Authentication status endpoint
  async getAuthStatus(req, res) {
    try {
      // Get auth token from cookie or header
      const token = req.cookies?.authToken || 
                   req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.json({ authenticated: false });
      }

      // Verify with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return res.json({ authenticated: false });
      }

      res.json({
        authenticated: true,
        user: {
          uid: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Auth status error:', error);
      res.json({ authenticated: false });
    }
  }

  // Emergency contacts endpoint
  async getEmergencyContacts(req, res) {
    try {
      const { userId } = req.params;

      const { data, error } = await this.supabase
        .from('user_signup')
        .select('emergency_contact, recovery_breakdown_number')
        .eq('create_user_id', userId)
        .single();

      if (error) {
        console.error('Emergency contacts fetch error:', error);
        return res.status(404).json({ error: 'Contacts not found' });
      }

      res.json({
        emergency_contact: data?.emergency_contact || null,
        recovery_breakdown_number: data?.recovery_breakdown_number || null,
        emergency_services_number: '999' // UK default
      });
    } catch (error) {
      console.error('Emergency contacts error:', error);
      res.status(500).json({ error: 'Failed to fetch emergency contacts' });
    }
  }

  // Store evidence audio endpoint
  async storeEvidenceAudio(req, res) {
    try {
      const audioFile = req.file;
      const { user_id, incident_id, timestamp, latitude, longitude, accuracy, what3words } = req.body;

      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Generate unique filename
      const fileName = `${user_id}/${incident_id}/audio_${Date.now()}.webm`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('incident-evidence')
        .upload(fileName, audioFile.buffer, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('incident-evidence')
        .getPublicUrl(fileName);

      // Store metadata in database
      const { data: dbData, error: dbError } = await this.supabase
        .from('incident_evidence')
        .insert({
          user_id,
          incident_id,
          evidence_type: 'audio',
          file_url: publicUrl,
          file_path: fileName,
          metadata: {
            timestamp,
            location: latitude && longitude ? {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              accuracy: parseFloat(accuracy)
            } : null,
            what3words
          },
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
      }

      // Queue for transcription
      const { error: queueError } = await this.supabase
        .from('transcription_queue')
        .insert({
          user_id,
          audio_url: publicUrl,
          status: 'PENDING',
          incident_id,
          created_at: new Date().toISOString()
        });

      if (queueError) {
        console.error('Transcription queue error:', queueError);
      }

      res.json({
        success: true,
        fileUrl: publicUrl,
        storagePath: fileName,
        queued_for_transcription: !queueError
      });
    } catch (error) {
      console.error('Audio storage error:', error);
      res.status(500).json({ error: 'Failed to store audio evidence' });
    }
  }

  // Upload What3Words screenshot endpoint
  async uploadWhat3WordsImage(req, res) {
    try {
      const imageFile = req.file;
      const { what3words, latitude, longitude, userId } = req.body;

      if (!imageFile) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Generate filename
      const fileName = `${userId}/what3words/w3w_${Date.now()}.png`;

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('incident-images')
        .upload(fileName, imageFile.buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('incident-images')
        .getPublicUrl(fileName);

      res.json({
        success: true,
        storagePath: fileName,
        publicUrl
      });
    } catch (error) {
      console.error('What3Words image upload error:', error);
      res.status(500).json({ error: 'Failed to upload What3Words screenshot' });
    }
  }

  // Upload dashcam video endpoint
  async uploadDashcam(req, res) {
    try {
      const videoFile = req.file;
      const { userId, incidentId, timestamp } = req.body;

      if (!videoFile) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      // Validate file size (500MB max)
      if (videoFile.size > 500 * 1024 * 1024) {
        return res.status(413).json({ error: 'File too large. Max 500MB allowed.' });
      }

      // Generate filename
      const fileName = `${userId}/${incidentId}/dashcam_${Date.now()}.mp4`;

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('incident-video')
        .upload(fileName, videoFile.buffer, {
          contentType: videoFile.mimetype,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('incident-video')
        .getPublicUrl(fileName);

      // Store metadata
      const { error: dbError } = await this.supabase
        .from('dash_cam_footage')
        .insert({
          user_id: userId,
          incident_id: incidentId,
          file_url: publicUrl,
          file_path: fileName,
          upload_timestamp: timestamp,
          file_size: videoFile.size,
          mime_type: videoFile.mimetype,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
      }

      res.json({
        success: true,
        fileUrl: publicUrl,
        storagePath: fileName
      });
    } catch (error) {
      console.error('Dashcam upload error:', error);
      res.status(500).json({ error: 'Failed to upload dashcam video' });
    }
  }
}

module.exports = IncidentEndpoints;