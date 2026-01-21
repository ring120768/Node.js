# Android Permissions: Microphone & Dashcam Media (WebView / RN / Expo)

This document collects practical patterns for fixing **microphone** and **dashcam video** access in an Android APK that wraps a web app (WebView / React Native / Expo / Capacitor).

---

## 0. Scenario & Goals

- Web app:
  - Uses `navigator.mediaDevices.getUserMedia({ audio: true })` for recording and Whisper transcription.
  - Lets users upload **dashcam footage** (e.g. via `<input type="file" accept="video/*">` or a JS picker).
  - Works in normal browsers (iOS Safari/Chrome, desktop, Android Chrome).
- Android APK shell:
  - Wraps the web app using:
    - Native `WebView`, or
    - React Native / Expo / Capacitor WebView.
  - Issues seen:
    - Mic works in browser but **fails in APK** even though Android Settings show mic is allowed.
    - After adjusting permissions for mic/storage, **dashcam video selection** from gallery or dashcam app becomes unreliable or empty.

**Goal:** Make microphone and dashcam media access work reliably inside the APK, without over‑requesting permissions or breaking scoped storage rules.

---

## 1. Android Basics: Mic & Media Permissions

### 1.1 Microphone

- App needs:
  - Manifest: `RECORD_AUDIO` (and often `MODIFY_AUDIO_SETTINGS`).
  - Runtime permission request for `RECORD_AUDIO` (Android 6+).
  - WebView: `WebChromeClient.onPermissionRequest` must grant mic requests for WebRTC / `getUserMedia`.

Even if Android Settings show mic is allowed, the WebView can still deny it unless `onPermissionRequest` grants the request.

### 1.2 Media & Storage (Dashcam Footage)

- Scoped storage:
  - App‑specific dirs are unrestricted; everything else is controlled.
- Shared media:
  - Photos/images → `MediaStore.Images.*`.
  - Videos (incl. dashcam clips saved to DCIM/Movies) → `MediaStore.Video.*`.
- Modern permissions (Android 13+):
  - `READ_MEDIA_IMAGES`
  - `READ_MEDIA_VIDEO`
  - `READ_MEDIA_AUDIO`
- File selection patterns:
  - Preferred: **system pickers** (`<input type="file">`, SAF, photo picker) which grant temporary URI access for the selected video and often do **not** require broad storage permissions.

---

## 2. Native Android WebView: Mic + Dashcam Setup

Use this section if your APK is a **plain native Android** shell with a `WebView`.

### 2.1 Manifest Snippet

```xml
<manifest ...>
    <!-- Network -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Microphone -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <!-- Media (optional, see notes below) -->
    <!-- For direct MediaStore/legacy external storage access: -->
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <!-- For older devices (pre‑Android 13): -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

    <!-- Optional hardware declarations -->
    <uses-feature
        android:name="android.hardware.microphone"
        android:required="false" />

    <application ...>
        <!-- activities -->
    </application>
</manifest>
```

Notes:

- If the web app only uses `<input type="file">` and you rely on the system picker, you may not strictly need `READ_MEDIA_VIDEO`, because the picker grants temporary read access to selected videos.
- Keep these media permissions only if you query `MediaStore.Video` or do low‑level file access yourself.

### 2.2 WebView Setup – Mic + File Picker (Java)

This example:

- Enables JS and DOM storage.
- Handles:
  - Runtime mic permission.
  - WebRTC mic permission via `onPermissionRequest`.
  - `<input type="file" accept="video/*">` via `onShowFileChooser`.

```java
public class MainActivity extends AppCompatActivity {

    private static final int REQ_CODE_RECORD_AUDIO = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2001;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        WebView.setWebContentsDebuggingEnabled(true);

        webView.setWebViewClient(new WebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    // Mic / camera for getUserMedia
                    request.grant(request.getResources());
                });
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                // Ensure we show videos (dashcam clips)
                intent.setType("video/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"video/*"});

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (ActivityNotFoundException e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        ensureMicPermissionAndLoad();
    }

    private void ensureMicPermissionAndLoad() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {

            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.RECORD_AUDIO},
                    REQ_CODE_RECORD_AUDIO
            );
        } else {
            loadWebApp();
        }
    }

    private void loadWebApp() {
        // Use https or localhost‑equivalent so getUserMedia works
        webView.loadUrl("https://your-production-domain.example");
        // e.g. http://10.0.2.2:3000 for emulator; must be a secure context.
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CODE_RECORD_AUDIO) {
            if (grantResults.length > 0 &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                loadWebApp();
            } else {
                // Handle denied mic permission
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                Uri uri = data.getData();
                if (uri != null) {
                    results = new Uri[]{uri};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }
}
```

---

## 3. React Native / Expo WebView: Mic + Dashcam

Use this section if you ship the APK using React Native / Expo and `react-native-webview`.

### 3.1 Expo / RN Manifest Config

