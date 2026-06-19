// State Management
let state = {
    updates: [],
    loading: false,
    filters: {
        search: '',
        category: 'ALL',
        sortBy: 'newest' // newest, oldest
    },
    activeComposerUpdate: null
};

// SVG Circle Constants for Character Counter
const RING_RADIUS = 11.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~72.25

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    syncStatusText: document.getElementById('sync-status-text'),
    searchInput: document.getElementById('search-input'),
    categoryChipsContainer: document.getElementById('category-chips'),
    sortSelect: document.getElementById('sort-select'),
    feedTimeline: document.getElementById('feed-timeline'),
    
    // Stats elements
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statAnnouncements: document.getElementById('stat-announcements'),
    statIssues: document.getElementById('stat-issues'),
    
    // Modal elements
    modalOverlay: document.getElementById('tweet-modal'),
    modalCloseBtn: document.getElementById('modal-close'),
    modalCancelBtn: document.getElementById('modal-cancel'),
    modalCopyBtn: document.getElementById('modal-copy'),
    modalTweetBtn: document.getElementById('modal-tweet'),
    composerTextarea: document.getElementById('composer-textarea'),
    composerMetaType: document.getElementById('composer-meta-type'),
    composerMetaDate: document.getElementById('composer-meta-date'),
    charRingProgress: document.getElementById('char-ring-progress'),
    charTextCount: document.getElementById('char-text-count'),
    charWarning: document.getElementById('char-warning'),
    
    // Toast
    toast: document.getElementById('copy-toast')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    fetchReleases();
});

// Initialize Theme from LocalStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

// Toggle Theme & Save Preference
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Event Listeners Registration
function initEventListeners() {
    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        if (!state.loading) {
            fetchReleases(true);
        }
    });

    // Export CSV button
    elements.exportCsvBtn.addEventListener('click', exportToCSV);

    // Theme Toggle button
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Search input (with basic debounce/input listener)
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase();
        renderFeed();
    });

    // Sort order select
    elements.sortSelect.addEventListener('change', (e) => {
        state.filters.sortBy = e.target.value;
        renderFeed();
    });

    // Modal Close handlers
    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.modalCancelBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    // Modal Action buttons
    elements.composerTextarea.addEventListener('input', updateCharCounter);
    elements.modalCopyBtn.addEventListener('click', copyTweetText);
    elements.modalTweetBtn.addEventListener('click', openTwitterIntent);
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    setLoadingState(true);
    
    try {
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            state.updates = data.updates;
            updateStats(data.updates);
            buildCategoryFilterChips();
            renderFeed();
            
            // Show toast on hard refetch completion
            if (forceRefresh) {
                showToast("Feeds refreshed from Google Cloud!", "success");
            }
        } else {
            console.error("API Error:", data.error);
            showToast("Failed to fetch release notes: " + data.error, "danger");
            renderErrorState(data.error);
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        showToast("Error communicating with backend server", "danger");
        renderErrorState(err.message);
    } finally {
        setLoadingState(false);
    }
}

// Set UI Loading State
function setLoadingState(isLoading) {
    state.loading = isLoading;
    if (isLoading) {
        elements.refreshBtn.classList.add('loading');
        elements.syncStatusText.textContent = "Updating...";
        elements.syncStatusText.previousElementSibling.classList.add('syncing');
        renderSkeletons();
    } else {
        elements.refreshBtn.classList.remove('loading');
        elements.syncStatusText.textContent = "Synced";
        elements.syncStatusText.previousElementSibling.classList.remove('syncing');
    }
}

