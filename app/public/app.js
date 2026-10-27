/**
 * MovieBoxTV PC — Modern Cinema Desktop Application
 * Handles State, API Communication, UI Rendering, Watch & Search History, and Custom Video Player
 */

// Application State
const state = {
  currentTab: 'HOME',
  tabs: [],
  activeSubject: null,
  activeSeasonData: null,
  selectedSeason: 1,
  selectedEpisode: 1,
  currentPlayData: null,
  currentQuality: null,
  currentSubtitle: null,
  controlsTimeout: null,
  searchDebounce: null,
  isPlaying: false,
  currentPlaybackSubject: null, // Stores active playback details for history saving
  lastSaveTimestamp: 0,
};

// DOM Element References
const elements = {
  navTabs: document.getElementById('nav-tabs'),
  tabHistory: document.getElementById('tab-history'),
  navbar: document.getElementById('navbar'),
  logoHome: document.getElementById('logo-home'),

  // Search Bar & Search History
  searchBoxWrapper: document.getElementById('search-box-wrapper'),
  searchBox: document.getElementById('search-box'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  searchHistoryDropdown: document.getElementById('search-history-dropdown'),
  searchHistoryList: document.getElementById('search-history-list'),
  btnClearSearches: document.getElementById('btn-clear-searches'),
  searchChipsContainer: document.getElementById('search-chips-container'),
  searchChipsList: document.getElementById('search-chips-list'),
  searchSection: document.getElementById('search-section'),
  searchGrid: document.getElementById('search-grid'),
  searchCount: document.getElementById('search-count'),
  searchEmpty: document.getElementById('search-empty'),

  // Feed & Continue Watching
  feedContainer: document.getElementById('feed-container'),
  continueWatchingSection: document.getElementById('continue-watching-section'),
  continueWatchingCarousel: document.getElementById('continue-watching-carousel'),
  continueCount: document.getElementById('continue-count'),
  btnCwLeft: document.getElementById('btn-cw-left'),
  btnCwRight: document.getElementById('btn-cw-right'),
  shelvesWrapper: document.getElementById('shelves-wrapper'),
  shelfLoading: document.getElementById('shelf-loading'),

  // Full History View
  historySection: document.getElementById('history-section'),
  historyGrid: document.getElementById('history-grid'),
  historyCount: document.getElementById('history-count'),
  historyEmpty: document.getElementById('history-empty'),
  btnClearAllHistory: document.getElementById('btn-clear-all-history'),

  btnFullscreenToggle: document.getElementById('btn-fullscreen-toggle'),

  // Billboard
  heroBillboard: document.getElementById('hero-billboard'),
  billboardBackdrop: document.getElementById('billboard-backdrop'),
  billboardScore: document.getElementById('billboard-score'),
  billboardTitle: document.getElementById('billboard-title'),
  billboardMeta: document.getElementById('billboard-meta'),
  billboardDesc: document.getElementById('billboard-desc'),
  btnBillboardPlay: document.getElementById('btn-billboard-play'),
  btnBillboardDetails: document.getElementById('btn-billboard-details'),

  // Detail Modal
  detailModal: document.getElementById('detail-modal'),
  btnModalClose: document.getElementById('btn-modal-close'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalPoster: document.getElementById('modal-poster'),
  modalTitle: document.getElementById('modal-title'),
  modalYear: document.getElementById('modal-year'),
  modalDuration: document.getElementById('modal-duration'),
  modalGenre: document.getElementById('modal-genre'),
  modalSynopsis: document.getElementById('modal-synopsis'),
  modalCountry: document.getElementById('modal-country'),
  modalImdb: document.getElementById('modal-imdb'),
  modalStaff: document.getElementById('modal-staff'),
  btnModalPlay: document.getElementById('btn-modal-play'),
  modalPlayText: document.getElementById('modal-play-text'),
  seasonsSection: document.getElementById('seasons-section'),
  seasonTabs: document.getElementById('season-tabs'),
  episodesGrid: document.getElementById('episodes-grid'),
  modalRecGrid: document.getElementById('modal-rec-grid'),

  // Cinema Player
  playerOverlay: document.getElementById('player-overlay'),
  videoElement: document.getElementById('video-element'),
  playerLoader: document.getElementById('player-loader'),
  playerLoadingText: document.getElementById('player-loading-text'),
  playerControls: document.getElementById('player-controls'),
  btnPlayerExit: document.getElementById('btn-player-exit'),
  playerTitle: document.getElementById('player-title'),
  playerSubtitle: document.getElementById('player-subtitle'),
  playerTapArea: document.getElementById('player-tap-area'),
  timelineContainer: document.getElementById('timeline-container'),
  timelineBuffered: document.getElementById('timeline-buffered'),
  timelineProgress: document.getElementById('timeline-progress'),
  timelineThumb: document.getElementById('timeline-thumb'),
  timelineTooltip: document.getElementById('timeline-tooltip'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  btnRewind: document.getElementById('btn-rewind'),
  btnForward: document.getElementById('btn-forward'),
  btnVolume: document.getElementById('btn-volume'),
  iconVolHigh: document.getElementById('icon-vol-high'),
  iconVolMute: document.getElementById('icon-vol-mute'),
  volumeSlider: document.getElementById('volume-slider'),
  currentTimeDisplay: document.getElementById('current-time'),
  totalDurationDisplay: document.getElementById('total-duration'),

  // Player Enhancements: Clarity & Speed
  btnClarityToggle: document.getElementById('btn-clarity-toggle'),
  clarityLabel: document.getElementById('clarity-label'),
  dropdownSpeedContainer: document.getElementById('dropdown-speed-container'),
  btnSpeedSelect: document.getElementById('btn-speed-select'),
  currentSpeedLabel: document.getElementById('current-speed-label'),
  speedMenu: document.getElementById('speed-menu'),

  // Quality & Subtitles
  dropdownQualityContainer: document.getElementById('dropdown-quality-container'),
  btnQualitySelect: document.getElementById('btn-quality-select'),
  currentQualityLabel: document.getElementById('current-quality-label'),
  qualityMenu: document.getElementById('quality-menu'),
  dropdownSubtitlesContainer: document.getElementById('dropdown-subtitles-container'),
  btnSubtitlesSelect: document.getElementById('btn-subtitles-select'),
  currentSubtitleLabel: document.getElementById('current-subtitle-label'),
  subtitlesMenu: document.getElementById('subtitles-menu'),

  btnPlayerFullscreen: document.getElementById('btn-player-fullscreen'),
  iconExpand: document.getElementById('icon-expand'),
  iconCompress: document.getElementById('icon-compress'),

  // Toast
  toast: document.getElementById('toast'),
  toastText: document.getElementById('toast-text'),
};

// ======================== API CLIENT ========================

const API_BASE = (() => {
  const custom = localStorage.getItem('mbox_api_base');
  if (custom) return custom.replace(/\/+$/, '');
  if (window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp.com')) {
    return 'https://spry-violet-d5xmusy.tmp.now';
  }
  return '';
})();

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

const api = {
  async getTabs() {
    const res = await fetch(apiUrl('/api/tabs'));
    return res.json();
  },
  async getHome(tabId, page = 1) {
    const res = await fetch(apiUrl(`/api/home?tabId=${encodeURIComponent(tabId)}&page=${page}`));
    return res.json();
  },
  async getSubject(id) {
    const res = await fetch(apiUrl(`/api/subject/${id}`));
    return res.json();
  },
  async getSeason(id) {
    const res = await fetch(apiUrl(`/api/season/${id}`));
    return res.json();
  },
  async getPlayInfo(id, se = 0, ep = 0) {
    const res = await fetch(apiUrl(`/api/play/${id}?se=${se}&ep=${ep}`));
    return res.json();
  },
  async search(keyword, page = 1) {
    const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(keyword)}&page=${page}`));
    return res.json();
  },
  async getRecommendations(id) {
    const res = await fetch(apiUrl(`/api/recommend/${id}`));
    return res.json();
  }
};

// ======================== TOAST NOTIFICATIONS ========================

let toastTimer = null;
function showToast(msg, duration = 3000) {
  if (toastTimer) clearTimeout(toastTimer);
  elements.toastText.textContent = msg;
  elements.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, duration);
}

// ======================== TIME & FORMAT UTILITIES ========================

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const remainingSecs = s % 60;
  const padSecs = remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remainingMins = m % 60;
    const padMins = remainingMins < 10 ? `0${remainingMins}` : remainingMins;
    return `${h}:${padMins}:${padSecs}`;
  }
  return `${m}:${padSecs}`;
}

function formatRemaining(remainingSecs) {
  if (!remainingSecs || remainingSecs <= 30) return 'Completed';
  const m = Math.round(remainingSecs / 60);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m left` : `${h}h left`;
}

// ======================== WATCH HISTORY MANAGER ========================

const watchHistoryManager = {
  STORAGE_KEY: 'moviebox_watch_history',

  getHistory() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Error reading watch history:", e);
      return [];
    }
  },

  getItem(subjectId, se = 0, ep = 0) {
    const key = `${subjectId}_${se}_${ep}`;
    const list = this.getHistory();
    return list.find(item => item.id === key) || null;
  },

  saveProgress(subject, currentTime, duration, se = 0, ep = 0) {
    if (!subject || !duration || duration <= 0) return;
    const curTime = Math.floor(currentTime);
    const dur = Math.floor(duration);
    if (dur <= 10) return; // Ignore very short clips

    const key = `${subject.subjectId}_${se}_${ep}`;
    const percentage = Math.min(100, Math.max(0, Math.round((curTime / dur) * 100)));
    const remainingSecs = Math.max(0, dur - curTime);
    const remainingText = formatRemaining(remainingSecs);

    const historyItem = {
      id: key,
      subjectId: subject.subjectId,
      title: subject.title || 'MovieBox Stream',
      cover: subject.cover || (subject.cover?.url ? subject.cover.url : ''),
      season: se || 0,
      episode: ep || 0,
      subjectType: subject.subjectType || 1,
      currentTime: curTime,
      duration: dur,
      percentage: percentage,
      remainingSeconds: remainingSecs,
      remainingText: remainingText,
      updatedAt: Date.now()
    };

    let list = this.getHistory().filter(item => item.id !== key);
    list.unshift(historyItem);

    // Limit to 50 recent items
    if (list.length > 50) {
      list = list.slice(0, 50);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Error saving watch history:", e);
    }

    // Refresh Continue Watching Shelf if currently on HOME
    if (state.currentTab === 'HOME' && elements.historySection.classList.contains('hidden')) {
      renderContinueWatchingShelf();
    }
    // Refresh History Grid if currently on HISTORY
    if (state.currentTab === 'HISTORY') {
      renderHistoryView();
    }
  },

  removeHistory(id) {
    let list = this.getHistory().filter(item => item.id !== id);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Error removing watch history:", e);
    }

    if (state.currentTab === 'HOME') {
      renderContinueWatchingShelf();
    }
    if (state.currentTab === 'HISTORY') {
      renderHistoryView();
    }
    showToast("Removed from history");
  },

  clearAllHistory() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn("Error clearing watch history:", e);
    }

    renderContinueWatchingShelf();
    renderHistoryView();
    showToast("Watch history cleared");
  }
};

