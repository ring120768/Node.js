# Missing Hazard Reference Image

## Issue
The file `public/images/hazard-labeled-image.png` is referenced in `incident-form-page4.html` (line 593) but does not exist on the server.

## User Statement
User stated: "I have uploaded an image I'd like added to Special Road Conditions & Hazards which is in public/images/hazard-labeled-image.png"

## Investigation Results
- Searched entire project: No files with "hazard" in filename
- Checked recent uploads (last 7 days): No hazard-labeled-image.png
- Checked all images directory: File not present

## Temporary Solution Implemented
Added graceful fallback in `incident-form-page4.html` (lines 596-601):
- Image has `onerror` handler that hides broken image
- Shows yellow placeholder box with text list of common hazards
- User experience: If image loads, they see it; if not, they see helpful text

## Required Action
**To fix:** Upload the hazard reference image to this exact path:
```
/Users/ianring/Node.js/public/images/hazard-labeled-image.png
```

The HTML code is correct and ready - it will automatically display the image once the file is uploaded to the correct location.

## File Must Be Named Exactly
- ✅ `hazard-labeled-image.png`
- ❌ `hazard-labeled-image.PNG` (wrong case)
- ❌ `hazard-labeled-image.jpg` (wrong extension)
- ❌ `hazard labeled image.png` (spaces not allowed)

## How to Verify
After uploading, run:
```bash
ls -lh /Users/ianring/Node.js/public/images/hazard-labeled-image.png
```

Should show file details (size, date, etc.) instead of "No such file or directory"