// Render skeleton loading items
function renderSkeletons() {
    let skeletonsHTML = `
        <div class="date-group">
            <div class="date-header">
                <div class="skeleton-line" style="width: 140px; height: 24px; background: hsla(217, 30%, 15%, 0.7);"></div>
                <div class="date-line"></div>
            </div>
            <div class="updates-grid">
                ${Array(4).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton-shimmer"></div>
                        <div class="skeleton-content">
                            <div class="skeleton-badge"></div>
                            <div class="skeleton-line l1"></div>
                            <div class="skeleton-line l2"></div>
                            <div class="skeleton-line l3"></div>
                            <div class="skeleton-line l4"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    elements.feedTimeline.innerHTML = skeletonsHTML;
}

// Render Error State
function renderErrorState(message) {
    elements.feedTimeline.innerHTML = `
        <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Unable to load releases</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="fetchReleases(true)" style="margin-top: 16px;">Try Again</button>
        </div>
    `;
}

// Calculate Stats
function updateStats(updates) {
    elements.statTotal.textContent = updates.length;
    
    const features = updates.filter(u => u.type.toLowerCase() === 'feature').length;
    const announcements = updates.filter(u => u.type.toLowerCase() === 'announcement').length;
    const issues = updates.filter(u => u.type.toLowerCase() === 'issue').length;
    
    elements.statFeatures.textContent = features;
    elements.statAnnouncements.textContent = announcements;
    elements.statIssues.textContent = issues;
}

// Build Category filter chips
function buildCategoryFilterChips() {
    const types = {};
    state.updates.forEach(u => {
        const type = u.type.toUpperCase();
        types[type] = (types[type] || 0) + 1;
    });

    const activeCategory = state.filters.category;
    
    let html = `
        <div class="category-chip ${activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL">
            All Updates <span class="category-count">${state.updates.length}</span>
        </div>
    `;
    
    Object.keys(types).sort().forEach(type => {
        html += `
            <div class="category-chip ${activeCategory === type ? 'active' : ''}" data-category="${type}">
                ${capitalize(type)} <span class="category-count">${types[type]}</span>
            </div>
        `;
    });
    
    elements.categoryChipsContainer.innerHTML = html;
    
    // Register event listeners on newly generated chips
    const chips = elements.categoryChipsContainer.querySelectorAll('.category-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.filters.category = chip.getAttribute('data-category');
            renderFeed();
        });
    });
}

// Get filtered and sorted updates
function getFilteredUpdates() {
    let filtered = state.updates.filter(item => {
        // Search filter
        const matchesSearch = !state.filters.search || 
            item.text.toLowerCase().includes(state.filters.search) || 
            item.type.toLowerCase().includes(state.filters.search) ||
            item.date.toLowerCase().includes(state.filters.search);
            
        // Category filter
        const matchesCategory = state.filters.category === 'ALL' || 
            item.type.toUpperCase() === state.filters.category;
            
        return matchesSearch && matchesCategory;
    });
    
    // Sort updates
    filtered.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        return state.filters.sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
}

// Render Feed content based on filters
function renderFeed() {
    if (state.updates.length === 0) return;
    
    const filtered = getFilteredUpdates();
    
    // Render Empty State if no match
    if (filtered.length === 0) {
        elements.feedTimeline.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No release notes match your search</h3>
                <p>Try adjusting your keyword filter or switching category tabs.</p>
            </div>
        `;
        return;
    }
    
    // Group updates by date string (e.g. "June 17, 2026")
    const grouped = {};
    const dateOrder = []; // maintain order
    
    filtered.forEach(item => {
        const key = item.date;
        if (!grouped[key]) {
            grouped[key] = [];
            dateOrder.push(key);
        }
        grouped[key].push(item);
    });
    
    // Generate feed HTML
    let feedHTML = '';
    
    dateOrder.forEach(date => {
        const dateUpdates = grouped[date];
        
        feedHTML += `
            <div class="date-group">
                <div class="date-header">
                    <h2 class="date-title">${date}</h2>
                    <div class="date-line"></div>
                </div>
                <div class="updates-grid">
                    ${dateUpdates.map(upd => renderUpdateCard(upd)).join('')}
                </div>
            </div>
        `;
    });
    
    elements.feedTimeline.innerHTML = feedHTML;
    
    // Bind click events to tweet buttons
    elements.feedTimeline.querySelectorAll('.tweet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = btn.getAttribute('data-id');
            openTweetComposer(updateId);
        });
    });

    // Bind click events to copy buttons
    elements.feedTimeline.querySelectorAll('.copy-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const updateId = btn.getAttribute('data-id');
            copyCardDescription(updateId);
        });
    });
}

// Generate single card HTML
function renderUpdateCard(upd) {
    const cardTypeClass = `type-${upd.type.toLowerCase()}`;
    
    return `
        <article class="update-card ${cardTypeClass}" id="card-${upd.id}">
            <div class="card-header">
                <span class="type-badge">${upd.type}</span>
                <span class="card-date">${upd.date}</span>
            </div>
            <div class="card-body">
                ${upd.html}
            </div>
            <div class="card-footer">
                <div style="display: flex; gap: 8px;">
                    <a href="https://docs.cloud.google.com/feeds/bigquery-release-notes.xml" target="_blank" class="btn btn-sm" style="font-size: 0.75rem;">
                        Source
                    </a>
                    <button class="btn btn-sm copy-card-btn" data-id="${upd.id}" title="Copy description to clipboard">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                        Copy
                    </button>
                </div>
                <button class="btn btn-primary btn-sm tweet-btn" data-id="${upd.id}">
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="r-1nao33i r-4qtqp9 r-yyyyoo r-16y2u6a r-1lk7712 r-dnmxcd r-fpd50l r-18js8t1"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                    Tweet
                </button>
            </div>
        </article>
    `;
}