// ======================== SEARCH HISTORY MANAGER ========================

const searchHistoryManager = {
  STORAGE_KEY: 'moviebox_search_history',

  getSearches() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Error reading search history:", e);
      return [];
    }
  },

  addSearch(keyword) {
    const term = (keyword || '').trim();
    if (!term || term.length < 2) return;

    let list = this.getSearches().filter(s => s.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    if (list.length > 10) list = list.slice(0, 10);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Error saving search history:", e);
    }

    this.renderDropdown();
    this.renderChips();
  },

  removeSearch(keyword) {
    let list = this.getSearches().filter(s => s.toLowerCase() !== keyword.toLowerCase());
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("Error removing search item:", e);
    }

    this.renderDropdown();
    this.renderChips();
  },

  clearSearches() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn("Error clearing search history:", e);
    }

    this.renderDropdown();
    this.renderChips();
    elements.searchHistoryDropdown.classList.add('hidden');
    showToast("Search history cleared");
  },

  renderDropdown() {
    const searches = this.getSearches();
    elements.searchHistoryList.innerHTML = '';

    if (searches.length === 0) {
      elements.searchHistoryDropdown.classList.add('hidden');
      return;
    }

    searches.forEach(term => {
      const item = document.createElement('div');
      item.className = 'search-history-item';
      item.innerHTML = `
        <div class="search-history-item-left">
          <svg class="history-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span class="history-item-text">${escapeHtml(term)}</span>
        </div>
        <button type="button" class="btn-remove-search" title="Remove from history">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      // Click on text to search
      item.querySelector('.search-history-item-left').addEventListener('click', () => {
        elements.searchInput.value = term;
        elements.searchClear.classList.remove('hidden');
        elements.searchHistoryDropdown.classList.add('hidden');
        performSearch(term);
      });

      // Click on delete icon to remove
      item.querySelector('.btn-remove-search').addEventListener('click', (e) => {
        e.stopPropagation();
        searchHistoryManager.removeSearch(term);
      });

      elements.searchHistoryList.appendChild(item);
    });
  },

  renderChips() {
    const searches = this.getSearches();
    elements.searchChipsList.innerHTML = '';

    if (searches.length === 0) {
      elements.searchChipsContainer.classList.add('hidden');
      return;
    }

    elements.searchChipsContainer.classList.remove('hidden');
    searches.slice(0, 6).forEach(term => {
      const chip = document.createElement('div');
      chip.className = 'search-chip';
      chip.innerHTML = `
        <span class="chip-text">${escapeHtml(term)}</span>
        <button type="button" class="chip-del" title="Remove">×</button>
      `;

      chip.querySelector('.chip-text').addEventListener('click', () => {
        elements.searchInput.value = term;
        elements.searchClear.classList.remove('hidden');
        performSearch(term);
      });

      chip.querySelector('.chip-del').addEventListener('click', (e) => {
        e.stopPropagation();
        searchHistoryManager.removeSearch(term);
      });

      elements.searchChipsList.appendChild(chip);
    });
  }
};

// ======================== NAVIGATION & TABS ========================

async function initTabs() {
  try {
    const data = await api.getTabs();
    if (data && data.code === 0 && data.data && data.data.tabs) {
      state.tabs = data.data.tabs;
      renderTabs(state.tabs);
    }
  } catch (err) {
    console.error("Failed to load tabs:", err);
  }
}

function renderTabs(tabs) {
  elements.navTabs.innerHTML = '';

  // Render API tabs
  tabs.forEach(tab => {
    if (["HOME", "MOVIE", "TV", "ANIMATION", "KIDS"].includes(tab.tabId)) {
      const btn = document.createElement('button');
      btn.className = `nav-tab ${tab.tabId === state.currentTab ? 'active' : ''}`;
      btn.dataset.tabId = tab.tabId;
      btn.innerHTML = `<span class="tab-label">${tab.name}</span>`;
      btn.addEventListener('click', () => switchTab(tab.tabId));
      elements.navTabs.appendChild(btn);
    }
  });

  // Always append History Tab with icon
  const historyBtn = document.createElement('button');
  historyBtn.className = `nav-tab nav-tab-history ${state.currentTab === 'HISTORY' ? 'active' : ''}`;
  historyBtn.dataset.tabId = 'HISTORY';
  historyBtn.id = 'tab-history';
  historyBtn.innerHTML = `
    <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
    <span class="tab-label">History</span>
  `;
  historyBtn.addEventListener('click', () => switchTab('HISTORY'));
  elements.navTabs.appendChild(historyBtn);
  elements.tabHistory = historyBtn;
}

async function switchTab(tabId) {
  state.currentTab = tabId;

  // Update tabs visual state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabId === tabId);
  });

  // Reset search view
  elements.searchInput.value = '';
  elements.searchClear.classList.add('hidden');
  elements.searchSection.classList.add('hidden');
  elements.searchHistoryDropdown.classList.add('hidden');

  if (tabId === 'HISTORY') {
    elements.feedContainer.classList.add('hidden');
    elements.historySection.classList.remove('hidden');
    renderHistoryView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Regular categories feed
  elements.historySection.classList.add('hidden');
  elements.feedContainer.classList.remove('hidden');

  await loadHomeFeed(tabId);
}

// ======================== FEED & BILLBOARD ========================

async function loadHomeFeed(tabId) {
  elements.shelvesWrapper.innerHTML = `
    <div class="shelf-loading" id="shelf-loading">
      <div class="spinner"></div>
      <p>Loading curated catalogue...</p>
    </div>
  `;

  // Render continue watching shelf if on HOME
  if (tabId === 'HOME') {
    renderContinueWatchingShelf();
  } else {
    elements.continueWatchingSection.classList.add('hidden');
  }

  try {
    const data = await api.getHome(tabId);
    if (data && data.code === 0 && data.data && data.data.items) {
      elements.shelvesWrapper.innerHTML = '';
      processFeedItems(data.data.items);
    } else {
      elements.shelvesWrapper.innerHTML = `<p style="text-align:center; padding:40px;">No titles found.</p>`;
    }
  } catch (err) {
    console.error("Error loading home feed:", err);
    elements.shelvesWrapper.innerHTML = `<p style="text-align:center; padding:40px; color:#ff4d4d;">Failed to load feed: ${err.message}</p>`;
  }
}

function processFeedItems(items) {
  let billboardSet = false;

  items.forEach(item => {
    // 1. Process Banner Items for Hero Billboard
    if (item.type === "TV_OPS_BANNER" && item.subjects && item.subjects.length > 0 && !billboardSet) {
      setupBillboard(item.subjects[0]);
      billboardSet = true;
    }

    // 2. Process Shelves / Content Carousels
    if (item.subjects && item.subjects.length > 0) {
      const shelfTitle = item.title || getDefaultShelfTitle(item.type);
      createShelf(shelfTitle, item.subjects);
      
      // If billboard was not set yet, use the first available subject
      if (!billboardSet) {
        setupBillboard(item.subjects[0]);
        billboardSet = true;
      }
    }
  });
}

function getDefaultShelfTitle(type) {
  const map = {
    "TV_OPS_BANNER": "Featured Trending",
    "TV_OPS_SUBJECT": "Popular Picks",
    "TV_OPS_RANK": "Top Ranked Today",
    "TV_OPS_BLOCK": "Recently Updated"
  };
  return map[type] || "Trending Now";
}

function setupBillboard(subject) {
  const coverUrl = subject.cover?.url || '';
  elements.billboardBackdrop.style.backgroundImage = `url('${coverUrl}')`;
  elements.billboardTitle.textContent = subject.title || 'MovieBox Premiere';
  
  const score = subject.imdbRatingValue || subject.score || '8.5';
  elements.billboardScore.textContent = score;

  const genres = subject.genre || 'Action, Drama';
  const year = subject.releaseDate ? subject.releaseDate.split('-')[0] : '2026';
  elements.billboardMeta.textContent = `${year} • ${genres}`;
  elements.billboardDesc.textContent = subject.description || "Stream this blockbuster title with crystal clear 1080p audio and video streaming on MovieBoxTV.";

  elements.btnBillboardPlay.onclick = () => {
    openDetailModal(subject.subjectId, true);
  };
  elements.btnBillboardDetails.onclick = () => {
    openDetailModal(subject.subjectId, false);
  };
}

// ======================== CONTINUE WATCHING SHELF ========================

function renderContinueWatchingShelf() {
  const history = watchHistoryManager.getHistory();
  // Filter items in progress (at least 5s watched, not 100% completed)
  const inProgressItems = history.filter(item => item.currentTime > 5 && item.percentage < 98);

  if (inProgressItems.length === 0) {
    elements.continueWatchingSection.classList.add('hidden');
    return;
  }

  elements.continueWatchingSection.classList.remove('hidden');
  elements.continueCount.textContent = `${inProgressItems.length} in progress`;
  elements.continueWatchingCarousel.innerHTML = '';

  inProgressItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card continue-watching-card';
    card.dataset.id = item.subjectId;

    const isSeries = item.season > 0 || item.subjectType === 2;
    const seLabel = isSeries ? `S${item.season || 1}:E${item.episode || 1}` : 'Feature Film';

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.cover || ''}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="card-remaining-badge">${escapeHtml(item.remainingText)}</div>
        <button type="button" class="card-remove-btn" title="Remove from list">×</button>
        <div class="card-overlay">
          <div class="card-quick-play card-resume-overlay-btn" title="Resume at ${formatTime(item.currentTime)}">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>
        <div class="card-progress-bar-wrap">
          <div class="card-progress-bar" style="width: ${item.percentage}%;"></div>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <div class="card-meta">
          <span style="color:var(--accent-primary); font-weight:600;">${seLabel}</span>
          <span>• ${item.percentage}%</span>
        </div>
      </div>
    `;

    // Remove button handler
    card.querySelector('.card-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      watchHistoryManager.removeHistory(item.id);
    });

    // Card click: Resume playback immediately
    card.addEventListener('click', () => {
      startPlayback(item.subjectId, item.season, item.episode, item.title, item.cover, item.subjectType);
    });

    elements.continueWatchingCarousel.appendChild(card);
  });
}

