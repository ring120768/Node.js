# Android APK Microphone Issues for Whisper/WebView Apps

Most likely the APK's WebView (or similar shell) is not forwarding microphone permission requests correctly to the page, even though Android shows that the app itself has microphone permission. This document summarizes probable causes and concrete fixes you can apply or ask an AI assistant (e.g. Claude Code) to implement.

---

## 0. Context

- Web app:
  - Uses `navigator.mediaDevices.getUserMedia({ audio: true })` and then sends audio to OpenAI Whisper for transcription.
  - Works correctly on:
    - iOS Safari/Chrome.
    - Desktop browsers.
    - Android Chrome when loaded directly as a website.
- Native shell:
  - An Android `.apk` wraps the web app in a WebView (or React Native WebView / Expo / Capacitor / Cordova wrapper).
  - In the APK:
    - Android Settings show "Microphone: allowed while using the app".
    - The web layer fails to access mic (e.g. `getUserMedia` throws `NotAllowedError`/`PermissionDeniedError`/`NotReadableError`), or behaves as if there is no microphone.
- Goal:
  - Make microphone capture inside the APK behave the same as in the browser.

This file is intended as a **prompt + implementation guide** you can hand to Claude Code or another coding assistant.

---

## 1. Likely Root Causes

Use this list to guide debugging and code changes.

- **WebView not granting WebRTC permissions**
  - Android's WebView requires explicit handling of `WebChromeClient.onPermissionRequest`.
  - Even if the app has `RECORD_AUDIO` at OS level, the WebView will deny mic/camera unless `onPermissionRequest` calls `request.grant(...)`.

- **Missing or incomplete permissions in `AndroidManifest.xml`**
  - `RECORD_AUDIO` and sometimes `MODIFY_AUDIO_SETTINGS` must be declared.
  - Logcat may show messages such as:
    - `Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO. No audio device will be available for recording`.

- **Runtime permissions not requested or mishandled**
  - On modern Android, declaring permissions in the manifest is not enough; you must request "dangerous" permissions like mic at runtime.
  - If runtime permission is not actually granted, WebView will not be able to open the audio source.

- **URL not in a secure context**
  - `getUserMedia` generally requires:
    - `https://` origin, or
    - `http://localhost` (and some framework-specific equivalents such as `capacitor://localhost`).
  - If the WebView loads a remote `http://` URL, mic access may be blocked.

- **React Native / Expo WebView limitations**
  - Older or default `react-native-webview` implementations do not automatically forward `onPermissionRequest` from the underlying Android WebView.
  - This leads to "Error opening your camera and/or microphone: could not start audio source" even when Android permissions are granted.

- **Other lower-probability factors**
  - OEM-specific permission managers or power-saving modes.
  - WebRTC flags / hardware acceleration disabled for the WebView.
  - Conflicts with other audio APIs.

---

## 2. Native Android WebView Fix (Code)

Use this if your APK is a "plain" native Android app with a `WebView`.

### 2.1 Manifest Permissions

Ensure the following entries exist in `AndroidManifest.xml`:

```xml
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Microphone-related permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <!-- Optional: hardware feature declaration -->
    <uses-feature
        android:name="android.hardware.microphone"
        android:required="false" />

    <application ...>
        <!-- activities etc. -->
    </application>
</manifest>
```

### 2.2 WebChromeClient Permission Handling

The critical fix is implementing `onPermissionRequest` in your `WebChromeClient`:

```java
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        WebView webView = findViewById(R.id.webview);

        // Enable JavaScript
        webView.getSettings().setJavaScriptEnabled(true);

        // Enable media playback without gesture
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);

        // Set up WebChromeClient to handle permission requests
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    handlePermissionRequest(request);
                });
            }
        });

        webView.loadUrl("https://your-app-url.com");
    }

    private void handlePermissionRequest(PermissionRequest request) {
        String[] resources = request.getResources();
        boolean allGranted = true;

        for (String resource : resources) {
            String androidPermission = mapWebViewResourceToAndroidPermission(resource);

            if (androidPermission != null) {
                boolean hasPermission = ContextCompat.checkSelfPermission(this, androidPermission)
                    == PackageManager.PERMISSION_GRANTED;

                if (!hasPermission) {
                    allGranted = false;
                    pendingPermissionRequest = request;
                    ActivityCompat.requestPermissions(this,
                        new String[]{androidPermission},
                        PERMISSION_REQUEST_CODE);
                    return;
                }
            }
        }

        if (allGranted) {
            request.grant(resources);
        } else {
            request.deny();
        }
    }

    private String mapWebViewResourceToAndroidPermission(String resource) {
        switch (resource) {
            case PermissionRequest.RESOURCE_AUDIO_CAPTURE:
                return Manifest.permission.RECORD_AUDIO;
            case PermissionRequest.RESOURCE_VIDEO_CAPTURE:
                return Manifest.permission.CAMERA;
            default:
                return null;
        }
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
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
            } else {
                pendingPermissionRequest.deny();
            }
            pendingPermissionRequest = null;
        }
    }
}
```

