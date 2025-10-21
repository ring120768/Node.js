/**
 * Dashboard - User Incident Reports Viewer
 * Fetches and displays GDPR-protected incident reports with media files
 */

// State
let allReports = [];
let filteredReports = [];
let currentUser = null;

// DOM Elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const reportsGrid = document.getElementById('reportsGrid');
const detailModal = document.getElementById('detailModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');

// Filters
const statusFilter = document.getElementById('statusFilter');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('🚗 Dashboard initializing...');

    // Check authentication
    try {
        const authResponse = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const authData = await authResponse.json();

        if (!authData.authenticated) {
            console.log('❌ User not authenticated, redirecting to login');
            window.location.href = '/login.html?redirect=dashboard.html';
            return;
        }

        currentUser = authData.user;
        console.log('✅ User authenticated:', currentUser.email);

        // Load reports
        await loadReports();

    } catch (error) {
        console.error('❌ Authentication check failed:', error);
        window.location.href = '/login.html?redirect=dashboard.html';
    }

    // Set up event listeners
    applyFilters.addEventListener('click', applyFiltersHandler);
    clearFilters.addEventListener('click', clearFiltersHandler);
    closeModal.addEventListener('click', closeDetailModal);

    // Close modal when clicking outside
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            closeDetailModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailModal.classList.contains('show')) {
            closeDetailModal();
        }
    });
}

/**
 * Load incident reports for the current user
 */