// Continue watching carousel scrolling
if (elements.btnCwLeft && elements.btnCwRight) {
  elements.btnCwLeft.addEventListener('click', () => {
    elements.continueWatchingCarousel.scrollBy({ left: -600, behavior: 'smooth' });
  });
  elements.btnCwRight.addEventListener('click', () => {
    elements.continueWatchingCarousel.scrollBy({ left: 600, behavior: 'smooth' });
  });
}

// ======================== WATCH HISTORY FULL VIEW ========================

function renderHistoryView() {
  const history = watchHistoryManager.getHistory();
  elements.historyGrid.innerHTML = '';
  elements.historyCount.textContent = `${history.length} titles`;

  if (history.length === 0) {
    elements.historyEmpty.classList.remove('hidden');
    return;
  }

  elements.historyEmpty.classList.add('hidden');

  history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'movie-card history-card';
    card.dataset.id = item.subjectId;

    const isSeries = item.season > 0 || item.subjectType === 2;
    const seLabel = isSeries ? `Season ${item.season || 1} • Episode ${item.episode || 1}` : 'Full Movie';
    const watchedText = `Watched ${formatTime(item.currentTime)} of ${formatTime(item.duration)}`;

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster" src="${item.cover || ''}" alt="${escapeHtml(item.title)}" loading="lazy">
        <div class="card-remaining-badge">${escapeHtml(item.remainingText)}</div>
        <button type="button" class="card-remove-btn" title="Remove from history">×</button>
        <div class="card-overlay">
          <div class="card-quick-play card-resume-overlay-btn" title="Resume Playback">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>
        <div class="card-progress-bar-wrap">
          <div class="card-progress-bar" style="width: ${item.percentage}%;"></div>
        </div>
      </div>
      <div class="card-info history-card-details">
        <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <div class="card-meta">
          <span style="color:var(--accent-primary); font-weight:600;">${seLabel}</span>
          <span>• ${item.percentage}%</span>
        </div>
        <div class="history-time-meta">${watchedText}</div>
        <div class="history-remaining-highlight">Baaki: ${escapeHtml(item.remainingText)}</div>
      </div>
    `;

    // Remove button handler
    card.querySelector('.card-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      watchHistoryManager.removeHistory(item.id);
    });

    // Card click: Resume playback immediately
    card.addEventListener('click', () => {
      startPlayback(item.subjectId, item.season, item.episode, item.title, item.cover, item.subjectType);
    });

    elements.historyGrid.appendChild(card);
  });
}

// Clear all history button
if (elements.btnClearAllHistory) {
  elements.btnClearAllHistory.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear your entire watch history?")) {
      watchHistoryManager.clearAllHistory();
    }
  });
}

// ======================== SHELVES & CAROUSELS ========================

function createShelf(title, subjects) {
  const container = document.createElement('div');
  container.className = 'shelf-container';

  const header = document.createElement('div');
  header.className = 'shelf-header';
  header.innerHTML = `
    <h2 class="shelf-title">${escapeHtml(title)}</h2>
    <div class="shelf-controls">
      <button class="btn-scroll btn-scroll-left" title="Scroll Left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <button class="btn-scroll btn-scroll-right" title="Scroll Right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  `;

  const carousel = document.createElement('div');
  carousel.className = 'shelf-carousel';

  subjects.forEach(subject => {
    const card = createMovieCard(subject);
    carousel.appendChild(card);
  });

  const btnLeft = header.querySelector('.btn-scroll-left');
  const btnRight = header.querySelector('.btn-scroll-right');

  btnLeft.addEventListener('click', () => {
    carousel.scrollBy({ left: -600, behavior: 'smooth' });
  });
  btnRight.addEventListener('click', () => {
    carousel.scrollBy({ left: 600, behavior: 'smooth' });
  });

  container.appendChild(header);
  container.appendChild(carousel);
  elements.shelvesWrapper.appendChild(container);
}

function createMovieCard(subject) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = subject.subjectId;

  const posterUrl = subject.cover?.url || '';
  const score = subject.imdbRatingValue || subject.score || '';
  const year = subject.releaseDate ? subject.releaseDate.split('-')[0] : '';
  const isSeries = subject.subjectType === 2;

  // Check if there is saved progress for this title
  const saved = watchHistoryManager.getItem(subject.subjectId, 0, 0);
  const progressBarHtml = saved && saved.percentage > 0 && saved.percentage < 98 ? `
    <div class="card-remaining-badge">${escapeHtml(saved.remainingText)}</div>
    <div class="card-progress-bar-wrap">
      <div class="card-progress-bar" style="width: ${saved.percentage}%;"></div>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${posterUrl}" alt="${escapeHtml(subject.title)}" loading="lazy">
      ${score ? `<div class="card-corner-badge">★ ${score}</div>` : ''}
      ${progressBarHtml}
      <div class="card-overlay">
        <div class="card-quick-play" title="Watch Now">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title" title="${escapeHtml(subject.title)}">${escapeHtml(subject.title)}</h3>
      <div class="card-meta">
        <span>${year || (isSeries ? 'Series' : 'Movie')}</span>
        ${isSeries ? '<span>• TV</span>' : '<span>• HD</span>'}
      </div>
    </div>
  `;

  card.addEventListener('click', () => {
    openDetailModal(subject.subjectId);
  });

  return card;
}

// ======================== DETAIL MODAL & SEASONS ========================

async function openDetailModal(subjectId, autoPlay = false) {
  elements.detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Loading placeholders
  elements.modalTitle.textContent = "Loading...";
  elements.modalSynopsis.textContent = "Retrieving plot synopsis and video resources...";
  elements.modalBackdrop.style.backgroundImage = 'none';
  elements.modalPoster.src = '';
  elements.seasonsSection.classList.add('hidden');
  elements.modalRecGrid.innerHTML = '';

  try {
    const res = await api.getSubject(subjectId);
    if (!res || res.code !== 0 || !res.data) {
      showToast("Could not load title details");
      return;
    }

    const data = res.data;
    state.activeSubject = data;

    // Fill details
    elements.modalTitle.textContent = data.title;
    elements.modalSynopsis.textContent = data.description || "No synopsis available.";
    elements.modalPoster.src = data.cover?.url || '';
    elements.modalBackdrop.style.backgroundImage = `url('${data.cover?.url || ''}')`;

    const year = data.releaseDate ? data.releaseDate.split('-')[0] : '2026';
    elements.modalYear.textContent = year;
    elements.modalDuration.textContent = data.duration ? `${Math.round(data.duration / 60)} min` : (data.subjectType === 2 ? 'TV Series' : '110 min');
    elements.modalGenre.textContent = data.genre || 'Movie';
    elements.modalCountry.textContent = data.countryName || 'Global';
    elements.modalImdb.textContent = data.imdbRatingValue ? `⭐ ${data.imdbRatingValue} / 10` : '⭐ 8.0 / 10';

    // Cast list
    if (data.staffList && data.staffList.length > 0) {
      const names = data.staffList.slice(0, 5).map(s => s.name).join(', ');
      elements.modalStaff.textContent = names;
    } else {
      elements.modalStaff.textContent = 'Ensemble Cast';
    }

    // Check if TV Series with Seasons
    if (data.subjectType === 2) {
      elements.modalPlayText.textContent = "Play S1:E1";
      await loadSeasons(subjectId);
    } else {
      // Check for saved progress to show Resume text
      const saved = watchHistoryManager.getItem(data.subjectId, 0, 0);
      if (saved && saved.currentTime > 10 && saved.percentage < 95) {
        elements.modalPlayText.textContent = `Resume (${saved.remainingText})`;
      } else {
        elements.modalPlayText.textContent = "Play Movie (1080p)";
      }
    }

    // Play button handler
    elements.btnModalPlay.onclick = () => {
      elements.detailModal.classList.add('hidden');
      document.body.style.overflow = '';
      const se = data.subjectType === 2 ? state.selectedSeason : 0;
      const ep = data.subjectType === 2 ? state.selectedEpisode : 0;
      startPlayback(data.subjectId, se, ep, data.title, data.cover?.url, data.subjectType);
    };

    if (autoPlay) {
      elements.btnModalPlay.click();
    }

    // Load recommendations
    loadRecommendations(subjectId);

  } catch (err) {
    console.error("Error loading subject details:", err);
    showToast("Error loading title details: " + err.message);
  }
}

async function loadSeasons(subjectId) {
  try {
    const res = await api.getSeason(subjectId);
    if (!res || res.code !== 0 || !res.data) return;

    state.activeSeasonData = res.data;
    const seasons = res.data.seasons || [];

    if (seasons.length > 0) {
      elements.seasonsSection.classList.remove('hidden');
      renderSeasonTabs(seasons);
      renderEpisodes(seasons[0]);
    }
  } catch (err) {
    console.warn("Seasons load warning:", err);
  }
}

function renderSeasonTabs(seasons) {
  elements.seasonTabs.innerHTML = '';
  seasons.forEach((season, idx) => {
    const btn = document.createElement('button');
    btn.className = `season-tab-btn ${idx === 0 ? 'active' : ''}`;
    btn.textContent = `Season ${season.se}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.season-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedSeason = season.se;
      renderEpisodes(season);
    });
    elements.seasonTabs.appendChild(btn);
  });
}

