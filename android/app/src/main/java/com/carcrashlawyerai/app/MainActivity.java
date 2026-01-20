package com.carcrashlawyerai.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
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
 * Capacitor's BridgeActivity already handles most WebView setup. We override
 * onRequestPermissionsResult to ensure proper bridging to the WebView layer.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "CarCrashLawyerAI";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register web view permission handler BEFORE super.onCreate
        registerPlugin(com.carcrashlawyerai.app.WebViewPermissionPlugin.class);
        super.onCreate(savedInstanceState);

        Log.d(TAG, "MainActivity created - Capacitor bridge initialized");

        // Pre-check and log current permission states
        checkAndLogPermissions();
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
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-check permissions when returning from settings
        checkAndLogPermissions();
    }
}