---

## 3. Capacitor-Specific Fix

If using Capacitor (Ionic), you need to extend `BridgeWebChromeClient` to preserve Capacitor's functionality while adding permission handling.

### 3.1 MainActivity.java

```java
package com.yourapp.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "YourApp";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity created - Capacitor bridge initialized");
        setupWebChromeClient();
    }

    /**
     * CRITICAL: Extends BridgeWebChromeClient (not replaces WebChromeClient)
     * to preserve Capacitor's file chooser, JS dialogs, etc.
     */
    private void setupWebChromeClient() {
        try {
            WebView webView = getBridge().getWebView();

            if (webView != null) {
                webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onPermissionRequest(PermissionRequest request) {
                        Log.d(TAG, "WebView permission request received");

                        String[] resources = request.getResources();
                        for (String resource : resources) {
                            Log.d(TAG, "Requested resource: " + resource);
                        }

                        runOnUiThread(() -> {
                            handlePermissionRequest(request);
                        });
                    }

                    @Override
                    public void onGeolocationPermissionsShowPrompt(String origin,
                            android.webkit.GeolocationPermissions.Callback callback) {
                        Log.d(TAG, "Geolocation permission requested for: " + origin);
                        callback.invoke(origin, true, false);
                    }
                });
                Log.d(TAG, "WebChromeClient configured for permission handling");
            } else {
                Log.w(TAG, "WebView is null, cannot setup WebChromeClient");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting up WebChromeClient: " + e.getMessage());
        }
    }

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
                    pendingPermissionRequest = request;
                    ActivityCompat.requestPermissions(this,
                        new String[]{androidPermission},
                        PERMISSION_REQUEST_CODE);
                    return;
                }
            }
        }

        if (allGranted) {
            Log.d(TAG, "All Android permissions granted, granting to WebView");
            request.grant(resources);
        } else {
            Log.d(TAG, "Some permissions denied, denying WebView request");
            request.deny();
        }
    }

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

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        for (int i = 0; i < permissions.length; i++) {
            boolean granted = grantResults[i] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Permission result: " + permissions[i] + " = " + (granted ? "GRANTED" : "DENIED"));
        }

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
}
```

---

## 4. React Native WebView Fix

If using `react-native-webview`, you need to handle `onPermissionRequest` in your native Android code.

### 4.1 Create Custom WebChromeClient

Create a file at `android/app/src/main/java/com/yourapp/CustomWebChromeClient.java`:

```java
package com.yourapp;

import android.webkit.PermissionRequest;
import com.reactnativecommunity.webview.RNCWebChromeClient;
import com.reactnativecommunity.webview.RNCWebViewManager;

public class CustomWebChromeClient extends RNCWebChromeClient {

    public CustomWebChromeClient(RNCWebViewManager manager, RNCWebViewManager.RNCWebView webView) {
        super(manager, webView);
    }

    @Override
    public void onPermissionRequest(PermissionRequest request) {
        // Auto-grant mic/camera permissions to WebView if Android has granted them
        request.grant(request.getResources());
    }
}
```

### 4.2 Create Custom WebViewManager

Create a file at `android/app/src/main/java/com/yourapp/CustomWebViewManager.java`:

```java
package com.yourapp;

import com.facebook.react.uimanager.ThemedReactContext;
import com.reactnativecommunity.webview.RNCWebViewManager;

public class CustomWebViewManager extends RNCWebViewManager {

    @Override
    protected void setupWebChromeClient(ThemedReactContext reactContext,
            RNCWebViewManager.RNCWebView webView) {
        webView.setWebChromeClient(new CustomWebChromeClient(this, webView));
    }
}
```