function renderEpisodes(season) {
  elements.episodesGrid.innerHTML = '';
  const maxEp = season.maxEp || 12;

  for (let i = 1; i <= maxEp; i++) {
    const btn = document.createElement('button');
    const isSelected = i === state.selectedEpisode && season.se === state.selectedSeason;
    btn.className = `episode-btn ${isSelected ? 'active' : ''}`;

    // Check if this episode has saved progress
    const saved = watchHistoryManager.getItem(state.activeSubject?.subjectId, season.se, i);
    const progressLabel = saved && saved.percentage > 0 ? ` (${saved.percentage}%)` : '';

    btn.textContent = `Ep ${i}${progressLabel}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedEpisode = i;
      elements.modalPlayText.textContent = `Play S${season.se}:E${i}`;
    });
    elements.episodesGrid.appendChild(btn);
  }
}

async function loadRecommendations(subjectId) {
  try {
    const res = await api.getRecommendations(subjectId);
    if (res && res.code === 0 && res.data && res.data.items) {
      elements.modalRecGrid.innerHTML = '';
      res.data.items.slice(0, 8).forEach(rec => {
        const card = createMovieCard(rec);
        card.style.flex = "0 0 140px";
        elements.modalRecGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.warn("Recommendations failed:", err);
  }
}

function closeDetailModal() {
  elements.detailModal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ======================== SEARCH & SEARCH HISTORY ========================

// Search Input Listener with Debounce
elements.searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length > 0) {
    elements.searchClear.classList.remove('hidden');
    elements.searchHistoryDropdown.classList.add('hidden');
  } else {
    elements.searchClear.classList.add('hidden');
    elements.searchSection.classList.add('hidden');
    elements.feedContainer.classList.remove('hidden');
    searchHistoryManager.renderDropdown();
    return;
  }

  if (state.searchDebounce) clearTimeout(state.searchDebounce);
  state.searchDebounce = setTimeout(() => {
    performSearch(query);
  }, 350);
});

// Focus & Click on Search Input opens History Dropdown
elements.searchInput.addEventListener('focus', () => {
  if (elements.searchInput.value.trim().length === 0) {
    searchHistoryManager.renderDropdown();
    const searches = searchHistoryManager.getSearches();
    if (searches.length > 0) {
      elements.searchHistoryDropdown.classList.remove('hidden');
    }
  }
});

// Click outside closes search history dropdown
document.addEventListener('click', (e) => {
  if (elements.searchBoxWrapper && !elements.searchBoxWrapper.contains(e.target)) {
    elements.searchHistoryDropdown.classList.add('hidden');
  }
});

// Clear Search input button
elements.searchClear.addEventListener('click', () => {
  elements.searchInput.value = '';
  elements.searchClear.classList.add('hidden');
  elements.searchSection.classList.add('hidden');
  elements.searchHistoryDropdown.classList.add('hidden');
  elements.feedContainer.classList.remove('hidden');
});

// Clear all search history button
if (elements.btnClearSearches) {
  elements.btnClearSearches.addEventListener('click', (e) => {
    e.stopPropagation();
    searchHistoryManager.clearSearches();
  });
}

async function performSearch(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return;

  // Add to Search History
  searchHistoryManager.addSearch(trimmed);
  elements.searchHistoryDropdown.classList.add('hidden');

  elements.feedContainer.classList.add('hidden');
  elements.historySection.classList.add('hidden');
  elements.searchSection.classList.remove('hidden');
  elements.searchGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 60px;">
      <div class="spinner" style="margin: 0 auto 16px auto;"></div>
      <p style="color:var(--text-secondary)">Searching "${escapeHtml(trimmed)}" across MovieBoxTV...</p>
    </div>
  `;
  elements.searchEmpty.classList.add('hidden');

  try {
    const res = await api.search(trimmed);
    if (res && res.code === 0 && res.data && res.data.items && res.data.items.length > 0) {
      elements.searchGrid.innerHTML = '';
      elements.searchCount.textContent = `${res.data.items.length} titles found`;
      res.data.items.forEach(subject => {
        const card = createMovieCard(subject);
        elements.searchGrid.appendChild(card);
      });
    } else {
      elements.searchGrid.innerHTML = '';
      elements.searchCount.textContent = `0 titles found`;
      elements.searchEmpty.classList.remove('hidden');
    }
  } catch (err) {
    console.error("Search error:", err);
    elements.searchGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#ff4d4d;">Search failed: ${err.message}</p>`;
  }
}

// ======================== CINEMA VIDEO PLAYER ========================

async function startPlayback(subjectId, se = 0, ep = 0, title = "Movie", coverUrl = "", subjectType = 1) {
  elements.playerOverlay.classList.remove('hidden');
  elements.playerLoader.classList.remove('hidden');
  elements.playerLoadingText.textContent = "Fetching High Definition Streams...";
  elements.playerTitle.textContent = title;
  elements.playerSubtitle.textContent = se > 0 ? `Season ${se} • Episode ${ep}` : "Feature Film";

  // Record active playback details for history saving
  state.currentPlaybackSubject = {
    subjectId,
    title,
    cover: coverUrl || state.activeSubject?.cover?.url || '',
    subjectType: subjectType || (se > 0 ? 2 : 1),
    season: se,
    episode: ep
  };

  // Check saved history progress to auto-resume
  const savedProgress = watchHistoryManager.getItem(subjectId, se, ep);

  // Reset video
  elements.videoElement.pause();
  elements.videoElement.removeAttribute('src');
  elements.videoElement.load();

  try {
    let playRes = await api.getPlayInfo(subjectId, se, ep);
    if (!playRes || playRes.code !== 0 || !playRes.data) {
      throw new Error(playRes?.message || "Stream play info unavailable");
    }

    let data = playRes.data;
    state.currentPlayData = data;

    // Pick playable MP4 resource
    let resources = data.resources || [];

    // Fallback: If no resources at se=0/ep=0 (e.g. TV Series opened from banner), check se=1, ep=1
    if (resources.length === 0 && se === 0) {
      try {
        const seriesPlay = await api.getPlayInfo(subjectId, 1, 1);
        if (seriesPlay && seriesPlay.code === 0 && seriesPlay.data?.resources?.length > 0) {
          data = seriesPlay.data;
          resources = data.resources;
          state.currentPlayData = data;
          elements.playerSubtitle.textContent = "Season 1 • Episode 1";
          state.currentPlaybackSubject.season = 1;
          state.currentPlaybackSubject.episode = 1;
        }
      } catch (e) {
        console.warn("Series fallback check:", e.message);
      }
    }

    if (resources.length === 0 && (!data.streams || data.streams.length === 0)) {
      throw new Error("No playable video sources returned for this title.");
    }

    // Sort resources by resolution priority: 1080p > 720p > 480p > 360p
    const qualityPriority = { '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
    resources.sort((a, b) => {
      const qA = qualityPriority[a.resolution] || 0;
      const qB = qualityPriority[b.resolution] || 0;
      return qB - qA;
    });

    setupQualityDropdown(resources);

    // Setup Subtitles / Captions
    const captions = data.captions || [];
    setupSubtitlesDropdown(captions);

    // Pick top resolution stream
    const bestStream = resources[0];
    const resumeSec = (savedProgress && savedProgress.currentTime > 10 && savedProgress.percentage < 95) ? savedProgress.currentTime : 0;

    if (bestStream && bestStream.url) {
      setStreamSource(bestStream.url, bestStream.resolution, resumeSec, savedProgress?.remainingText);
    } else if (data.streams && data.streams.length > 0) {
      setStreamSource(data.streams[0].url, "Auto", resumeSec, savedProgress?.remainingText);
    }

  } catch (err) {
    console.error("Playback start error:", err);
    elements.playerLoader.classList.add('hidden');
    showToast("Playback Error: " + err.message, 5000);
    setTimeout(() => {
      closePlayer();
    }, 2500);
  }
}

function setStreamSource(url, resolutionLabel, resumeTime = 0, remainingText = "") {
  state.currentStreamUrl = url;
  state.currentQuality = resolutionLabel;
  elements.currentQualityLabel.textContent = resolutionLabel;

  // Direct CDN playback with no-referrer for cloud deployments, with proxy fallback
  const isCloud = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const proxyUrl = apiUrl(`/api/stream?url=${encodeURIComponent(url)}`);
  const initialSrc = isCloud ? url : proxyUrl;

  elements.videoElement.src = initialSrc;

  elements.videoElement.onloadedmetadata = () => {
    elements.playerLoader.classList.add('hidden');

    // Auto-Resume from exact second saved in history
    if (resumeTime > 0) {
      elements.videoElement.currentTime = resumeTime;
      const remInfo = remainingText ? ` (${remainingText})` : '';
      showToast(`▶ Resumed at ${formatTime(resumeTime)}${remInfo}`, 4000);
    }

    elements.videoElement.play().catch(e => {
      console.warn("Autoplay blocked, click to play:", e);
    });
  };

  elements.videoElement.onerror = (e) => {
    if (elements.videoElement.src !== proxyUrl && elements.videoElement.src !== window.location.origin + proxyUrl) {
      console.warn("Direct CDN playback failed, switching to stream proxy fallback...");
      elements.videoElement.src = proxyUrl;
      return;
    }
    console.error("Video element playback error:", e);
    elements.playerLoader.classList.add('hidden');
    showToast("Stream error. Trying alternative quality...", 3000);
  };
}

function setupQualityDropdown(resources) {
  elements.qualityMenu.innerHTML = '';
  resources.forEach(res => {
    const btn = document.createElement('button');
    btn.className = `dropdown-option ${res.resolution === state.currentQuality ? 'active' : ''}`;
    btn.innerHTML = `<span>${res.resolution.toUpperCase()}</span><span>${res.codec ? res.codec.toUpperCase() : 'HD'}</span>`;
    btn.addEventListener('click', () => {
      elements.qualityMenu.classList.add('hidden');
      const cur = elements.videoElement.currentTime || 0;
      setStreamSource(res.url, res.resolution, cur);
      showToast(`Resolution switched to ${res.resolution}`);
    });
    elements.qualityMenu.appendChild(btn);
  });
}

function setupSubtitlesDropdown(captions) {
  // Remove existing tracks
  while (elements.videoElement.firstChild) {
    elements.videoElement.removeChild(elements.videoElement.firstChild);
  }

  elements.subtitlesMenu.innerHTML = '';

  // Option: Off
  const offBtn = document.createElement('button');
  offBtn.className = 'dropdown-option active';
  offBtn.textContent = 'Off';
  offBtn.addEventListener('click', () => {
    disableAllTracks();
    elements.currentSubtitleLabel.textContent = 'CC';
    elements.subtitlesMenu.classList.add('hidden');
    document.querySelectorAll('#subtitles-menu .dropdown-option').forEach(b => b.classList.remove('active'));
    offBtn.classList.add('active');
  });
  elements.subtitlesMenu.appendChild(offBtn);

  if (!captions || captions.length === 0) {
    elements.btnSubtitlesSelect.style.opacity = '0.5';
    return;
  }
  elements.btnSubtitlesSelect.style.opacity = '1';

  captions.forEach(cap => {
    const langCode = cap.languageCode || 'en';
    const langName = getLanguageName(langCode);
    const proxyUrl = apiUrl(`/api/subtitle?url=${encodeURIComponent(cap.url)}`);

    // Add HTML5 Track
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = langName;
    track.srclang = langCode;
    track.src = proxyUrl;
    elements.videoElement.appendChild(track);

    // Add Menu Option
    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.textContent = langName;
    btn.addEventListener('click', () => {
      enableTrack(langCode);
      elements.currentSubtitleLabel.textContent = langCode.toUpperCase();
      elements.subtitlesMenu.classList.add('hidden');
      document.querySelectorAll('#subtitles-menu .dropdown-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`Subtitles: ${langName}`);
    });
    elements.subtitlesMenu.appendChild(btn);
  });
}

function disableAllTracks() {
  for (let i = 0; i < elements.videoElement.textTracks.length; i++) {
    elements.videoElement.textTracks[i].mode = 'disabled';
  }
}

function enableTrack(langCode) {
  disableAllTracks();
  for (let i = 0; i < elements.videoElement.textTracks.length; i++) {
    const t = elements.videoElement.textTracks[i];
    if (t.language === langCode) {
      t.mode = 'showing';
      break;
    }
  }
}

function getLanguageName(code) {
  const map = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'hi': 'Hindi',
    'ur': 'Urdu',
    'ar': 'Arabic',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'in_id': 'Indonesian',
    'ms': 'Malay',
    'pa': 'Punjabi',
    'sw': 'Swahili'
  };
  return map[code] || code.toUpperCase();
}

function togglePlay() {
  if (elements.videoElement.paused) {
    elements.videoElement.play();
  } else {
    elements.videoElement.pause();
  }
}

function closePlayer() {
  // Save current progress on exit
  saveCurrentPlaybackProgress();

  elements.videoElement.pause();
  elements.videoElement.removeAttribute('src');
  elements.videoElement.load();
  elements.playerOverlay.classList.add('hidden');
}

function saveCurrentPlaybackProgress() {
  if (state.currentPlaybackSubject && elements.videoElement.duration > 10) {
    const cur = elements.videoElement.currentTime || 0;
    const dur = elements.videoElement.duration || 0;
    watchHistoryManager.saveProgress(
      state.currentPlaybackSubject,
      cur,
      dur,
      state.currentPlaybackSubject.season,
      state.currentPlaybackSubject.episode
    );
  }
}

// ======================== HD CLARITY BOOSTER & PLAYBACK SPEED ========================

// HD Clarity Booster Setup
function initClarityBooster() {
  const isEnabled = localStorage.getItem('moviebox_clarity_boost') === 'true';
  applyClarityBooster(isEnabled, false);

  if (elements.btnClarityToggle) {
    elements.btnClarityToggle.addEventListener('click', () => {
      const currentlyActive = elements.videoElement.classList.contains('clarity-boosted');
      applyClarityBooster(!currentlyActive, true);
    });
  }
}

function applyClarityBooster(enable, showFeedback = true) {
  if (enable) {
    elements.videoElement.classList.add('clarity-boosted');
    elements.btnClarityToggle.classList.add('active');
    if (elements.clarityLabel) elements.clarityLabel.textContent = "HD BOOST ON";
    try { localStorage.setItem('moviebox_clarity_boost', 'true'); } catch (e) {}
    if (showFeedback) showToast("✨ HD Clarity Booster ON (Enhanced Contrast & Saturation)");
  } else {
    elements.videoElement.classList.remove('clarity-boosted');
    elements.btnClarityToggle.classList.remove('active');
    if (elements.clarityLabel) elements.clarityLabel.textContent = "HD BOOST";
    try { localStorage.setItem('moviebox_clarity_boost', 'false'); } catch (e) {}
    if (showFeedback) showToast("HD Clarity Booster OFF");
  }
}

// Playback Speed Selector Setup
function initSpeedSelector() {
  if (!elements.btnSpeedSelect || !elements.speedMenu) return;

  elements.btnSpeedSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.speedMenu.classList.toggle('hidden');
    elements.qualityMenu.classList.add('hidden');
    elements.subtitlesMenu.classList.add('hidden');
  });

  elements.speedMenu.querySelectorAll('.dropdown-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      elements.videoElement.playbackRate = speed;
      elements.currentSpeedLabel.textContent = `${speed}x`;
      elements.speedMenu.querySelectorAll('.dropdown-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      elements.speedMenu.classList.add('hidden');
      showToast(`⚡ Playback Speed: ${speed}x`);
    });
  });
}

