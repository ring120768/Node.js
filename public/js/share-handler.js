/**
 * Share Handler for Dashcam Videos
 *
 * Handles video sharing from external apps (dashcam apps, gallery, etc.)
 * Integrates with Capacitor App Plugin to detect shared content on app launch
 *
 * Usage:
 * - Include this script in index.html or main entry point
 * - Automatically detects shared videos when app opens
 * - Redirects to attach-dashcam.html with video data
 */

(function() {
  'use strict';

  console.log('📱 Share handler initialized');

  // Check if Capacitor is available (native mobile app)
  if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform()) {
    console.log('ℹ️ Running in web browser - share functionality disabled');
    return;
  }

  /**
   * Handle shared content when app opens or resumes
   */
  async function handleSharedContent() {
    try {
      const { App } = Capacitor.Plugins;

      // Listen for app URL open events (Android ACTION_SEND)
      App.addListener('appUrlOpen', async (data) => {
        console.log('🔗 App opened with URL:', data.url);

        // Check if this is a share intent
        if (isShareIntent(data.url)) {
          await processSharedVideo(data.url);
        }
      });

      // Check if app was launched with shared content (Android)
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl && launchUrl.url && isShareIntent(launchUrl.url)) {
        console.log('🚀 App launched with shared content');
        await processSharedVideo(launchUrl.url);
      }

      console.log('✅ Share handler ready');

    } catch (error) {
      console.error('❌ Error setting up share handler:', error);
    }
  }

  /**
   * Check if URL is a share intent
   */
  function isShareIntent(url) {
    // Android share intents typically have content:// URIs or file:// URIs
    return url && (
      url.startsWith('content://') ||
      url.startsWith('file://') ||
      url.includes('action=send')
    );
  }

  /**
   * Process shared video file
   */
  async function processSharedVideo(url) {
    try {
      console.log('🎥 Processing shared video:', url);

      // For Android, the URL is a content:// URI that points to the shared video
      // We need to:
      // 1. Read the video file from the content URI
      // 2. Convert to Blob/File
      // 3. Pass to attach-dashcam.html

      // Store the shared video URI in localStorage for attach-dashcam.html to pick up
      const shareData = {
        videoUri: url,
        timestamp: Date.now(),
        source: 'share_intent'
      };

      localStorage.setItem('pending_video_share', JSON.stringify(shareData));

      // Redirect to dashcam attachment page
      window.location.href = '/attach-dashcam.html?source=share';

    } catch (error) {
      console.error('❌ Error processing shared video:', error);
      alert('Failed to process shared video. Please try again.');
    }
  }

  /**
   * Read shared video file from content URI (Android)
   */
  async function readSharedVideoFile(contentUri) {
    try {
      const { Filesystem } = Capacitor.Plugins;

      // Read the file from the content URI
      const result = await Filesystem.readFile({
        path: contentUri
      });

      // Convert base64 to Blob
      const blob = base64ToBlob(result.data, 'video/mp4');

      // Create File object
      const fileName = extractFileNameFromUri(contentUri) || 'dashcam_video.mp4';
      const file = new File([blob], fileName, { type: 'video/mp4' });

      return file;

    } catch (error) {
      console.error('❌ Error reading shared file:', error);
      throw error;
    }
  }

  /**
   * Convert base64 string to Blob
   */
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
  }

  /**
   * Extract file name from content URI
   */
  function extractFileNameFromUri(uri) {
    try {
      const segments = uri.split('/');
      const lastSegment = segments[segments.length - 1];

      // Remove query parameters if present
      return lastSegment.split('?')[0];
    } catch (error) {
      return null;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleSharedContent);
  } else {
    handleSharedContent();
  }

})();