// Tweet Composer Modal Management
function openTweetComposer(updateId) {
    const update = state.updates.find(u => u.id === updateId);
    if (!update) return;
    
    state.activeComposerUpdate = update;
    
    // Format default Tweet Draft
    // e.g., BigQuery Feature (June 17, 2026): You can enable autonomous embedding generation on tables... #GoogleCloud #BigQuery
    let draft = `📢 BigQuery ${capitalize(update.type)} (${update.date}):\n`;
    
    // Append the body text (already cleaned of HTML by backend)
    // If the draft is too long, we will truncate the body segment, keeping the headers and tags
    const maxBodyLen = 200;
    let bodyText = update.text;
    if (bodyText.length > maxBodyLen) {
        bodyText = bodyText.substring(0, maxBodyLen) + '...';
    }
    
    draft += `${bodyText}\n\n#BigQuery #GoogleCloud`;
    
    // Set Modal content
    elements.composerTextarea.value = draft;
    elements.composerMetaType.textContent = capitalize(update.type);
    elements.composerMetaDate.textContent = update.date;
    
    // Open modal animation class
    elements.modalOverlay.classList.add('active');
    updateCharCounter();
    
    // Focus textarea
    setTimeout(() => {
        elements.composerTextarea.focus();
    }, 100);
}

function closeModal() {
    elements.modalOverlay.classList.remove('active');
    state.activeComposerUpdate = null;
}

// Character Counter Computation & Circular Progress SVG Draw
function updateCharCounter() {
    const text = elements.composerTextarea.value;
    const len = text.length;
    
    // Twitter 280-char limit
    const limit = 280;
    
    elements.charTextCount.textContent = `${len}/${limit}`;
    
    // Update SVG progress ring
    const percentage = Math.min((len / limit) * 100, 100);
    const strokeDashoffset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;
    elements.charRingProgress.style.strokeDashoffset = strokeDashoffset;
    
    // Change coloring based on limits
    if (len > limit) {
        elements.charTextCount.className = "char-text danger";
        elements.charRingProgress.style.stroke = "var(--color-issue)";
        elements.charWarning.style.display = "block";
        elements.modalTweetBtn.disabled = true;
    } else if (len > limit - 20) {
        elements.charTextCount.className = "char-text warning";
        elements.charRingProgress.style.stroke = "var(--color-deprecation)";
        elements.charWarning.style.display = "none";
        elements.modalTweetBtn.disabled = false;
    } else {
        elements.charTextCount.className = "char-text";
        elements.charRingProgress.style.stroke = "var(--color-primary)";
        elements.charWarning.style.display = "none";
        elements.modalTweetBtn.disabled = false;
    }
}

// Copy to Clipboard Action
async function copyTweetText() {
    const text = elements.composerTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        showToast("✓ Copied draft to clipboard!");
    } catch (err) {
        console.error("Failed to copy:", err);
        showToast("✕ Failed to copy text automatically", "danger");
    }
}

// Open Twitter Web Intent in a new Window
function openTwitterIntent() {
    const text = elements.composerTextarea.value;
    if (text.length > 280) {
        showToast("✕ Cannot tweet: text exceeds 280 characters", "danger");
        return;
    }
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,toolbar=0,menubar=0,location=0,status=0,scrollbars=yes,resizable=yes');
    closeModal();
}

// Toast Feedback Notification
let toastTimeout;
function showToast(message, type = "success") {
    clearTimeout(toastTimeout);
    elements.toast.textContent = message;
    
    // Styling classes
    elements.toast.className = "toast active";
    if (type === "danger") {
        elements.toast.style.background = "var(--color-issue)";
    } else if (type === "warning") {
        elements.toast.style.background = "var(--color-deprecation)";
    } else {
        elements.toast.style.background = "var(--color-feature)";
    }
    
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 3000);
}

// Copy Card Description to Clipboard
async function copyCardDescription(updateId) {
    const update = state.updates.find(u => u.id === updateId);
    if (!update) return;
    try {
        await navigator.clipboard.writeText(update.text);
        showToast("✓ Copied update description!");
    } catch (err) {
        console.error("Failed to copy:", err);
        showToast("✕ Failed to copy text automatically", "danger");
    }
}

// Export Filtered Release Notes to CSV
function exportToCSV() {
    const filtered = getFilteredUpdates();
    if (filtered.length === 0) {
        showToast("✕ No updates available to export", "warning");
        return;
    }
    
    // Header row
    const headers = ["Date", "Updated Timestamp", "Type", "Content Description"];
    
    // Map to rows
    const rows = filtered.map(item => {
        const cleanDate = item.date.replace(/"/g, '""');
        const cleanUpdated = (item.updated || "").replace(/"/g, '""');
        const cleanType = item.type.replace(/"/g, '""');
        const cleanText = item.text.replace(/"/g, '""');
        
        return `"${cleanDate}","${cleanUpdated}","${cleanType}","${cleanText}"`;
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    // Create download link and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("✓ Exported to CSV successfully!");
}

// Helper Utilities
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