// ======================== PLAYER EVENT LISTENERS ========================

elements.videoElement.addEventListener('play', () => {
  state.isPlaying = true;
  elements.iconPlay.classList.add('hidden');
  elements.iconPause.classList.remove('hidden');
});

elements.videoElement.addEventListener('pause', () => {
  state.isPlaying = false;
  elements.iconPlay.classList.remove('hidden');
  elements.iconPause.classList.add('hidden');
  showPlayerControls();
  saveCurrentPlaybackProgress();
});

elements.videoElement.addEventListener('timeupdate', () => {
  const current = elements.videoElement.currentTime || 0;
  const duration = elements.videoElement.duration || 0;
  elements.currentTimeDisplay.textContent = formatTime(current);
  elements.totalDurationDisplay.textContent = formatTime(duration);

  if (duration > 0) {
    const pct = (current / duration) * 100;
    elements.timelineProgress.style.width = `${pct}%`;
    elements.timelineThumb.style.left = `${pct}%`;
  }

  // Update buffered
  if (elements.videoElement.buffered.length > 0) {
    const bufferedEnd = elements.videoElement.buffered.end(elements.videoElement.buffered.length - 1);
    if (duration > 0) {
      elements.timelineBuffered.style.width = `${(bufferedEnd / duration) * 100}%`;
    }
  }

  // Throttle saving progress to watch history every 4 seconds
  const now = Date.now();
  if (now - state.lastSaveTimestamp > 4000) {
    state.lastSaveTimestamp = now;
    saveCurrentPlaybackProgress();
  }
});

