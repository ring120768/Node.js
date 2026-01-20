package com.carcrashlawyerai.app;

import android.os.Bundle;
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
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.Permission;

/**
 * MainActivity with WebView permission handling for microphone, camera, and location.
 *
 * Key fix: Implements WebChromeClient.onPermissionRequest() to bridge WebView
 * permission requests (getUserMedia) to Android's native permission system.
 * Without this, getUserMedia fails even when Android permissions are granted.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "CarCrashLawyerAI";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    // Store pending permission request for callback
    private PermissionRequest pendingPermissionRequest = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register web view permission handler BEFORE super.onCreate
        registerPlugin(com.carcrashlawyerai.app.WebViewPermissionPlugin.class);
        super.onCreate(savedInstanceState);

        Log.d(TAG, "MainActivity created - Capacitor bridge initialized");

        // Pre-check and log current permission states
        checkAndLogPermissions();

        // Setup WebChromeClient to handle getUserMedia permission requests
        setupWebChromeClient();
    }

    /**
     * Configure WebChromeClient to handle WebView permission requests.
     * This is CRITICAL for getUserMedia to work - it bridges the WebView's
     * permission request to Android's permission system.
     *
     * Uses Capacitor's BridgeWebChromeClient as base to preserve all Capacitor functionality.
     */
    private void setupWebChromeClient() {
        try {
            // Get the WebView from Capacitor's bridge
            WebView webView = getBridge().getWebView();

            if (webView != null) {
                // Use Capacitor's BridgeWebChromeClient as the base, then override onPermissionRequest
                webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        Log.d(TAG, "WebView permission request received");

                        String[] resources = request.getResources();
                        for (String resource : resources) {
                            Log.d(TAG, "Requested resource: " + resource);
                        }

                        // Run on UI thread
                        runOnUiThread(() -> {
                            handlePermissionRequest(request);
                        });
                    }

                    @Override
                    public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                        // Auto-grant geolocation to our app origin
                        Log.d(TAG, "Geolocation permission requested for: " + origin);
                        callback.invoke(origin, true, false);
                    }
                });
                Log.d(TAG, "WebChromeClient configured for permission handling (extends BridgeWebChromeClient)");
            } else {
                Log.w(TAG, "WebView is null, cannot setup WebChromeClient");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting up WebChromeClient: " + e.getMessage());
        }
    }

    /**
     * Handle WebView permission requests by checking Android permissions.
     * If Android has granted the permission, automatically grant it to WebView.
     * If not, request the Android permission first.
     */
    private void handlePermissionRequest(PermissionRequest request) {
        String[] resources = request.getResources();
        boolean allGranted = true;

        for (String resource : resources) {
            String androidPermission = mapWebViewResourceToAndroidPermission(resource);

            if (androidPermission != null) {
                boolean hasPermission = ContextCompat.checkSelfPermission(this, androidPermission)
                    == PackageManager.PERMISSION_GRANTED;

                Log.d(TAG, "Checking " + resource + " -> " + androidPermission + " = " + hasPermission);

                if (!hasPermission) {
                    allGranted = false;

                    // Store request and ask for Android permission
                    pendingPermissionRequest = request;
                    ActivityCompat.requestPermissions(this,
                        new String[]{androidPermission},
                        PERMISSION_REQUEST_CODE);
                    return;
                }
            }
        }

        // All permissions granted - grant to WebView
        if (allGranted) {
            Log.d(TAG, "All Android permissions granted, granting to WebView");
            request.grant(resources);
        } else {
            Log.d(TAG, "Some permissions denied, denying WebView request");
            request.deny();
        }
    }

    /**
     * Maps WebView permission resources to Android permission strings.
     */
    private String mapWebViewResourceToAndroidPermission(String resource) {
        switch (resource) {
            case PermissionRequest.RESOURCE_AUDIO_CAPTURE:
                return Manifest.permission.RECORD_AUDIO;
            case PermissionRequest.RESOURCE_VIDEO_CAPTURE:
                return Manifest.permission.CAMERA;
            case "android.webkit.resource.GEOLOCATION":
                return Manifest.permission.ACCESS_FINE_LOCATION;
            default:
                Log.w(TAG, "Unknown WebView resource: " + resource);
                return null;
        }
    }

    private void checkAndLogPermissions() {
        boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED;
        boolean hasLocation = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;

        Log.d(TAG, "Permission states - Mic: " + hasMic + ", Camera: " + hasCamera + ", Location: " + hasLocation);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        // Log results for debugging
        for (int i = 0; i < permissions.length; i++) {
            boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Permission result: " + permissions[i] + " = " + (granted ? "GRANTED" : "DENIED"));
        }

        // Handle pending WebView permission request
        if (requestCode == PERMISSION_REQUEST_CODE && pendingPermissionRequest != null) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.d(TAG, "Android permission granted, granting to WebView");
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
            } else {
                Log.d(TAG, "Android permission denied, denying WebView request");
                pendingPermissionRequest.deny();
            }
            pendingPermissionRequest = null;
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-check permissions when returning from settings
        checkAndLogPermissions();
    }
}
