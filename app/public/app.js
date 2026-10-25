/**
 * MovieBoxTV PC — Modern Cinema Desktop Application
 * Handles State, API Communication, UI Rendering, and Custom Video Player
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
};

// DOM Element References
const elements = {
  navTabs: document.getElementById('nav-tabs'),
  navbar: document.getElementById('navbar'),
  logoHome: document.getElementById('logo-home'),
  searchInput: document.getElementById('search-input'),
  searchClear: document.getElementById('search-clear'),
  searchSection: document.getElementById('search-section'),
  searchGrid: document.getElementById('search-grid'),
  searchCount: document.getElementById('search-count'),
  searchEmpty: document.getElementById('search-empty'),
  feedContainer: document.getElementById('feed-container'),
  shelvesWrapper: document.getElementById('shelves-wrapper'),
  shelfLoading: document.getElementById('shelf-loading'),
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
  btnQualitySelect: document.getElementById('btn-quality-select'),
  currentQualityLabel: document.getElementById('current-quality-label'),
  qualityMenu: document.getElementById('quality-menu'),
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

const api = {
  async getTabs() {
    const res = await fetch('/api/tabs');
    return res.json();
  },
  async getHome(tabId, page = 1) {
    const res = await fetch(`/api/home?tabId=${encodeURIComponent(tabId)}&page=${page}`);
    return res.json();
  },
  async getSubject(id) {
    const res = await fetch(`/api/subject/${id}`);
    return res.json();
  },
  async getSeason(id) {
    const res = await fetch(`/api/season/${id}`);
    return res.json();
  },
  async getPlayInfo(id, se = 0, ep = 0) {
    const res = await fetch(`/api/play/${id}?se=${se}&ep=${ep}`);
    return res.json();
  },
  async search(keyword, page = 1) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&page=${page}`);
    return res.json();
  },
  async getRecommendations(id) {
    const res = await fetch(`/api/recommend/${id}`);
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
  tabs.forEach(tab => {
    // Only display major tabs in top bar
    if (["HOME", "MOVIE", "TV", "ANIMATION", "KIDS"].includes(tab.tabId)) {
      const btn = document.createElement('button');
      btn.className = `nav-tab ${tab.tabId === state.currentTab ? 'active' : ''}`;
      btn.dataset.tabId = tab.tabId;
      btn.innerHTML = `<span class="tab-label">${tab.name}</span>`;
      btn.addEventListener('click', () => switchTab(tab.tabId));
      elements.navTabs.appendChild(btn);
    }
  });
}

async function switchTab(tabId) {
  if (state.currentTab === tabId && elements.searchSection.classList.contains('hidden')) {
    return;
  }
  state.currentTab = tabId;

  // Update tabs visual state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabId === tabId);
  });

  // Reset search view
  elements.searchInput.value = '';
  elements.searchClear.classList.add('hidden');
  elements.searchSection.classList.add('hidden');
  elements.feedContainer.classList.remove('hidden');

  // Load feed for tab
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

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster" src="${posterUrl}" alt="${escapeHtml(subject.title)}" loading="lazy">
      ${score ? `<div class="card-corner-badge">★ ${score}</div>` : ''}
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
      elements.modalPlayText.textContent = "Play Movie (1080p)";
    }

    // Play button handler
    elements.btnModalPlay.onclick = () => {
      elements.detailModal.classList.add('hidden');
      document.body.style.overflow = '';
      const se = data.subjectType === 2 ? state.selectedSeason : 0;
      const ep = data.subjectType === 2 ? state.selectedEpisode : 0;
      startPlayback(data.subjectId, se, ep, data.title);
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
    if (res && res.code === 0 && res.data && res.data.seasons && res.data.seasons.length > 0) {
      state.activeSeasonData = res.data;
      elements.seasonsSection.classList.remove('hidden');
      renderSeasonPills(res.data.seasons);
    }
  } catch (err) {
    console.warn("Could not load seasons:", err);
  }
}

function renderSeasonPills(seasons) {
  elements.seasonTabs.innerHTML = '';
  state.selectedSeason = seasons[0].se;

  seasons.forEach((season, idx) => {
    const pill = document.createElement('button');
    pill.className = `season-pill ${idx === 0 ? 'active' : ''}`;
    pill.textContent = `Season ${season.se}`;
    pill.addEventListener('click', () => {
      document.querySelectorAll('.season-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedSeason = season.se;
      renderEpisodes(season);
    });
    elements.seasonTabs.appendChild(pill);
  });

  renderEpisodes(seasons[0]);
}

function renderEpisodes(season) {
  elements.episodesGrid.innerHTML = '';
  state.selectedEpisode = 1;
  const maxEp = season.maxEp || 10;

  for (let i = 1; i <= maxEp; i++) {
    const btn = document.createElement('button');
    btn.className = `episode-btn ${i === 1 ? 'active' : ''}`;
    btn.innerHTML = `<span>EPISODE</span><strong>${i}</strong>`;
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

// ======================== SEARCH ========================

elements.searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length > 0) {
    elements.searchClear.classList.remove('hidden');
  } else {
    elements.searchClear.classList.add('hidden');
    elements.searchSection.classList.add('hidden');
    elements.feedContainer.classList.remove('hidden');
    return;
  }

  if (state.searchDebounce) clearTimeout(state.searchDebounce);
  state.searchDebounce = setTimeout(() => {
    performSearch(query);
  }, 350);
});

elements.searchClear.addEventListener('click', () => {
  elements.searchInput.value = '';
  elements.searchClear.classList.add('hidden');
  elements.searchSection.classList.add('hidden');
  elements.feedContainer.classList.remove('hidden');
});

async function performSearch(query) {
  elements.feedContainer.classList.add('hidden');
  elements.searchSection.classList.remove('hidden');
  elements.searchGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 60px;">
      <div class="spinner" style="margin: 0 auto 16px auto;"></div>
      <p style="color:var(--text-secondary)">Searching "${escapeHtml(query)}" across MovieBoxTV...</p>
    </div>
  `;
  elements.searchEmpty.classList.add('hidden');

  try {
    const res = await api.search(query);
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

async function startPlayback(subjectId, se = 0, ep = 0, title = "Movie") {
  elements.playerOverlay.classList.remove('hidden');
  elements.playerLoader.classList.remove('hidden');
  elements.playerLoadingText.textContent = "Fetching High Definition Streams...";
  elements.playerTitle.textContent = title;
  elements.playerSubtitle.textContent = se > 0 ? `Season ${se} • Episode ${ep}` : "Feature Film";

  // Reset video
  elements.videoElement.pause();
  elements.videoElement.removeAttribute('src');
  elements.videoElement.load();

  try {
    const playRes = await api.getPlayInfo(subjectId, se, ep);
    if (!playRes || playRes.code !== 0 || !playRes.data) {
      throw new Error(playRes?.message || "Stream play info unavailable");
    }

    const data = playRes.data;
    state.currentPlayData = data;

    // Pick playable MP4 resource
    const resources = data.resources || [];
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
    if (bestStream && bestStream.url) {
      setStreamSource(bestStream.url, bestStream.resolution);
    } else if (data.streams && data.streams.length > 0) {
      setStreamSource(data.streams[0].url, "Auto");
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

function setStreamSource(url, resolutionLabel) {
  state.currentStreamUrl = url;
  state.currentQuality = resolutionLabel;
  elements.currentQualityLabel.textContent = resolutionLabel;

  const currentTime = elements.videoElement.currentTime || 0;
  elements.videoElement.src = url;

  elements.videoElement.onloadedmetadata = () => {
    elements.playerLoader.classList.add('hidden');
    if (currentTime > 0) {
      elements.videoElement.currentTime = currentTime;
    }
    elements.videoElement.play().catch(e => {
      console.warn("Autoplay blocked, click to play:", e);
    });
  };

  elements.videoElement.onerror = () => {
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
      setStreamSource(res.url, res.resolution);
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
    const proxyUrl = `/api/subtitle?url=${encodeURIComponent(cap.url)}`;

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
  elements.videoElement.pause();
  elements.videoElement.removeAttribute('src');
  elements.videoElement.load();
  elements.playerOverlay.classList.add('hidden');
}

// Player Event Listeners
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
});

elements.btnSubtitlesSelect.addEventListener('click', (e) => {
  e.stopPropagation();
  elements.subtitlesMenu.classList.toggle('hidden');
  elements.qualityMenu.classList.add('hidden');
});

document.addEventListener('click', () => {
  elements.qualityMenu.classList.add('hidden');
  elements.subtitlesMenu.classList.add('hidden');
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