// Timeline seeking
elements.timelineContainer.addEventListener('click', (e) => {
  const rect = elements.timelineContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  if (elements.videoElement.duration) {
    elements.videoElement.currentTime = pct * elements.videoElement.duration;
  }
});

elements.timelineContainer.addEventListener('mousemove', (e) => {
  const rect = elements.timelineContainer.getBoundingClientRect();
  const hoverX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, hoverX / rect.width));
  if (elements.videoElement.duration) {
    const hoverTime = pct * elements.videoElement.duration;
    elements.timelineTooltip.textContent = formatTime(hoverTime);
    elements.timelineTooltip.style.left = `${hoverX}px`;
    elements.timelineTooltip.classList.remove('hidden');
  }
});

elements.timelineContainer.addEventListener('mouseleave', () => {
  elements.timelineTooltip.classList.add('hidden');
});

// Volume
elements.volumeSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  elements.videoElement.volume = val;
  elements.videoElement.muted = val === 0;
  updateVolumeIcons(val === 0);
});

elements.btnVolume.addEventListener('click', () => {
  elements.videoElement.muted = !elements.videoElement.muted;
  updateVolumeIcons(elements.videoElement.muted);
  elements.volumeSlider.value = elements.videoElement.muted ? 0 : elements.videoElement.volume || 1;
});

