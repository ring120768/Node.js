package com.carcrashlawyerai.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

/**
 * MainActivity with WebView permission handling for microphone, camera, and location.
 *
 * Android WebView doesn't automatically bridge JavaScript getUserMedia() requests
 * to native Android permission prompts. This class intercepts those requests and
 * shows the proper Android permission dialogs.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Get the WebView from Capacitor's bridge and set up permission handling
        WebView webView = getBridge().getWebView();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                Log.d(TAG, "WebView permission request received");

                String[] resources = request.getResources();
                boolean needsAudioPermission = false;
                boolean needsVideoPermission = false;

                for (String resource : resources) {
                    Log.d(TAG, "Requested resource: " + resource);
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        needsAudioPermission = true;
                    }
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        needsVideoPermission = true;
                    }
                }

                // Check if we already have the permissions
                boolean hasAudio = ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                boolean hasCamera = ContextCompat.checkSelfPermission(MainActivity.this,
                    Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;

                Log.d(TAG, "Has audio permission: " + hasAudio + ", Has camera permission: " + hasCamera);

                // If we have all needed permissions, grant immediately
                if ((!needsAudioPermission || hasAudio) && (!needsVideoPermission || hasCamera)) {
                    Log.d(TAG, "All permissions already granted, approving request");
                    request.grant(request.getResources());
                    return;
                }

                // Need to request permissions from user
                pendingPermissionRequest = request;

                // Build list of permissions to request
                java.util.ArrayList<String> permissionsNeeded = new java.util.ArrayList<>();
                if (needsAudioPermission && !hasAudio) {
                    permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
                }
                if (needsVideoPermission && !hasCamera) {
                    permissionsNeeded.add(Manifest.permission.CAMERA);
                }

                if (!permissionsNeeded.isEmpty()) {
                    Log.d(TAG, "Requesting Android permissions: " + permissionsNeeded);
                    ActivityCompat.requestPermissions(MainActivity.this,
                        permissionsNeeded.toArray(new String[0]),
                        PERMISSION_REQUEST_CODE);
                }
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                Log.d(TAG, "WebView permission request cancelled");
                pendingPermissionRequest = null;
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE && pendingPermissionRequest != null) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.d(TAG, "All permissions granted by user, approving WebView request");
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
            } else {
                Log.d(TAG, "Permissions denied by user");
                pendingPermissionRequest.deny();
            }

            pendingPermissionRequest = null;
        }
    }
}
