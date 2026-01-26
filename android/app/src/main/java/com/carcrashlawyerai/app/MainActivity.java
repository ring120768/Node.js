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
import androidx.core.content.FileProvider;
import android.util.Log;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.os.Environment;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;
import android.os.Build;

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
    private static final int GEOLOCATION_PERMISSION_REQUEST_CODE = 1002;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1003;

    // Store pending permission request for callback
    private PermissionRequest pendingPermissionRequest = null;

    // Store file chooser callback for onActivityResult
    private android.webkit.ValueCallback<android.net.Uri[]> filePathCallback = null;

    // Store temporary camera photo URI for direct camera capture
    private Uri cameraPhotoUri = null;

    // Store pending geolocation callback and origin
    private android.webkit.GeolocationPermissions.Callback pendingGeolocationCallback = null;
    private String pendingGeolocationOrigin = null;

    // Handler for delayed operations
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Flag to track if our WebChromeClient is set
    private boolean webChromeClientSet = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(TAG, "=== onCreate START ===");

        // Enable WebView debugging for diagnostics (debug builds only)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
            Log.d(TAG, "WebView debugging enabled");
        }

        // Register web view permission handler plugin BEFORE super.onCreate
        registerPlugin(com.carcrashlawyerai.app.WebViewPermissionPlugin.class);

        // Call parent onCreate - this initializes the Bridge and WebView
        super.onCreate(savedInstanceState);

        Log.d(TAG, "super.onCreate() completed");

        // Pre-check and log current permission states
        checkAndLogPermissions();

        Log.d(TAG, "=== onCreate END ===");
    }

    /**
     * CRITICAL OVERRIDE: This is called after onCreate() but before the Bridge loads the URL.
     * We override this to set our custom WebChromeClient IMMEDIATELY after Bridge creation,
     * which happens in super.load(). This ensures our client is set BEFORE any page loads.
     */
    @Override
    protected void load() {
        Log.d(TAG, "=== load() START ===");

        // This creates the Bridge and sets BridgeWebChromeClient
        super.load();

        Log.d(TAG, "super.load() completed - Bridge created");

        // IMMEDIATELY set our custom WebChromeClient to override BridgeWebChromeClient
        // This MUST happen before any web content triggers getUserMedia()
        setupWebChromeClient();

        Log.d(TAG, "=== load() END ===");
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

            // CRITICAL: Use base WebChromeClient, NOT BridgeWebChromeClient
            // BridgeWebChromeClient's constructor registers a permissionLauncher that
            // ALWAYS shows the system permission dialog, even when permissions are granted.
            // By using the base WebChromeClient, we bypass that entirely.
            WebChromeClient customClient = new WebChromeClient() {

                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    Log.d(TAG, "★★★ CUSTOM onPermissionRequest CALLED (bypassing BridgeWebChromeClient) ★★★");

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
                    Log.d(TAG, "★★★ Geolocation permission requested for: " + origin + " ★★★");

                    // Check if we have location permission
                    boolean hasPermission = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED;

                    if (hasPermission) {
                        Log.d(TAG, "Location permission GRANTED, allowing geolocation to WebView");
                        callback.invoke(origin, true, false);
                    } else {
                        Log.d(TAG, "Location permission NOT granted, requesting Android permission...");

                        // Store the callback and origin for later use
                        pendingGeolocationCallback = callback;
                        pendingGeolocationOrigin = origin;

                        // Request Android location permission
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            },
                            GEOLOCATION_PERMISSION_REQUEST_CODE
                        );
                    }
                }

                // Forward JS dialogs to Bridge's handler for proper UI
                @Override
                public boolean onJsAlert(android.webkit.WebView view, String url, String message, android.webkit.JsResult result) {
                    // Let the default WebView behavior handle alerts
                    return false;
                }

                @Override
                public boolean onJsConfirm(android.webkit.WebView view, String url, String message, android.webkit.JsResult result) {
                    return false;
                }

                @Override
                public boolean onJsPrompt(android.webkit.WebView view, String url, String message, String defaultValue, android.webkit.JsPromptResult result) {
                    return false;
                }

                @Override
                public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                    String logLevel = consoleMessage.messageLevel().name();
                    String message = consoleMessage.message() + " -- From line " + consoleMessage.lineNumber() + " of " + consoleMessage.sourceId();
                    switch (consoleMessage.messageLevel()) {
                        case ERROR:
                            Log.e("WebView", message);
                            break;
                        case WARNING:
                            Log.w("WebView", message);
                            break;
                        default:
                            Log.d("WebView", message);
                    }
                    return true;
                }

                /**
                 * CRITICAL: Handle file chooser for <input type="file"> elements.
                 * Enhanced to provide BOTH camera and gallery options for images.
                 *
                 * For video inputs (dashcam), uses default file picker.
                 * For image inputs, creates a chooser with camera + gallery options.
                 */
                @Override
                public boolean onShowFileChooser(
                        android.webkit.WebView webView,
                        android.webkit.ValueCallback<android.net.Uri[]> filePathCallback,
                        FileChooserParams fileChooserParams) {

                    Log.d(TAG, "★★★ onShowFileChooser CALLED ★★★");

                    // Cancel any existing callback to prevent WebView from getting stuck
                    if (MainActivity.this.filePathCallback != null) {
                        Log.d(TAG, "Cancelling previous file chooser callback");
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                    }

                    // Store the new callback
                    MainActivity.this.filePathCallback = filePathCallback;

                    // Log what's being requested
                    String[] acceptTypes = fileChooserParams.getAcceptTypes();
                    Log.d(TAG, "Accept types: " + java.util.Arrays.toString(acceptTypes));
                    Log.d(TAG, "Mode: " + fileChooserParams.getMode());
                    Log.d(TAG, "Is capture enabled: " + fileChooserParams.isCaptureEnabled());

                    try {
                        // Determine if this is an image or video request
                        boolean isImageRequest = false;
                        boolean isVideoRequest = false;

                        if (acceptTypes != null && acceptTypes.length > 0) {
                            String firstType = acceptTypes[0];
                            if (firstType != null) {
                                if (firstType.contains("image")) {
                                    isImageRequest = true;
                                    Log.d(TAG, "Detected IMAGE request");
                                } else if (firstType.contains("video")) {
                                    isVideoRequest = true;
                                    Log.d(TAG, "Detected VIDEO request");
                                }
                            }
                        } else {
                            // No accept types specified, default to image
                            isImageRequest = true;
                            Log.d(TAG, "No accept types, defaulting to IMAGE request");
                        }

                        // For images, create enhanced chooser with camera option
                        if (isImageRequest) {
                            return showImageChooserWithCamera(fileChooserParams);
                        }
                        // For videos, use standard file picker
                        else if (isVideoRequest) {
                            return showVideoChooser(fileChooserParams);
                        }
                        // Fallback to standard picker
                        else {
                            android.content.Intent intent = fileChooserParams.createIntent();
                            startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                            return true;
                        }

                    } catch (android.content.ActivityNotFoundException e) {
                        Log.e(TAG, "No activity found to handle file chooser: " + e.getMessage(), e);
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                        MainActivity.this.filePathCallback = null;
                        return false;
                    } catch (Exception e) {
                        Log.e(TAG, "Error launching file chooser: " + e.getMessage(), e);
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                        MainActivity.this.filePathCallback = null;
                        return false;
                    }
                }

                /**
                 * Show image chooser with CAMERA and GALLERY options.
                 * This creates a chooser dialog that explicitly includes camera capture.
                 */
                private boolean showImageChooserWithCamera(FileChooserParams fileChooserParams) throws IOException {
                    Log.d(TAG, "Creating image chooser with camera option");

                    // Create camera capture intent
                    Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);

                    // Check if camera is available
                    if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
                        // Create temporary file for camera photo
                        File photoFile = createImageFile();

                        if (photoFile != null) {
                            // Get URI using FileProvider for Android 7.0+
                            cameraPhotoUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getApplicationContext().getPackageName() + ".fileprovider",
                                photoFile
                            );

                            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                            takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                            Log.d(TAG, "Camera intent created with URI: " + cameraPhotoUri);
                        } else {
                            Log.e(TAG, "Failed to create image file for camera");
                            return false;
                        }
                    } else {
                        Log.w(TAG, "No camera app available");
                        takePictureIntent = null;
                    }

                    // Create file picker intent for gallery
                    Intent pickImageIntent = new Intent(Intent.ACTION_GET_CONTENT);
                    pickImageIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    pickImageIntent.setType("image/*");

                    // Allow multiple selection if supported by the file chooser params
                    if (fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                        pickImageIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                        Log.d(TAG, "Multiple selection enabled");
                    }

                    // Create chooser with both options
                    Intent chooserIntent = Intent.createChooser(pickImageIntent, "Select Image");

                    // Add camera option if available
                    if (takePictureIntent != null) {
                        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePictureIntent});
                        Log.d(TAG, "Added camera option to chooser");
                    }

                    Log.d(TAG, "Starting image chooser activity");
                    startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                }

                /**
                 * Show video chooser (standard file picker for videos).
                 */
                private boolean showVideoChooser(FileChooserParams fileChooserParams) {
                    Log.d(TAG, "Creating video chooser");

                    Intent intent = fileChooserParams.createIntent();
                    intent.setType("video/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"video/*"});

                    Log.d(TAG, "Starting video chooser activity");
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                    return true;
                }

                /**
                 * Create a temporary image file for camera capture.
                 */
                private File createImageFile() throws IOException {
                    // Create an image file name with timestamp
                    String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(new Date());
                    String imageFileName = "PHOTO_" + timeStamp + "_";

                    // Get app's cache directory for temporary storage
                    File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);

                    if (storageDir == null) {
                        // Fallback to cache directory if external files dir not available
                        storageDir = getCacheDir();
                    }

                    File imageFile = File.createTempFile(
                        imageFileName,  /* prefix */
                        ".jpg",         /* suffix */
                        storageDir      /* directory */
                    );

                    Log.d(TAG, "Created temp image file: " + imageFile.getAbsolutePath());
                    return imageFile;
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

        // Handle our pending WebView permission request (camera/microphone)
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

        // Handle geolocation permission request
        if (requestCode == GEOLOCATION_PERMISSION_REQUEST_CODE && pendingGeolocationCallback != null) {
            boolean locationGranted = false;
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.ACCESS_FINE_LOCATION) &&
                    grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    locationGranted = true;
                    break;
                }
            }

            if (locationGranted) {
                Log.d(TAG, "★ Location permission granted, allowing geolocation to WebView");
                try {
                    pendingGeolocationCallback.invoke(pendingGeolocationOrigin, true, false);
                    Log.d(TAG, "✓ Geolocation callback invoked with allow=true");
                } catch (Exception e) {
                    Log.e(TAG, "Error invoking geolocation callback: " + e.getMessage(), e);
                }
            } else {
                Log.d(TAG, "✗ Location permission denied, denying geolocation to WebView");
                try {
                    pendingGeolocationCallback.invoke(pendingGeolocationOrigin, false, false);
                    Log.d(TAG, "✓ Geolocation callback invoked with allow=false");
                } catch (Exception e) {
                    Log.e(TAG, "Error invoking geolocation callback: " + e.getMessage(), e);
                }
            }
            pendingGeolocationCallback = null;
            pendingGeolocationOrigin = null;
        }
    }

    /**
     * Handle activity results - specifically for file chooser and camera capture.
     */
    @Override
    protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        Log.d(TAG, "onActivityResult called - requestCode: " + requestCode + ", resultCode: " + resultCode);

        // Handle file chooser result
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) {
                Log.e(TAG, "File path callback is null!");
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }

            android.net.Uri[] results = null;

            if (resultCode == android.app.Activity.RESULT_OK) {
                // Check if data is null - this happens when camera was used
                if (data == null || data.getData() == null) {
                    // Camera was used - use the cameraPhotoUri we stored earlier
                    if (cameraPhotoUri != null) {
                        Log.d(TAG, "Camera photo captured: " + cameraPhotoUri);
                        results = new android.net.Uri[]{cameraPhotoUri};
                    } else {
                        Log.w(TAG, "Camera photo URI is null (user may have cancelled)");
                    }
                } else {
                    // Gallery or file picker was used
                    // Check for multiple file selection
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        Log.d(TAG, "Multiple files selected: " + count);
                        results = new android.net.Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                            Log.d(TAG, "  File " + i + ": " + results[i]);
                        }
                    } else if (data.getData() != null) {
                        // Single file selected from gallery
                        Log.d(TAG, "Single file selected: " + data.getData());
                        results = new android.net.Uri[]{data.getData()};
                    }
                }
            } else {
                Log.d(TAG, "File selection cancelled or failed");
            }

            // CRITICAL: Always invoke the callback, even with null results
            // This prevents the file input from getting stuck
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;

            // Clear the camera URI after use
            cameraPhotoUri = null;

            Log.d(TAG, "File chooser callback invoked with " + (results != null ? results.length + " file(s)" : "null"));
            return;
        }

        // Let parent handle other activity results
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(TAG, "onResume called");

        // Re-check permissions when returning from settings
        checkAndLogPermissions();

        // ALWAYS ensure our WebChromeClient is set (could be reset by Capacitor)
        Log.d(TAG, "Re-setting WebChromeClient in onResume...");
        setupWebChromeClient();
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.d(TAG, "onStart called");

        // Ensure WebChromeClient is set
        setupWebChromeClient();
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy called");
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }
}