function updateVolumeIcons(isMuted) {
  elements.iconVolHigh.classList.toggle('hidden', isMuted);
  elements.iconVolMute.classList.toggle('hidden', !isMuted);
}

// 10s Rewind & Forward
elements.btnRewind.addEventListener('click', () => {
  elements.videoElement.currentTime = Math.max(0, elements.videoElement.currentTime - 10);
  showToast("⟲ -10s", 1000);
});

elements.btnForward.addEventListener('click', () => {
  elements.videoElement.currentTime = Math.min(elements.videoElement.duration || Infinity, elements.videoElement.currentTime + 10);
  showToast("⟳ +10s", 1000);
});

// Fullscreen
elements.btnPlayerFullscreen.addEventListener('click', toggleFullscreen);
elements.btnFullscreenToggle.addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Fullscreen error:", err);
    });
    elements.iconExpand.classList.add('hidden');
    elements.iconCompress.classList.remove('hidden');
  } else {
    document.exitFullscreen();
    elements.iconExpand.classList.remove('hidden');
    elements.iconCompress.classList.add('hidden');
  }
}

// Auto-hide Player Controls on inactivity
function showPlayerControls() {
  elements.playerControls.classList.remove('idle');
  if (state.controlsTimeout) clearTimeout(state.controlsTimeout);
  if (state.isPlaying) {
    state.controlsTimeout = setTimeout(() => {
      elements.playerControls.classList.add('idle');
      elements.qualityMenu.classList.add('hidden');
      elements.subtitlesMenu.classList.add('hidden');
      if (elements.speedMenu) elements.speedMenu.classList.add('hidden');
    }, 3500);
  }
}