Example `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "INTERNET",
        "RECORD_AUDIO",
        "READ_MEDIA_VIDEO",
        "READ_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

Notes:

- You may later remove `READ_MEDIA_VIDEO` / `READ_EXTERNAL_STORAGE` if you rely only on system pickers and `<input type="file">`, to stay compliant with Google's photo/video policy.
- Keep `RECORD_AUDIO` for mic recording.

### 3.2 Request Mic Permission from JS

```tsx
import React, { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { WebView } from "react-native-webview";

const App = () => {
  const requestMicPermission = async () => {
    if (Platform.OS !== "android") return;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone permission",
        message: "This app needs access to your microphone for transcription.",
        buttonPositive: "OK"
      }
    );
    // Optional: check result
  };

  useEffect(() => {
    requestMicPermission();
  }, []);

  return (
    <WebView
      source={{ uri: "https://your-production-domain.example" }}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
    />
  );
};

export default App;
```

For dashcam video selection:

- If your web app uses `<input type="file" accept="video/*">`, you need Android native layer to handle file chooser like in the native `onShowFileChooser` example.
- Alternatively, use a native picker (e.g. Expo ImagePicker with `MediaTypeOptions.Videos`) and send the selected video URI into the WebView or upload directly.

### 3.3 Expo ImagePicker Example (Dashcam Clips)

```tsx
import * as ImagePicker from "expo-image-picker";

async function pickDashcamVideo() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    // Inform user
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsMultipleSelection: false
  });

  if (!result.canceled && result.assets.length > 0) {
    const video = result.assets[0];
    // video.uri -> upload or bridge into WebView
  }
}
```

This uses the system picker and is compatible with scoped storage and Google's partial photo/video access rules.

---

## 4. Dashcam App Storage & SAF

If dashcam footage is stored inside a dedicated dashcam app:

- Your app cannot read that app's private directories directly.
- Instead, rely on:
  - That app exporting clips to shared storage (DCIM/Movies), or
  - The app providing a document provider, which can be accessed through the Storage Access Framework (SAF).

### 4.1 SAF Example (Native)

```java
int REQUEST_OPEN_DASHCAM_VIDEO = 3001;

void openDashcamVideoPicker() {
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
    intent.addCategory(Intent.CATEGORY_OPENABLE);
    intent.setType("video/*");
    startActivityForResult(intent, REQUEST_OPEN_DASHCAM_VIDEO);
}

@Override
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == REQUEST_OPEN_DASHCAM_VIDEO && resultCode == Activity.RESULT_OK) {
        Uri uri = data.getData();
        // Persist permission if needed
        getContentResolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
        );
        // Use uri for upload / processing
    }
    super.onActivityResult(requestCode, resultCode, data);
}
```

SAF lets the user pick files from the dashcam app's provider or gallery, and your app gets a `content://` URI with read access.

---

## 5. Debugging Checklist (Mic + Dashcam)

Use this when something breaks (mic or dashcam).

### 5.1 Microphone

**Manifest**
- Check `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` are present.

**Runtime permission**
- Confirm you request `RECORD_AUDIO` and user granted it.

**WebView onPermissionRequest**
- Log when `onPermissionRequest` fires.
- Temporarily do `request.grant(request.getResources())`.

**JS error**
- In Chrome DevTools for WebView, inspect `getUserMedia` error:
  - `NotAllowedError` → permission blocked.
  - `NotReadableError` → device/driver issue (often missing audio perms).

**URL scheme**
- Ensure WebView loads `https://` or localhost equivalent so `getUserMedia` is allowed.

### 5.2 Dashcam Media

**Current symptoms**
- Picker opens but shows no videos?
- Selection returns null URI?
- Crashes or security exceptions?

**File chooser plumbing**
- For WebView:
  - Verify `onShowFileChooser` is called.
  - Verify `onActivityResult` returns a Uri.

**Media permissions**
- If you directly query `MediaStore.Video` or read external storage:
  - Ensure `READ_MEDIA_VIDEO` / `READ_EXTERNAL_STORAGE` is declared.
- If you rely only on system pickers:
  - Consider dropping broad read permissions and ensure your picker is the only access path.

**SAF tests**
- Implement an `ACTION_OPEN_DOCUMENT` picker with `video/*` and confirm:
  - Dashcam videos are visible.
  - You can read from the returned URI.

**Play Store policy sanity check**
- Align requested permissions with actual behaviour (single file selection vs bulk scanning).

---

## 6. Using This File as a Prompt

When using Claude Code or another coding assistant:

1. Paste this `.md` file.
2. Add:
   - Your stack (e.g. "Expo Managed + react-native-webview", "native Android WebView", "Capacitor").
   - Examples of mic errors (`NotAllowedError`, etc.) and dashcam issues (empty picker, security exception).
   - Relevant manifest snippets and key Android/JS files.
3. Ask for:
   - Minimal patches to:
     - Fix mic (manifest + `onPermissionRequest` + runtime permissions).
     - Fix dashcam video selection (file chooser, picker config, and storage/SAF strategy).
   - A check that requested permissions match Play Store media policies.

This file is meant to live in your repo (e.g. `docs/android-permissions-mic-dashcam.md`) and be reused each time you touch mic or dashcam flows.