### 4.3 Register the Package

Add to your `MainApplication.java`:

```java
import com.yourapp.CustomWebViewPackage;

@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new CustomWebViewPackage());
    return packages;
}
```

---

## 5. Debugging Checklist

Use this checklist to systematically diagnose issues:

### 5.1 Check Android Permissions

```bash
# View app permissions via ADB
adb shell dumpsys package com.yourapp | grep -A 20 "granted=true"

# Check if RECORD_AUDIO is granted
adb shell pm list permissions -g | grep RECORD_AUDIO
```

### 5.2 Check Logcat for Clues

```bash
# Filter for permission-related logs
adb logcat | grep -E "(permission|RECORD_AUDIO|getUserMedia|WebChromeClient)"

# Common error messages to look for:
# - "Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO"
# - "onPermissionRequest"
# - "NotAllowedError"
# - "PermissionDeniedError"
```

### 5.3 Verify WebView Configuration

In your Java code, ensure:
- [ ] `WebView.getSettings().setJavaScriptEnabled(true)`
- [ ] `WebView.getSettings().setMediaPlaybackRequiresUserGesture(false)`
- [ ] `WebChromeClient` is set with `onPermissionRequest` override
- [ ] `onPermissionRequest` calls `request.grant(resources)` when Android permission is granted

### 5.4 Check Secure Context

- [ ] URL is `https://` OR
- [ ] URL is `http://localhost` / `capacitor://localhost` / `file://`
- [ ] Test in Chrome DevTools: `window.isSecureContext` should return `true`

### 5.5 Test getUserMedia Directly

Add this to your web app for debugging:

```javascript
async function testMicrophone() {
    console.log('isSecureContext:', window.isSecureContext);
    console.log('mediaDevices available:', !!navigator.mediaDevices);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('SUCCESS - Got audio stream:', stream);
        console.log('Audio tracks:', stream.getAudioTracks());

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('FAILED - getUserMedia error:', error.name, error.message);
        return false;
    }
}

// Call it
testMicrophone();
```

---

## 6. Common Error Messages and Solutions

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `NotAllowedError: Permission denied` | WebView not granting permission | Implement `onPermissionRequest` in `WebChromeClient` |
| `NotReadableError: Could not start audio source` | Android permission not granted OR audio device busy | Check runtime permissions; restart device |
| `TypeError: Cannot read property 'getUserMedia' of undefined` | Not a secure context | Use HTTPS or localhost |
| `Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO` | Missing manifest permissions | Add both permissions to `AndroidManifest.xml` |
| `AbortError: Starting audio failed` | Hardware access issue | Check if another app is using the mic |

---

## 7. Quick Reference: Permission Flow

```
JavaScript calls getUserMedia({ audio: true })
    │
    ▼
WebView intercepts and calls WebChromeClient.onPermissionRequest()
    │
    ▼
Your code checks: Does Android have RECORD_AUDIO permission?
    │
    ├── NO → Call ActivityCompat.requestPermissions()
    │           │
    │           ▼
    │        User grants/denies in Android dialog
    │           │
    │           ▼
    │        onRequestPermissionsResult() callback
    │           │
    │           ▼
    │        Call request.grant() or request.deny()
    │
    └── YES → Call request.grant(resources) immediately
                │
                ▼
           WebView allows getUserMedia to succeed
                │
                ▼
           JavaScript receives MediaStream
```

---

## 8. Testing After Fix

After implementing the fix:

1. **Clean build**: `./gradlew clean assembleRelease`
2. **Uninstall old APK**: Settings → Apps → Your App → Uninstall
3. **Install new APK**: `adb install -r app-release.apk`
4. **Clear app data**: Settings → Apps → Your App → Storage → Clear Data
5. **Test microphone**: The app should now prompt for permission and work when granted

---

## 9. References

- Android WebView PermissionRequest: https://developer.android.com/reference/android/webkit/PermissionRequest
- getUserMedia constraints: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Android runtime permissions: https://developer.android.com/training/permissions/requesting
- Capacitor WebView: https://capacitorjs.com/docs/apis/webview

---

*Document created: January 2026*
*Last updated: January 2026*
*For: Car Crash Lawyer AI - Android microphone troubleshooting*