elements.playerOverlay.addEventListener('mousemove', showPlayerControls);
elements.playerTapArea.addEventListener('click', togglePlay);
elements.btnPlayPause.addEventListener('click', togglePlay);
elements.btnPlayerExit.addEventListener('click', closePlayer);

// Dropdown Toggles
elements.btnQualitySelect.addEventListener('click', (e) => {
  e.stopPropagation();
  elements.qualityMenu.classList.toggle('hidden');
  elements.subtitlesMenu.classList.add('hidden');
  if (elements.speedMenu) elements.speedMenu.classList.add('hidden');
});

elements.btnSubtitlesSelect.addEventListener('click', (e) => {
  e.stopPropagation();
  elements.subtitlesMenu.classList.toggle('hidden');
  elements.qualityMenu.classList.add('hidden');
  if (elements.speedMenu) elements.speedMenu.classList.add('hidden');
});

document.addEventListener('click', () => {
  elements.qualityMenu.classList.add('hidden');
  elements.subtitlesMenu.classList.add('hidden');
  if (elements.speedMenu) elements.speedMenu.classList.add('hidden');
});

// Modal close button & background click
elements.btnModalClose.addEventListener('click', closeDetailModal);
elements.detailModal.addEventListener('click', (e) => {
  if (e.target === elements.detailModal) {
    closeDetailModal();
  }
});

// Logo Home button
elements.logoHome.addEventListener('click', () => {
  switchTab('HOME');
});

// Navbar background shadow on scroll
window.addEventListener('scroll', () => {
  elements.navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  const isPlayerOpen = !elements.playerOverlay.classList.contains('hidden');
  const isModalOpen = !elements.detailModal.classList.contains('hidden');

  if (e.key === 'Escape') {
    if (isPlayerOpen) {
      closePlayer();
    } else if (isModalOpen) {
      closeDetailModal();
    } else if (!elements.searchSection.classList.contains('hidden')) {
      elements.searchClear.click();
    } else if (elements.searchHistoryDropdown && !elements.searchHistoryDropdown.classList.contains('hidden')) {
      elements.searchHistoryDropdown.classList.add('hidden');
    }
  }

  // Video Player specific shortcuts
  if (isPlayerOpen) {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
      showPlayerControls();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      elements.btnRewind.click();
      showPlayerControls();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      elements.btnForward.click();
      showPlayerControls();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newVol = Math.min(1, elements.videoElement.volume + 0.1);
      elements.videoElement.volume = newVol;
      elements.volumeSlider.value = newVol;
      updateVolumeIcons(false);
      showToast(`Volume: ${Math.round(newVol * 100)}%`, 1000);
      showPlayerControls();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newVol = Math.max(0, elements.videoElement.volume - 0.1);
      elements.videoElement.volume = newVol;
      elements.volumeSlider.value = newVol;
      updateVolumeIcons(newVol === 0);
      showToast(`Volume: ${Math.round(newVol * 100)}%`, 1000);
      showPlayerControls();
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'm') {
      e.preventDefault();
      elements.btnVolume.click();
    }
  }
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ======================== APP BOOTSTRAP ========================

async function bootstrap() {
  console.log("🎬 MovieBoxTV Desktop PC App Initializing...");
  initClarityBooster();
  initSpeedSelector();
  searchHistoryManager.renderChips();

  await initTabs();
  await loadHomeFeed('HOME');

  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');
  const playId = params.get('play');

  if (playId) {
    const se = parseInt(params.get('se') || '0', 10);
    const ep = parseInt(params.get('ep') || '0', 10);
    startPlayback(playId, se, ep, "MovieBox Stream");
  } else if (detailId) {
    openDetailModal(detailId);
  }
}

bootstrap();
