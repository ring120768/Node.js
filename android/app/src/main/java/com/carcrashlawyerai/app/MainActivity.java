package com.carcrashlawyerai.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity with robust WebView permission handling for microphone, camera, and location.
 *
 * CRITICAL FIX: This implementation ensures the WebChromeClient is set multiple times
 * during the Activity lifecycle to guarantee permission bridging works correctly.
 *
 * The key issue is that WebView's onPermissionRequest() must be handled to bridge
 * JavaScript getUserMedia() calls to Android's native permission system.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "CarCrashLawyerAI";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    // Store pending permission request for callback
    private PermissionRequest pendingPermissionRequest = null;

    // Handler for delayed operations
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Flag to track if our WebChromeClient is set
    private boolean webChromeClientSet = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "=== onCreate START ===");

        // Register web view permission handler plugin BEFORE super.onCreate
        registerPlugin(com.carcrashlawyerai.app.WebViewPermissionPlugin.class);

        // Call parent onCreate - this initializes the Bridge and WebView
        super.onCreate(savedInstanceState);

        Log.d(TAG, "super.onCreate() completed");

        // Pre-check and log current permission states
        checkAndLogPermissions();

        // Setup WebChromeClient immediately after super.onCreate
        setupWebChromeClient();

        // Also schedule a delayed setup to handle any race conditions
        // This ensures the WebChromeClient is set even if there's a timing issue
        mainHandler.postDelayed(this::setupWebChromeClient, 500);
        mainHandler.postDelayed(this::setupWebChromeClient, 1500);

        Log.d(TAG, "=== onCreate END ===");
    }

    /**
     * Configure WebChromeClient to handle WebView permission requests.
     * This is CRITICAL for getUserMedia to work - it bridges the WebView's
     * permission request to Android's permission system.
     */
    private void setupWebChromeClient() {
        Log.d(TAG, "setupWebChromeClient() called");

        try {
            // Get the Bridge
            if (getBridge() == null) {
                Log.e(TAG, "Bridge is NULL - cannot setup WebChromeClient yet");
                return;
            }

            // Get the WebView from Capacitor's bridge
            WebView webView = getBridge().getWebView();

            if (webView == null) {
                Log.e(TAG, "WebView is NULL - cannot setup WebChromeClient");
                return;
            }

            Log.d(TAG, "Got WebView, setting custom WebChromeClient");

            // Create our custom WebChromeClient that extends Capacitor's
            WebChromeClient customClient = new com.getcapacitor.BridgeWebChromeClient(getBridge()) {

                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    Log.d(TAG, "★★★ onPermissionRequest CALLED ★★★");

                    String[] resources = request.getResources();
                    Log.d(TAG, "Requested resources count: " + resources.length);

                    for (String resource : resources) {
                        Log.d(TAG, "  - Resource: " + resource);
                    }

                    // Handle on UI thread
                    runOnUiThread(() -> {
                        handlePermissionRequest(request);
                    });
                }

                @Override
                public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                    Log.d(TAG, "Geolocation permission requested for: " + origin);

                    // Check if we have location permission
                    boolean hasPermission = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED;

                    if (hasPermission) {
                        Log.d(TAG, "Location permission granted, allowing geolocation");
                        callback.invoke(origin, true, false);
                    } else {
                        Log.d(TAG, "Location permission not granted, requesting...");
                        // For geolocation, just invoke with true - Android will prompt if needed
                        callback.invoke(origin, true, false);
                    }
                }
            };

            webView.setWebChromeClient(customClient);
            webChromeClientSet = true;
            Log.d(TAG, "✓ Custom WebChromeClient SET SUCCESSFULLY");

        } catch (Exception e) {
            Log.e(TAG, "Error setting up WebChromeClient: " + e.getMessage(), e);
        }
    }

    /**
     * Handle WebView permission requests by checking Android permissions.
     * If Android has granted the permission, IMMEDIATELY grant it to WebView.
     * This is the key fix - we don't re-request permissions that are already granted.
     */
    private void handlePermissionRequest(PermissionRequest request) {
        Log.d(TAG, "handlePermissionRequest() called");

        String[] resources = request.getResources();

        // Track which permissions we need to check
        boolean needsAudio = false;
        boolean needsVideo = false;
        boolean needsLocation = false;

        // Identify what's being requested
        for (String resource : resources) {
            Log.d(TAG, "Processing resource: " + resource);

            if (resource.equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                needsAudio = true;
                Log.d(TAG, "  -> Audio capture requested");
            } else if (resource.equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                needsVideo = true;
                Log.d(TAG, "  -> Video capture requested");
            } else if (resource.equals("android.webkit.resource.GEOLOCATION")) {
                needsLocation = true;
                Log.d(TAG, "  -> Geolocation requested");
            } else {
                Log.d(TAG, "  -> Unknown resource (will try to grant anyway)");
            }
        }

        // Check current permission states
        boolean hasAudioPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasVideoPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasLocationPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;

        Log.d(TAG, "Current Android permission states:");
        Log.d(TAG, "  Audio: " + hasAudioPermission + " (needed: " + needsAudio + ")");
        Log.d(TAG, "  Video: " + hasVideoPermission + " (needed: " + needsVideo + ")");
        Log.d(TAG, "  Location: " + hasLocationPermission + " (needed: " + needsLocation + ")");

        // Determine if we can grant immediately or need to request
        boolean canGrantNow = true;
        java.util.List<String> permissionsToRequest = new java.util.ArrayList<>();

        if (needsAudio && !hasAudioPermission) {
            canGrantNow = false;
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO);
        }
        if (needsVideo && !hasVideoPermission) {
            canGrantNow = false;
            permissionsToRequest.add(Manifest.permission.CAMERA);
        }
        if (needsLocation && !hasLocationPermission) {
            canGrantNow = false;
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }

        if (canGrantNow) {
            // All needed permissions are already granted - grant to WebView immediately!
            Log.d(TAG, "★★★ ALL PERMISSIONS ALREADY GRANTED - Granting to WebView ★★★");
            try {
                request.grant(resources);
                Log.d(TAG, "✓ request.grant() called successfully");
            } catch (Exception e) {
                Log.e(TAG, "Error calling request.grant(): " + e.getMessage(), e);
            }
        } else {
            // Need to request some permissions
            Log.d(TAG, "Need to request permissions: " + permissionsToRequest);

            // Store the request for the callback
            pendingPermissionRequest = request;

            // Request the missing permissions
            String[] permArray = permissionsToRequest.toArray(new String[0]);
            ActivityCompat.requestPermissions(this, permArray, PERMISSION_REQUEST_CODE);
        }
    }

    private void checkAndLogPermissions() {
        boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;

        Log.d(TAG, "=== Permission States ===");
        Log.d(TAG, "  Microphone: " + (hasMic ? "GRANTED" : "DENIED"));
        Log.d(TAG, "  Camera: " + (hasCamera ? "GRANTED" : "DENIED"));
        Log.d(TAG, "  Location: " + (hasLocation ? "GRANTED" : "DENIED"));
        Log.d(TAG, "========================");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        Log.d(TAG, "onRequestPermissionsResult called, requestCode: " + requestCode);

        // Let Capacitor handle its permissions first
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        // Log all results
        for (int i = 0; i < permissions.length; i++) {
            boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "  Permission: " + permissions[i] + " = " + (granted ? "GRANTED" : "DENIED"));
        }

        // Handle our pending WebView permission request
        if (requestCode == PERMISSION_REQUEST_CODE && pendingPermissionRequest != null) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.d(TAG, "★ Android permissions granted, now granting to WebView");
                try {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    Log.d(TAG, "✓ WebView permission granted");
                } catch (Exception e) {
                    Log.e(TAG, "Error granting WebView permission: " + e.getMessage(), e);
                }
            } else {
                Log.d(TAG, "✗ Some permissions denied, denying WebView request");
                try {
                    pendingPermissionRequest.deny();
                } catch (Exception e) {
                    Log.e(TAG, "Error denying WebView permission: " + e.getMessage(), e);
                }
            }
            pendingPermissionRequest = null;
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "onResume called");

        // Re-check permissions when returning from settings
        checkAndLogPermissions();

        // Ensure our WebChromeClient is still set (could be reset by Capacitor)
        if (!webChromeClientSet) {
            Log.d(TAG, "WebChromeClient not set in onResume, setting now...");
            setupWebChromeClient();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d(TAG, "onStart called");

        // Additional opportunity to ensure WebChromeClient is set
        mainHandler.postDelayed(this::setupWebChromeClient, 100);
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy called");
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