async function loadReports() {
    console.log('📋 Loading reports...');
    showLoading();

    try {
        const response = await fetch('/api/dashboard/reports', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allReports = data.reports || [];
        filteredReports = allReports;

        console.log(`✅ Loaded ${allReports.length} reports`);

        if (allReports.length === 0) {
            showEmpty();
        } else {
            displayReports(filteredReports);
        }

    } catch (error) {
        console.error('❌ Failed to load reports:', error);
        showError(error.message);
    }
}

/**
 * Display reports in grid
 */
function displayReports(reports) {
    hideAllStates();
    reportsGrid.style.display = 'grid';

    if (reports.length === 0) {
        reportsGrid.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 64px;">🔍</div>
                <h2>No Reports Found</h2>
                <p>No reports match your filters. Try adjusting your search.</p>
            </div>
        `;
        return;
    }

    reportsGrid.innerHTML = reports.map(report => createReportCard(report)).join('');
}

/**
 * Create a report card HTML
 */
function createReportCard(report) {
    const date = formatDate(report.created_at);
    const location = report.what3words || report.incident_location || 'Location not available';
    const description = report.brief_description || report.incident_description || 'No description provided';
    const status = report.status || (report.pdf_generated ? 'complete' : 'pending');

    return `
        <div class="report-card" onclick="viewReportDetails('${report.id}')">
            <div class="report-date">📅 ${date}</div>
            <div class="report-location">/// ${location}</div>
            <div class="report-description">${escapeHtml(description)}</div>
            <div class="report-footer">
                <span class="status-badge status-${status}">${status}</span>
                <button class="btn-view" onclick="event.stopPropagation(); viewReportDetails('${report.id}')">
                    View Details →
                </button>
            </div>
        </div>
    `;
}

/**
 * View detailed report in modal
 */
async function viewReportDetails(reportId) {
    console.log('📖 Loading report details:', reportId);

    detailModal.classList.add('show');
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading details...</p></div>';

    try {
        const response = await fetch(`/api/dashboard/reports/${reportId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load report details');
        }

        const data = await response.json();
        displayReportDetails(data);

    } catch (error) {
        console.error('❌ Failed to load report details:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <div style="font-size: 48px;">⚠️</div>
                <h3>Unable to Load Details</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Display detailed report in modal
 */
function displayReportDetails(data) {
    const report = data.report;
    const images = data.images || [];
    const videos = data.videos || [];
    const transcription = data.transcription || null;
    const dvlaData = data.dvla || null;

    modalTitle.textContent = `Report from ${formatDate(report.created_at)}`;

    let html = '';

    // Basic Information
    html += `
        <div class="detail-section">
            <h3>📍 Incident Information</h3>
            <div class="detail-row">
                <div class="detail-label">Date & Time:</div>
                <div class="detail-value">${formatDateTime(report.created_at)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">/// ${report.what3words || report.incident_location || 'Not specified'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Description:</div>
                <div class="detail-value">${escapeHtml(report.incident_description || 'No description provided')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">
                    <span class="status-badge status-${report.status || 'pending'}">${report.status || 'pending'}</span>
                </div>
            </div>
        </div>
    `;

    // Images
    if (images.length > 0) {
        html += `
            <div class="detail-section">
                <h3>📸 Images (${images.length})</h3>
                <div class="media-grid">
                    ${images.map(img => createImageItem(img)).join('')}
                </div>
            </div>
        `;
    }

    // Dashcam Footage
    if (videos.length > 0) {
        html += `
            <div class="detail-section">
                <h3>🎥 Dashcam Footage</h3>
                ${videos.map(video => createVideoPlayer(video)).join('')}
            </div>
        `;
    }

    // Audio Transcription
    if (transcription) {
        html += `
            <div class="detail-section">
                <h3>🎤 Audio Transcription</h3>
                <div class="transcription-text">
                    ${escapeHtml(transcription.transcript_text || 'Transcription not available')}
                </div>
            </div>
        `;
    }

    // DVLA Vehicle Data
    if (dvlaData) {
        html += `
            <div class="detail-section">
                <h3>🚗 Vehicle Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Make:</div>
                    <div class="detail-value">${dvlaData.make || 'Not available'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Model:</div>
                    <div class="detail-value">${dvlaData.model || 'Not available'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Colour:</div>
                    <div class="detail-value">${dvlaData.colour || 'Not available'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Year:</div>
                    <div class="detail-value">${dvlaData.year_of_manufacture || 'Not available'}</div>
                </div>
            </div>
        `;
    }

    modalBody.innerHTML = html;

    // Add image click handlers for lightbox effect
    const imageItems = modalBody.querySelectorAll('.media-item img');
    imageItems.forEach(img => {
        img.addEventListener('click', () => openImageLightbox(img.src));
    });
}

/**
 * Create image item HTML
 */
function createImageItem(image) {
    if (!image.public_url) {
        return `<div class="media-error">Image not available</div>`;
    }

    return `
        <div class="media-item">
            <img src="${image.public_url}"
                 alt="${image.file_name || 'Incident photo'}"
                 loading="lazy"
                 onerror="this.parentElement.innerHTML='<div class=\\'media-error\\'>Failed to load image</div>'"
            />
        </div>
    `;
}

/**
 * Create video player HTML
 */
function createVideoPlayer(video) {
    if (!video.public_url) {
        return `<div class="media-error">Video not available</div>`;
    }

    return `
        <video class="video-player" controls>
            <source src="${video.public_url}" type="video/mp4">
            Your browser doesn't support video playback.
        </video>
    `;
}

/**
 * Open image in lightbox (simple implementation)
 */
function openImageLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;

    lightbox.appendChild(img);
    lightbox.addEventListener('click', () => lightbox.remove());
    document.body.appendChild(lightbox);
}

/**
 * Close detail modal
 */
function closeDetailModal() {
    detailModal.classList.remove('show');
}

/**
 * Apply filters
 */
function applyFiltersHandler() {
    console.log('🔍 Applying filters...');

    const status = statusFilter.value;
    const from = dateFrom.value;
    const to = dateTo.value;

    filteredReports = allReports.filter(report => {
        // Status filter
        if (status && report.status !== status) {
            // Handle pending vs complete
            const reportStatus = report.pdf_generated ? 'complete' : 'pending';
            if (reportStatus !== status) return false;
        }

        // Date range filter
        if (from) {
            const reportDate = new Date(report.created_at).toISOString().split('T')[0];
            if (reportDate < from) return false;
        }

        if (to) {
            const reportDate = new Date(report.created_at).toISOString().split('T')[0];
            if (reportDate > to) return false;
        }

        return true;
    });

    console.log(`✅ Filtered to ${filteredReports.length} reports`);
    displayReports(filteredReports);
}

/**
 * Clear all filters
 */
function clearFiltersHandler() {
    console.log('🧹 Clearing filters...');

    statusFilter.value = '';
    dateFrom.value = '';
    dateTo.value = '';

    filteredReports = allReports;
    displayReports(filteredReports);
}

/**
 * Format date (British DD/MM/YYYY)
 */
function formatDate(dateString) {
    if (!dateString) return 'Not available';

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Format date and time (British format)
 */
function formatDateTime(dateString) {
    if (!dateString) return 'Not available';

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} at ${hours}:${minutes}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * UI State Management
 */
function showLoading() {
    hideAllStates();
    loadingState.style.display = 'block';
}

function showEmpty() {
    hideAllStates();
    emptyState.style.display = 'block';
}

function showError(message) {
    hideAllStates();
    errorMessage.textContent = message;
    errorState.style.display = 'block';
}

function hideAllStates() {
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    reportsGrid.style.display = 'none';
}
