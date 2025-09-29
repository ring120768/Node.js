// public/dashcamUploader.js

class DashcamUploader {
    constructor(options) {
        this.userId = options.userId;
        this.incidentId = options.incidentId;
        this.onProgress = options.onProgress || (() => {});
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});
        this.maxFileSize = 500 * 1024 * 1024; // 500MB max
        this.allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    }

    async uploadVideo(file) {
        try {
            // Validate file
            if (!this.validateFile(file)) {
                throw new Error('Invalid file type or size. Max 500MB, supported formats: MP4, WebM, MOV, AVI');
            }

            // Create FormData
            const formData = new FormData();
            formData.append('video', file);
            formData.append('userId', this.userId);
            formData.append('incidentId', this.incidentId);
            formData.append('timestamp', new Date().toISOString());

            // Upload with progress tracking
            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        this.onProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            this.onSuccess(response);
                            resolve(response);
                        } catch (error) {
                            this.onError(new Error('Invalid server response'));
                            reject(error);
                        }
                    } else {
                        const error = new Error(`Upload failed: ${xhr.statusText}`);
                        this.onError(error);
                        reject(error);
                    }
                });

                xhr.addEventListener('error', () => {
                    const error = new Error('Network error during upload');
                    this.onError(error);
                    reject(error);
                });

                xhr.addEventListener('abort', () => {
                    const error = new Error('Upload cancelled');
                    this.onError(error);
                    reject(error);
                });

                xhr.open('POST', '/api/upload-dashcam');
                xhr.send(formData);
            });
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            console.error('File too large:', file.size);
            return false;
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            console.error('Invalid file type:', file.type);
            return false;
        }

        return true;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Make it available globally
window.DashcamUploader = DashcamUploader;