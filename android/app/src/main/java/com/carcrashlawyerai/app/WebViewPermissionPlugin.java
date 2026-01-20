package com.carcrashlawyerai.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import android.webkit.PermissionRequest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * WebViewPermissionPlugin - Handles WebView permission requests for Capacitor.
 *
 * This plugin bridges WebView permission requests (getUserMedia for camera/microphone)
 * to Android's native permission system. When the WebView requests a permission,
 * this plugin checks if Android has already granted it and responds accordingly.
 *
 * Key functionality:
 * 1. Checks current Android permission state
 * 2. Requests permissions if not yet granted
 * 3. Returns permission status to JavaScript layer
 */
@CapacitorPlugin(
    name = "WebViewPermission",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        ),
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class WebViewPermissionPlugin extends Plugin {

    private static final String TAG = "WebViewPermissionPlugin";
    private static final int PERMISSION_REQUEST_CODE = 2001;

    // Store pending call for permission callback
    private PluginCall pendingCall = null;
    private String pendingPermission = null;

    /**
     * Check if a specific permission is granted at the Android OS level.
     * Call from JavaScript: WebViewPermission.checkPermission({ permission: 'microphone' })
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        String permission = call.getString("permission", "");
        Log.d(TAG, "checkPermission called for: " + permission);

        boolean granted = false;
        String androidPermission = mapToAndroidPermission(permission);

        if (androidPermission != null) {
            granted = ContextCompat.checkSelfPermission(
                getContext(),
                androidPermission
            ) == PackageManager.PERMISSION_GRANTED;
        }

        Log.d(TAG, "Permission " + permission + " is " + (granted ? "GRANTED" : "NOT GRANTED"));

        JSObject result = new JSObject();
        result.put("permission", permission);
        result.put("granted", granted);
        result.put("state", granted ? "granted" : "prompt");
        call.resolve(result);
    }

    /**
     * Request a specific permission from Android.
     * Call from JavaScript: WebViewPermission.requestPermission({ permission: 'microphone' })
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        String permission = call.getString("permission", "");
        Log.d(TAG, "requestPermission called for: " + permission);

        String androidPermission = mapToAndroidPermission(permission);

        if (androidPermission == null) {
            JSObject result = new JSObject();
            result.put("permission", permission);
            result.put("granted", false);
            result.put("error", "Unknown permission type: " + permission);
            call.resolve(result);
            return;
        }

        // Check if already granted
        if (ContextCompat.checkSelfPermission(getContext(), androidPermission)
                == PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "Permission already granted: " + permission);
            JSObject result = new JSObject();
            result.put("permission", permission);
            result.put("granted", true);
            result.put("state", "granted");
            call.resolve(result);
            return;
        }

        // Store the pending call for the callback
        pendingCall = call;
        pendingPermission = permission;

        // Request the permission using Capacitor's permission system
        if (permission.equals("microphone")) {
            requestPermissionForAlias("microphone", call, "permissionCallback");
        } else if (permission.equals("camera")) {
            requestPermissionForAlias("camera", call, "permissionCallback");
        } else if (permission.equals("location")) {
            requestPermissionForAlias("location", call, "permissionCallback");
        } else {
            // Fallback: use ActivityCompat directly
            ActivityCompat.requestPermissions(
                getActivity(),
                new String[]{ androidPermission },
                PERMISSION_REQUEST_CODE
            );
        }
    }

    /**
     * Callback when permission request completes.
     */
    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String permission = pendingPermission != null ? pendingPermission : "unknown";
        String androidPermission = mapToAndroidPermission(permission);

        boolean granted = false;
        if (androidPermission != null) {
            granted = ContextCompat.checkSelfPermission(getContext(), androidPermission)
                == PackageManager.PERMISSION_GRANTED;
        }

        Log.d(TAG, "Permission callback for " + permission + ": " + (granted ? "GRANTED" : "DENIED"));

        JSObject result = new JSObject();
        result.put("permission", permission);
        result.put("granted", granted);
        result.put("state", granted ? "granted" : "denied");

        call.resolve(result);

        // Clear pending state
        pendingCall = null;
        pendingPermission = null;
    }

    /**
     * Check all permissions at once.
     * Call from JavaScript: WebViewPermission.checkAllPermissions()
     */
    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        Log.d(TAG, "checkAllPermissions called");

        boolean hasMicrophone = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;

        boolean hasCamera = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED;

        boolean hasLocation = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        Log.d(TAG, "Permissions - Mic: " + hasMicrophone + ", Camera: " + hasCamera + ", Location: " + hasLocation);

        JSObject result = new JSObject();
        result.put("microphone", hasMicrophone ? "granted" : "prompt");
        result.put("camera", hasCamera ? "granted" : "prompt");
        result.put("location", hasLocation ? "granted" : "prompt");

        JSObject micObj = new JSObject();
        micObj.put("granted", hasMicrophone);
        micObj.put("state", hasMicrophone ? "granted" : "prompt");
        result.put("microphoneDetails", micObj);

        JSObject camObj = new JSObject();
        camObj.put("granted", hasCamera);
        camObj.put("state", hasCamera ? "granted" : "prompt");
        result.put("cameraDetails", camObj);

        JSObject locObj = new JSObject();
        locObj.put("granted", hasLocation);
        locObj.put("state", hasLocation ? "granted" : "prompt");
        result.put("locationDetails", locObj);

        call.resolve(result);
    }

    /**
     * Open the app's settings page in Android.
     * Call from JavaScript: WebViewPermission.openSettings()
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Log.d(TAG, "openSettings called");

        try {
            android.content.Intent intent = new android.content.Intent(
                android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS
            );
            intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error opening settings: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    /**
     * Maps our permission names to Android permission constants.
     */
    private String mapToAndroidPermission(String permission) {
        switch (permission.toLowerCase()) {
            case "microphone":
            case "audio":
                return Manifest.permission.RECORD_AUDIO;
            case "camera":
            case "video":
                return Manifest.permission.CAMERA;
            case "location":
            case "geolocation":
                return Manifest.permission.ACCESS_FINE_LOCATION;
            default:
                Log.w(TAG, "Unknown permission type: " + permission);
                return null;
        }
    }
}
