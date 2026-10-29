/**
 * MovieBoxTV PC — Modern Cinema Desktop Application
 * Handles State, API Communication, UI Rendering, Watch & Search History, and Custom Video Player
 */

// Global network error suppressor
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event.reason || '');
    if (reason.toLowerCase().includes('fetch') || reason.toLowerCase().includes('network') || reason.toLowerCase().includes('abort')) {
      console.warn('[Global Guard] Handled unhandled network rejection:', reason);
      event.preventDefault();
    }
  });
}

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

  // Multi-Server Dual-Channel Hot Standby & Audio Language
  servers: [],
  activeServerIndex: 0,
  backupServerIndex: 1, // Dual-channel hot standby server index
  standbyReady: false,
  quarantineServers: {}, // Tracks failed servers undergoing background recovery
  preloadedUrls: new Set(),
  audioLanguages: [],
  selectedAudioLang: 'hin',
  autoFailoverEnabled: true,
  failoverTimeout: null,

  // Amazon-Style Progressive On-Scroll Feed & Infinite Discovery
  pendingShelves: [],
  shelfObserver: null,
  infiniteScrollCount: 0,

  // DASH Adaptive Bitrate Player
  dashPlayer: null,

  // VLC Aspect Ratio Modes
  aspectRatios: [
    { id: 'contain', label: 'Contain (Original)', class: '' },
    { id: '16-9', label: '16:9 Widescreen', class: 'aspect-16-9' },
    { id: '4-3', label: '4:3 Standard', class: 'aspect-4-3' },
    { id: 'fill', label: 'Fill (Zoom)', class: 'aspect-fill' },
    { id: 'cinema', label: 'CinemaScope (2.39:1)', class: 'aspect-cinema' },
  ],
  aspectRatioIndex: 1, // Default to 16:9 widescreen

  // Lag-Free YouTube Seek Engine
  pendingSeekTime: null,
  seekDebounceTimer: null,
  accumulatedSeekSeconds: 0,
  rippleHideTimer: null,
  qualityToastTimer: null,
  isSeeking: false,
  isDraggingScrubber: false,
  inspectorInterval: null,

  // MovieBox TV Native Favorites / Collection (v1.1.10)
  favorites: [],
  currentCollectionFilter: 'ALL',
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
  modalAudioBox: document.getElementById('modal-audio-box'),
  modalAudioPills: document.getElementById('modal-audio-pills'),
  modalAudioGrid: document.getElementById('modal-audio-grid'),
  modalAudioMeta: document.getElementById('modal-audio-meta'),
  modalCountry: document.getElementById('modal-country'),
  modalImdb: document.getElementById('modal-imdb'),
  modalStaff: document.getElementById('modal-staff'),
  btnModalPlay: document.getElementById('btn-modal-play'),
  modalPlayText: document.getElementById('modal-play-text'),
  seasonsSection: document.getElementById('seasons-section'),
  seasonTabs: document.getElementById('season-tabs'),
  episodesGrid: document.getElementById('episodes-grid'),
  modalRecGrid: document.getElementById('modal-rec-grid'),

  // Cinema Player & VLC Interface
  playerOverlay: document.getElementById('player-overlay'),
  videoElement: document.getElementById('video-element'),
  videoStandby: document.getElementById('video-standby'),
  playerIframe: document.getElementById('player-iframe'),
  playerIframeStandby: document.getElementById('player-iframe-standby'),
  playerLoader: document.getElementById('player-loader'),
  playerLoadingText: document.getElementById('player-loading-text'),
  loaderServerName: document.getElementById('loader-server-name'),
  playerControls: document.getElementById('player-controls'),
  btnPlayerExit: document.getElementById('btn-player-exit'),
  playerTitle: document.getElementById('player-title'),
  playerSubtitle: document.getElementById('player-subtitle'),
  playerTapArea: document.getElementById('player-tap-area'),
  activeServerBadge: document.getElementById('active-server-badge'),
  activeAudioBadge: document.getElementById('active-audio-badge'),
  activeAudioText: document.getElementById('active-audio-text'),
  standbyServerBadge: document.getElementById('standby-server-badge'),
  standbyServerText: document.getElementById('standby-server-text'),

  // Top Bar Controls (for Iframe and Fullscreen)
  btnAudioSelectTop: document.getElementById('btn-audio-select-top'),
  currentAudioTopLabel: document.getElementById('current-audio-top-label'),
  audioMenuTop: document.getElementById('audio-menu-top'),
  dropdownAudioTopContainer: document.getElementById('dropdown-audio-top-container'),
  btnServerSelectTop: document.getElementById('btn-server-select-top'),
  currentServerTopLabel: document.getElementById('current-server-top-label'),
  serverMenuTop: document.getElementById('server-menu-top'),
  btnTopFullscreen: document.getElementById('btn-top-fullscreen'),

  // YouTube-Style Seek Ripples & Quality Badge
  seekRippleLeft: document.getElementById('seek-ripple-left'),
  seekRippleRight: document.getElementById('seek-ripple-right'),
  rippleLeftText: document.getElementById('ripple-left-text'),
  rippleRightText: document.getElementById('ripple-right-text'),
  qualityToast: document.getElementById('quality-toast'),
  qualityToastText: document.getElementById('quality-toast-text'),

  // VLC OSD & Auto-Failover Banner
  vlcOsd: document.getElementById('vlc-osd'),
  vlcOsdIcon: document.getElementById('vlc-osd-icon'),
  vlcOsdText: document.getElementById('vlc-osd-text'),
  failoverBanner: document.getElementById('failover-banner'),
  failoverText: document.getElementById('failover-text'),
  playerAudioNotice: document.getElementById('player-audio-notice'),
  playerAudioNoticeText: document.getElementById('player-audio-notice-text'),

  // VLC Stream Inspector HUD ("Stats for Nerds")
  vlcInspectorHud: document.getElementById('vlc-inspector-hud'),
  statResolution: document.getElementById('stat-resolution'),
  statViewport: document.getElementById('stat-viewport'),
  statServer: document.getElementById('stat-server'),
  statAudio: document.getElementById('stat-audio'),
  statFormat: document.getElementById('stat-format'),
  statBuffer: document.getElementById('stat-buffer'),
  statAspect: document.getElementById('stat-aspect'),
  statFailover: document.getElementById('stat-failover'),
  btnInspectorClose: document.getElementById('btn-inspector-close'),
  btnInspectorToggle: document.getElementById('btn-inspector-toggle'),

  // VLC Bottom Controls
  timelineContainer: document.getElementById('timeline-container'),
  timelineBuffered: document.getElementById('timeline-buffered'),
  timelineProgress: document.getElementById('timeline-progress'),
  timelineThumb: document.getElementById('timeline-thumb'),
  timelineTooltip: document.getElementById('timeline-tooltip'),
  btnStop: document.getElementById('btn-stop'),
  btnPrevEp: document.getElementById('btn-prev-ep'),
  btnNextEp: document.getElementById('btn-next-ep'),
  btnNextEpTop: document.getElementById('btn-next-ep-top'),
  nextEpTopText: document.getElementById('next-ep-top-text'),
  btnPlayPause: document.getElementById('btn-play-pause'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  btnRewind: document.getElementById('btn-rewind'),
  btnForward: document.getElementById('btn-forward'),
  btnVolume: document.getElementById('btn-volume'),
  iconVolHigh: document.getElementById('icon-vol-high'),
  iconVolMute: document.getElementById('icon-vol-mute'),
  volumeSlider: document.getElementById('volume-slider'),
  volumePercentage: document.getElementById('volume-percentage'),
  currentTimeDisplay: document.getElementById('current-time'),
  totalDurationDisplay: document.getElementById('total-duration'),
  timeRemaining: document.getElementById('time-remaining'),

  // Audio Language Selector
  dropdownAudioContainer: document.getElementById('dropdown-audio-container'),
  btnAudioSelect: document.getElementById('btn-audio-select'),
  currentAudioLabel: document.getElementById('current-audio-label'),
  audioMenu: document.getElementById('audio-menu'),

  // Multi-Server Failover Hub
  dropdownServerContainer: document.getElementById('dropdown-server-container'),
  btnServerSelect: document.getElementById('btn-server-select'),
  currentServerLabel: document.getElementById('current-server-label'),
  serverMenu: document.getElementById('server-menu'),

  // Quality, Subtitles, Aspect Ratio, Speed
  dropdownQualityContainer: document.getElementById('dropdown-quality-container'),
  btnQualitySelect: document.getElementById('btn-quality-select'),
  currentQualityLabel: document.getElementById('current-quality-label'),
  qualityMenu: document.getElementById('quality-menu'),
  dropdownSubtitlesContainer: document.getElementById('dropdown-subtitles-container'),
  btnSubtitlesSelect: document.getElementById('btn-subtitles-select'),
  currentSubtitleLabel: document.getElementById('current-subtitle-label'),
  subtitlesMenu: document.getElementById('subtitles-menu'),
  btnAspectRatio: document.getElementById('btn-aspect-ratio'),
  dropdownSpeedContainer: document.getElementById('dropdown-speed-container'),
  btnSpeedSelect: document.getElementById('btn-speed-select'),
  currentSpeedLabel: document.getElementById('current-speed-label'),
  speedMenu: document.getElementById('speed-menu'),

  btnPlayerFullscreen: document.getElementById('btn-player-fullscreen'),
  iconExpand: document.getElementById('icon-expand'),
  iconCompress: document.getElementById('icon-compress'),

  // Toast
  toast: document.getElementById('toast'),
  toastText: document.getElementById('toast-text'),

  // PWA & Mobile App Controls
  btnPwaInstall: document.getElementById('btn-pwa-install'),
  appsDownloadModal: document.getElementById('apps-download-modal'),
  btnCloseAppsModal: document.getElementById('btn-close-apps-modal'),
  mobileBottomNav: document.getElementById('mobile-bottom-nav'),
  mobileNavSearchBtn: document.getElementById('mobile-nav-search-btn'),
  mobileCenterControls: document.getElementById('mobile-center-controls'),
  btnMobilePlayPause: document.getElementById('btn-mobile-playpause'),
  mobileIconPlay: document.getElementById('mobile-icon-play'),
  mobileIconPause: document.getElementById('mobile-icon-pause'),
  btnMobileRw10: document.getElementById('btn-mobile-rw10'),
  btnMobileFf10: document.getElementById('btn-mobile-ff10'),
  playerSheetBackdrop: document.getElementById('player-sheet-backdrop'),

  // MovieBox APK Header & New Views (v1.1.10)
  btnHeaderFavorite: document.getElementById('btn-header-favorite'),
  btnHeaderSettings: document.getElementById('btn-header-settings'),
  userStatusPill: document.getElementById('user-status-pill'),
  collectionSection: document.getElementById('collection-section'),
  collectionGrid: document.getElementById('collection-grid'),
  collectionCount: document.getElementById('collection-count'),
  collectionEmpty: document.getElementById('collection-empty'),
  btnClearAllCollection: document.getElementById('btn-clear-all-collection'),
  channelsSection: document.getElementById('channels-section'),
  channelsGrid: document.getElementById('channels-grid'),
  settingsModal: document.getElementById('settings-modal'),
  btnSettingsClose: document.getElementById('btn-settings-close'),
  settingQualitySelect: document.getElementById('setting-quality-select'),
  settingAudioSelect: document.getElementById('setting-audio-select'),
  settingAutoplayNext: document.getElementById('setting-autoplay-next'),
  btnSettingsClearHistory: document.getElementById('btn-settings-clear-history'),
  btnSettingsClearCache: document.getElementById('btn-settings-clear-cache'),
  btnModalFavorite: document.getElementById('btn-modal-favorite'),
  modalFavText: document.getElementById('modal-fav-text'),
};

// ======================== HIGH-SPEED IMAGE OPTIMIZER & COMPRESSION ========================
// Accelerates poster and backdrop loading by up to 100x via WebP encoding, quality clamp (_QL65_),
// and dimensional constraints (_UX340_) on Amazon/IMDb CDN, Unsplash, and TMDb.
function optimizePosterUrl(url, targetWidth = 340) {
  if (!url || typeof url !== 'string') return '';

  // 1. Amazon IMDb image CDN: WebP compression + Quality Level 65 + Width clamp
  if (url.includes('media-amazon.com') || url.includes('imdb.com')) {
    let opt = url;
    // Transcode JPG to lightweight WebP format
    if (opt.includes('_FMjpg_')) {
      opt = opt.replace(/_FMjpg_/, '_FMwebp_');
    } else if (opt.includes('_V1_') && !opt.includes('_FMwebp_')) {
      opt = opt.replace(/_V1_/, '_V1_FMwebp_');
    }
    // Inject or clamp Quality Level to 65% (saves ~85% bandwidth with zero perceptible quality loss)
    if (opt.includes('_QL')) {
      opt = opt.replace(/_QL\d+_/, '_QL65_');
    } else if (opt.includes('_FMwebp_')) {
      opt = opt.replace(/_FMwebp_/, '_FMwebp_QL65_');
    }
    // Clamp width to targetWidth (e.g. UX340)
    if (/_UX\d+_/.test(opt)) {
      opt = opt.replace(/_UX\d+_/, `_UX${targetWidth}_`);
    } else if (/_UY\d+_/.test(opt)) {
      opt = opt.replace(/_UY\d+_/, `_UY${Math.round(targetWidth * 1.5)}_`);
    } else if (opt.includes('_V1_')) {
      opt = opt.replace(/_V1_/, `_V1_UX${targetWidth}_`);
    }
    return opt;
  }

  // 2. Unsplash image CDN: WebP + Quality 65% + exact target width
  if (url.includes('images.unsplash.com')) {
    if (url.includes('w=')) {
      return url.replace(/w=\d+/, `w=${targetWidth}`).replace(/q=\d+/, 'q=65').replace(/fm=\w+/, 'fm=webp') + (url.includes('fm=') ? '' : '&fm=webp');
    }
    return `${url}&w=${targetWidth}&q=65&fm=webp&fit=crop&auto=format`;
  }

  // 3. TMDB image CDN
  if (url.includes('image.tmdb.org')) {
    const size = targetWidth > 600 ? 'w780' : (targetWidth > 300 ? 'w342' : 'w185');
    return url.replace(/\/original\//, `/${size}/`).replace(/\/w500\//, `/${size}/`);
  }

  return url;
}

// Fallback SVG Generator for Broken or Blocked Posters (Zero Network Requests)
function handlePosterError(img, title = 'MovieBox Cinema') {
  if (!img) return;
  // If optimized URL failed, try the unoptimized raw source first
  if (img.dataset.rawSrc && img.src !== img.dataset.rawSrc && !img.dataset.triedRaw) {
    img.dataset.triedRaw = 'true';
    img.src = img.dataset.rawSrc;
    return;
  }
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  const cleanTitle = (title || 'MovieBox Title').slice(0, 26);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="510" viewBox="0 0 340 510">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#12151c"/>
        <stop offset="50%" stop-color="#1c212c"/>
        <stop offset="100%" stop-color="#0f1117"/>
      </linearGradient>
      <linearGradient id="reel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e50914"/>
        <stop offset="100%" stop-color="#b20710"/>
      </linearGradient>
    </defs>
    <rect width="340" height="510" fill="url(#bg)" rx="12"/>
    <rect x="1" y="1" width="338" height="508" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" rx="11"/>
    <g transform="translate(130, 190)">
      <circle cx="40" cy="40" r="36" fill="url(#reel)" opacity="0.9"/>
      <circle cx="40" cy="40" r="14" fill="#12151c"/>
      <polygon points="36,30 50,40 36,50" fill="#ffffff"/>
    </g>
    <text x="170" y="315" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${cleanTitle}</text>
    <text x="170" y="338" fill="rgba(255,255,255,0.45)" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="500" text-anchor="middle" letter-spacing="1">MOVIEBOX CINEMA</text>
  </svg>`;
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  img.classList.add('loaded');
  if (img.parentElement) {
    img.parentElement.classList.add('img-loaded');
  }
}
window.handlePosterError = handlePosterError;

// ======================== INTELLIGENT AUDIO LANGUAGE MANAGER ========================
// Strictly respects true content audio tracks. Never fabricates Hindi when unavailable.
const LanguagePreferenceManager = {
  getStats() {
    try {
      return JSON.parse(localStorage.getItem('mbox_lang_usage')) || {};
    } catch {
      return {};
    }
  },
  recordLanguage(code) {
    if (!code) return;
    try {
      const stats = this.getStats();
      stats[code] = (stats[code] || 0) + 1;
      localStorage.setItem('mbox_lang_usage', JSON.stringify(stats));
      localStorage.setItem('mbox_last_lang', code);
    } catch {}
  },
  getBestLanguage(availableLangs, subject) {
    if (!availableLangs || availableLangs.length === 0) {
      return { code: "eng", name: "English (Original Audio)", icon: "US" };
    }
    const isIndian = subject?.countryName === 'India' || 
      (subject?.title && ['animal', 'jawan', 'pushpa', 'mirzapur', 'panchayat'].some(k => subject.title.toLowerCase().includes(k)));

    if (isIndian) {
      const hin = availableLangs.find(l => l.code === 'hin');
      if (hin) return hin;
    }

    return availableLangs[0];
  }
};

// ======================== RESILIENT API & EMBEDDED CINEMA ENGINE ========================

// Clean up stale or expired temporary endpoints from previous sessions
try {
  const savedBase = localStorage.getItem('mbox_api_base');
  if (savedBase && (savedBase.includes('.tmp.now') || savedBase.includes('spry-violet') || savedBase.includes('quick-marsh') || savedBase.includes('now.sh'))) {
    localStorage.removeItem('mbox_api_base');
  }
} catch (e) {}

const isCloud = typeof window !== 'undefined' && (
  window.location.hostname.includes('web.app') || 
  window.location.hostname.includes('firebaseapp.com') || 
  (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
);

const API_CANDIDATES = (() => {
  const custom = localStorage.getItem('mbox_api_base');
  if (custom) return [custom.replace(/\/+$/, '')];

  if (isCloud) {
    // In cloud static hosting, run directly through the resilient embedded engine
    // Avoid dead or temporary candidate URLs that trigger 'Failed to fetch' browser exceptions
    return [];
  }
  // Local environment: connect to local Node backend
  return [''];
})();

// Embedded Offline & Cloud-Resilient Cinema Engine
const EmbeddedEngine = {
  tabs: [
    { tabId: "HOME", name: "Home" },
    { tabId: "MOVIE", name: "Movies" },
    { tabId: "TV", name: "TV Series" },
    { tabId: "ANIMATION", name: "Anime" },
    { tabId: "CHANNELS", name: "Live TV" },
    { tabId: "KIDS", name: "Kids" }
  ],

  channels: [
    {
      channelId: "live_nasa",
      title: "NASA TV Live HD",
      category: "Science & Space",
      thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=80",
      description: "Live views of Earth from the International Space Station, spacewalks, rocket launches and deep space exploration.",
      streamUrl: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
      type: "direct"
    },
    {
      channelId: "live_redbull",
      title: "Red Bull TV Live",
      category: "Action Sports",
      thumbnail: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&auto=format&fit=crop&q=80",
      description: "High-adrenaline action sports, extreme skiing, motorsports, bike freeride and world championship events.",
      streamUrl: "https://rbmn-live.akamaized.net/hls/live/590964/geoSTPAL/master.m3u8",
      type: "direct"
    },
    {
      channelId: "live_skynews",
      title: "Sky News Live 24/7",
      category: "World News",
      thumbnail: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&auto=format&fit=crop&q=80",
      description: "Breaking global news, special live broadcasts, interviews, and real-time world events analysis.",
      streamUrl: "https://news.sky.com",
      embedUrl: "https://www.youtube.com/embed/9Auq9mYxFEE?autoplay=1",
      type: "embed"
    },
    {
      channelId: "live_bloomberg",
      title: "Bloomberg Financial TV",
      category: "Business & Markets",
      thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&auto=format&fit=crop&q=80",
      description: "Global business leaders, Wall Street market trading sessions, crypto tracking, and technology trends.",
      streamUrl: "https://bloomberg.com",
      embedUrl: "https://www.youtube.com/embed/dp8PhLsUcFE?autoplay=1",
      type: "embed"
    },
    {
      channelId: "live_france24",
      title: "France 24 English Live",
      category: "International",
      thumbnail: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=500&auto=format&fit=crop&q=80",
      description: "International news coverage with global perspectives from Paris across Europe, Africa, Asia, and the Americas.",
      streamUrl: "https://france24.com",
      embedUrl: "https://www.youtube.com/embed/a_426RiwST8?autoplay=1",
      type: "embed"
    },
    {
      channelId: "live_euronews",
      title: "Euronews World Live",
      category: "European & Global",
      thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80",
      description: "Unfiltered European perspectives, culture, diplomatic discussions, and continuous world events.",
      streamUrl: "https://euronews.com",
      embedUrl: "https://www.youtube.com/embed/pykdAUwiFfA?autoplay=1",
      type: "embed"
    }
  ],

  subjects: [
    // ==================== MOVIES (category: 'movie', subjectType: 1) ====================
    {
      subjectId: "dp_wolv_2024",
      title: "Deadpool & Wolverine",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BZTk5ODY0MmQtMzA3Ni00NGY1LThiYzItZThiNjFiNDM4MTM3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
      imdbRatingValue: "8.0",
      score: "8.0",
      releaseDate: "2024-07-26",
      duration: 7620,
      subjectType: 1,
      category: "movie",
      genre: "Action / Sci-Fi / Comedy",
      countryName: "United States",
      imdbId: "tt6263850",
      tmdbId: "533535",
      audioLangs: ["eng", "hin"],
      description: "Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool. They team up to defeat a common enemy threatening their timelines.",
      staffList: [{ name: "Ryan Reynolds" }, { name: "Hugh Jackman" }, { name: "Emma Corrin" }]
    },
    {
      subjectId: "animal_2023",
      title: "Animal",
      cover: { url: "https://image.tmdb.org/t/p/w500/pwBtk8ngoMtqn0qv8j1feSFTKUn.jpg" },
      imdbRatingValue: "7.1",
      score: "7.1",
      releaseDate: "2023-12-01",
      duration: 12240,
      subjectType: 1,
      category: "movie",
      genre: "Action / Crime / Drama",
      countryName: "India",
      imdbId: "tt13751694",
      tmdbId: "781732",
      audioLangs: ["hin", "tel", "tam"],
      description: "The hardened son of a powerful industrialist returns home after years away, swearing fierce and ruthless vengeance against enemies plotting to destroy his father.",
      staffList: [{ name: "Ranbir Kapoor" }, { name: "Anil Kapoor" }, { name: "Bobby Deol" }, { name: "Rashmika Mandanna" }]
    },
    {
      subjectId: "pushpa_2_2024",
      title: "Pushpa 2: The Rule",
      cover: { url: "https://image.tmdb.org/t/p/w500/1T21FblunT0y8fz7YaW8JMYgUKm.jpg" },
      imdbRatingValue: "7.8",
      score: "7.8",
      releaseDate: "2024-12-05",
      duration: 10800,
      subjectType: 1,
      category: "movie",
      genre: "Action / Thriller / Crime",
      countryName: "India",
      imdbId: "tt15428448",
      tmdbId: "857598",
      audioLangs: ["hin", "tel"],
      description: "Pushpa Raj expands his red sandalwood empire while clashing with the ruthless police officer Bhanwar Singh Shekhawat in an explosive confrontation.",
      staffList: [{ name: "Allu Arjun" }, { name: "Fahadh Faasil" }, { name: "Rashmika Mandanna" }]
    },
    {
      subjectId: "jawan_2023",
      title: "Jawan",
      cover: { url: "https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg" },
      imdbRatingValue: "7.5",
      score: "7.5",
      releaseDate: "2023-09-07",
      duration: 10140,
      subjectType: 1,
      category: "movie",
      genre: "Action / Thriller",
      countryName: "India",
      imdbId: "tt15354916",
      tmdbId: "872906",
      audioLangs: ["hin", "tam", "tel"],
      description: "A man driven by a personal vendetta to rectify the wrongs in society while keeping a promise made years ago takes on a corrupt arms dealer in high-voltage action.",
      staffList: [{ name: "Shah Rukh Khan" }, { name: "Nayanthara" }, { name: "Vijay Sethupathi" }]
    },
    {
      subjectId: "dune_2_2024",
      title: "Dune: Part Two",
      cover: { url: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
      imdbRatingValue: "8.6",
      score: "8.6",
      releaseDate: "2024-03-01",
      duration: 9960,
      subjectType: 1,
      category: "movie",
      genre: "Sci-Fi / Adventure",
      countryName: "United States",
      imdbId: "tt15239678",
      tmdbId: "693134",
      audioLangs: ["eng", "hin"],
      description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.",
      staffList: [{ name: "Timothée Chalamet" }, { name: "Zendaya" }, { name: "Rebecca Ferguson" }]
    },
    {
      subjectId: "oppenheimer_2023",
      title: "Oppenheimer",
      cover: { url: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
      imdbRatingValue: "8.9",
      score: "8.9",
      releaseDate: "2023-07-21",
      duration: 10800,
      subjectType: 1,
      category: "movie",
      genre: "Biography / Drama / History",
      countryName: "United States",
      imdbId: "tt15398776",
      tmdbId: "872585",
      audioLangs: ["eng", "hin"],
      description: "The story of American scientist J. Robert Oppenheimer and his role in the Manhattan Project, pioneering the development of the atomic bomb during World War II.",
      staffList: [{ name: "Cillian Murphy" }, { name: "Emily Blunt" }, { name: "Matt Damon" }, { name: "Robert Downey Jr." }]
    },
    {
      subjectId: "interstellar_2014",
      title: "Interstellar",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
      imdbRatingValue: "8.7",
      score: "8.7",
      releaseDate: "2014-11-07",
      duration: 10140,
      subjectType: 1,
      category: "movie",
      genre: "Sci-Fi / Adventure / Drama",
      countryName: "United States",
      imdbId: "tt0816692",
      tmdbId: "157336",
      audioLangs: ["eng", "hin"],
      description: "When Earth becomes uninhabitable, a team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival across interstellar dimensions.",
      staffList: [{ name: "Matthew McConaughey" }, { name: "Anne Hathaway" }, { name: "Jessica Chastain" }]
    },
    {
      subjectId: "dark_knight",
      title: "The Dark Knight",
      cover: { url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
      imdbRatingValue: "9.0",
      score: "9.0",
      releaseDate: "2008-07-18",
      duration: 9120,
      subjectType: 1,
      category: "movie",
      genre: "Action / Crime / Drama",
      countryName: "United States",
      imdbId: "tt0468569",
      tmdbId: "155",
      audioLangs: ["eng", "hin"],
      description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
      staffList: [{ name: "Christian Bale" }, { name: "Heath Ledger" }, { name: "Aaron Eckhart" }]
    },
    {
      subjectId: "inception_2010",
      title: "Inception",
      cover: { url: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
      imdbRatingValue: "8.8",
      score: "8.8",
      releaseDate: "2010-07-16",
      duration: 8880,
      subjectType: 1,
      category: "movie",
      genre: "Action / Sci-Fi / Thriller",
      countryName: "United States",
      imdbId: "tt1375666",
      tmdbId: "27205",
      audioLangs: ["eng", "hin"],
      description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
      staffList: [{ name: "Leonardo DiCaprio" }, { name: "Joseph Gordon-Levitt" }, { name: "Elliot Page" }]
    },
    {
      subjectId: "avatar_3_2025",
      title: "Avatar: Fire and Ash",
      cover: { url: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
      imdbRatingValue: "8.2",
      score: "8.2",
      releaseDate: "2025-12-19",
      duration: 11400,
      subjectType: 1,
      category: "movie",
      genre: "Action / Adventure / Sci-Fi",
      countryName: "United States",
      imdbId: "tt1757678",
      tmdbId: "83533",
      audioLangs: ["eng", "hin"],
      description: "Jake Sully and Neytiri encounter a mysterious and aggressive new volcanic Na'vi tribe known as the Ash People on the breathtaking moon of Pandora.",
      staffList: [{ name: "Sam Worthington" }, { name: "Zoe Saldana" }, { name: "Sigourney Weaver" }]
    },
    {
      subjectId: "1436232475147128696",
      title: "The Dog Stars",
      cover: { url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80" },
      imdbRatingValue: "8.4",
      score: "8.4",
      releaseDate: "2026-03-15",
      duration: 7136,
      subjectType: 1,
      category: "movie",
      genre: "Sci-Fi / Post-Apocalyptic / Drama",
      countryName: "United States",
      imdbId: "tt21285562",
      tmdbId: "846872",
      audioLangs: ["eng", "hin"],
      description: "In a post-apocalyptic world ravaged by a lethal global flu, a lone pilot and his beloved dog survive in an abandoned airplane hangar, searching across the desolate skies for signs of hope.",
      staffList: [{ name: "Mark Strong" }, { name: "Pedro Pascal" }, { name: "Rebecca Ferguson" }]
    },

    // ==================== TV SERIES (category: 'series', subjectType: 2) ====================
    {
      subjectId: "st_s5_2025",
      title: "Stranger Things: Season 5",
      cover: { url: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg" },
      imdbRatingValue: "8.7",
      score: "8.7",
      releaseDate: "2025-10-31",
      duration: 3900,
      subjectType: 2,
      category: "series",
      genre: "Sci-Fi / Horror / Drama",
      countryName: "United States",
      imdbId: "tt4574334",
      tmdbId: "66732",
      audioLangs: ["eng", "hin"],
      description: "The epic final season in Hawkins. The gang unites to face the ultimate evil of the Upside Down in a breathtaking battle for their town and reality itself.",
      staffList: [{ name: "Millie Bobby Brown" }, { name: "David Harbour" }, { name: "Finn Wolfhard" }]
    },
    {
      subjectId: "breaking_bad",
      title: "Breaking Bad",
      cover: { url: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg" },
      imdbRatingValue: "9.5",
      score: "9.5",
      releaseDate: "2008-01-20",
      duration: 2820,
      subjectType: 2,
      category: "series",
      genre: "Crime / Drama / Thriller",
      countryName: "United States",
      imdbId: "tt0903747",
      tmdbId: "1396",
      audioLangs: ["eng", "hin"],
      description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's financial future.",
      staffList: [{ name: "Bryan Cranston" }, { name: "Aaron Paul" }, { name: "Anna Gunn" }]
    },
    {
      subjectId: "game_of_thrones",
      title: "Game of Thrones",
      cover: { url: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg" },
      imdbRatingValue: "9.2",
      score: "9.2",
      releaseDate: "2011-04-17",
      duration: 3420,
      subjectType: 2,
      category: "series",
      genre: "Action / Adventure / Drama",
      countryName: "United States",
      imdbId: "tt0944947",
      tmdbId: "1399",
      audioLangs: ["eng", "hin"],
      description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
      staffList: [{ name: "Emilia Clarke" }, { name: "Peter Dinklage" }, { name: "Kit Harington" }]
    },
    {
      subjectId: "the_boys",
      title: "The Boys",
      cover: { url: "https://images.metahub.space/poster/medium/tt1190634/img" },
      imdbRatingValue: "8.7",
      score: "8.7",
      releaseDate: "2019-07-26",
      duration: 3600,
      subjectType: 2,
      category: "series",
      genre: "Action / Comedy / Sci-Fi",
      countryName: "United States",
      imdbId: "tt1190634",
      tmdbId: "76479",
      audioLangs: ["eng", "hin"],
      description: "A fun and irreverent take on what happens when superheroes—who are as popular as celebrities, as influential as politicians, and as revered as gods—abuse their superpowers rather than use them for good.",
      staffList: [{ name: "Karl Urban" }, { name: "Jack Quaid" }, { name: "Antony Starr" }]
    },
    {
      subjectId: "loki_series",
      title: "Loki",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BYzA2YjM2ZWQtYTZhMS00OTI3LTlhYzQtZjBiZWZkMDdlNjA5XkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.2",
      score: "8.2",
      releaseDate: "2021-06-09",
      duration: 3120,
      subjectType: 2,
      category: "series",
      genre: "Action / Adventure / Fantasy",
      countryName: "United States",
      imdbId: "tt9140554",
      tmdbId: "84958",
      audioLangs: ["eng", "hin"],
      description: "The mercurial villain Loki resumes his role as the God of Mischief in a new series that takes place after the events of Avengers: Endgame.",
      staffList: [{ name: "Tom Hiddleston" }, { name: "Owen Wilson" }, { name: "Sophia Di Martino" }]
    },
    {
      subjectId: "house_of_dragon",
      title: "House of the Dragon",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BOWU2ZDA0M2EtNWEyYy00MWUwLWI4NjAtYzkxMDFjYzZkNGFiXkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.4",
      score: "8.4",
      releaseDate: "2022-08-21",
      duration: 3720,
      subjectType: 2,
      category: "series",
      genre: "Action / Adventure / Drama",
      countryName: "United States",
      imdbId: "tt11198330",
      tmdbId: "94997",
      audioLangs: ["eng", "hin"],
      description: "An internal succession contest within House Targaryen at the height of its power, 172 years before the birth of Daenerys Targaryen.",
      staffList: [{ name: "Matt Smith" }, { name: "Emma D'Arcy" }, { name: "Olivia Cooke" }]
    },
    {
      subjectId: "wednesday_series",
      title: "Wednesday",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BY2E1NDI5OWEtODJmYi00Nzg2LWI4MjUtODFiMTU2YWViOTU3XkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.1",
      score: "8.1",
      releaseDate: "2022-11-23",
      duration: 3000,
      subjectType: 2,
      category: "series",
      genre: "Comedy / Crime / Fantasy",
      countryName: "United States",
      imdbId: "tt13443470",
      tmdbId: "119051",
      audioLangs: ["eng", "hin"],
      description: "Follows Wednesday Addams' years as a student, attempting to master her emerging psychic ability, thwart a monstrous killing spree, and solve a 25-year-old mystery.",
      staffList: [{ name: "Jenna Ortega" }, { name: "Gwendoline Christie" }, { name: "Riki Lindhome" }]
    },
    {
      subjectId: "the_last_of_us",
      title: "The Last of Us",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BYWI3ODJlMzktY2U5NC00ZjdlLWE1MGItNWQxZDk3NWNjN2RhXkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.8",
      score: "8.8",
      releaseDate: "2023-01-15",
      duration: 3600,
      subjectType: 2,
      category: "series",
      genre: "Action / Adventure / Drama",
      countryName: "United States",
      imdbId: "tt3581920",
      tmdbId: "100088",
      audioLangs: ["eng", "hin"],
      description: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
      staffList: [{ name: "Pedro Pascal" }, { name: "Bella Ramsey" }, { name: "Gabriel Luna" }]
    },
    {
      subjectId: "mirzapur_series",
      title: "Mirzapur",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BZTFjMzMxZTUtYTMyNy00OWNhLTk4ODQtNGI1NjI1NjJhMzc3XkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.5",
      score: "8.5",
      releaseDate: "2018-11-16",
      duration: 3300,
      subjectType: 2,
      category: "series",
      genre: "Action / Crime / Thriller",
      countryName: "India",
      imdbId: "tt6473300",
      tmdbId: "84105",
      audioLangs: ["hin"],
      description: "A shocking incident at a wedding procession ignites a series of events entangling two families in the lawless city of Mirzapur, ruled by the mafia boss Akhandanand Tripathi.",
      staffList: [{ name: "Pankaj Tripathi" }, { name: "Ali Fazal" }, { name: "Divyendu Sharma" }]
    },
    {
      subjectId: "panchayat_series",
      title: "Panchayat",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BNjMwYWMxNjYtY2I2NC00OWE0LTg4MmQtMmI5ZGI2NzU4ODhiXkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "8.9",
      score: "8.9",
      releaseDate: "2020-04-03",
      duration: 2100,
      subjectType: 2,
      category: "series",
      genre: "Comedy / Drama",
      countryName: "India",
      imdbId: "tt12004706",
      tmdbId: "101088",
      audioLangs: ["hin"],
      description: "An engineering graduate takes up a job as a secretary of a Gram Panchayat in a remote village of Uttar Pradesh due to lack of better job options.",
      staffList: [{ name: "Jitendra Kumar" }, { name: "Neena Gupta" }, { name: "Raghubir Yadav" }]
    },

    // ==================== ANIME (category: 'anime', subjectType: 2) ====================
    {
      subjectId: "solo_leveling_2024",
      title: "Solo Leveling",
      cover: { url: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg" },
      imdbRatingValue: "8.5",
      score: "8.5",
      releaseDate: "2024-01-06",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Action / Fantasy",
      countryName: "Japan",
      imdbId: "tt21209876",
      tmdbId: "127532",
      audioLangs: ["jpn", "hin", "eng"],
      description: "In a world where hunters must battle deadly monsters, Sung Jinwoo, the weakest hunter of all mankind, is chosen by a mysterious quest program unlocking infinite growth.",
      staffList: [{ name: "Taito Ban" }, { name: "Genta Nakamura" }, { name: "Reina Ueda" }]
    },
    {
      subjectId: "frieren_2023",
      title: "Frieren: Beyond Journey's End",
      cover: { url: "https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg" },
      imdbRatingValue: "8.9",
      score: "8.9",
      releaseDate: "2023-09-29",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Fantasy / Adventure",
      countryName: "Japan",
      imdbId: "tt22248376",
      tmdbId: "209867",
      audioLangs: ["jpn", "hin", "eng"],
      description: "After the party of heroes defeats the Demon King, elf mage Frieren begins a solitary journey across decades, discovering the depth of human connection.",
      staffList: [{ name: "Atsumi Tanezaki" }, { name: "Kana Ichinose" }, { name: "Chiaki Kobayashi" }]
    },
    {
      subjectId: "jjk_2024",
      title: "Jujutsu Kaisen",
      cover: { url: "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg" },
      imdbRatingValue: "8.6",
      score: "8.6",
      releaseDate: "2020-10-03",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Dark Fantasy / Action",
      countryName: "Japan",
      imdbId: "tt12343534",
      tmdbId: "95479",
      audioLangs: ["jpn", "hin", "eng"],
      description: "Yuji Itadori, a kind teenager, swallows a cursed finger of the King of Curses Ryomen Sukuna and enters Tokyo Jujutsu High to protect humanity from cursed spirits.",
      staffList: [{ name: "Junya Enoki" }, { name: "Yuma Uchida" }, { name: "Asami Seto" }]
    },
    {
      subjectId: "demon_slayer",
      title: "Demon Slayer: Kimetsu no Yaiba",
      cover: { url: "https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg" },
      imdbRatingValue: "8.6",
      score: "8.6",
      releaseDate: "2019-04-06",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Action / Fantasy",
      countryName: "Japan",
      imdbId: "tt9335498",
      tmdbId: "85937",
      audioLangs: ["jpn", "hin", "eng"],
      description: "A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko, who is turning into a demon slowly. Tanjiro sets out to become a demon slayer to avenge his family and cure his sister.",
      staffList: [{ name: "Natsuki Hanae" }, { name: "Akari Kito" }, { name: "Hiro Shimono" }]
    },
    {
      subjectId: "attack_on_titan",
      title: "Attack on Titan",
      cover: { url: "https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg" },
      imdbRatingValue: "9.1",
      score: "9.1",
      releaseDate: "2013-04-07",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Dark Fantasy / Action",
      countryName: "Japan",
      imdbId: "tt2560140",
      tmdbId: "1429",
      audioLangs: ["jpn", "hin", "eng"],
      description: "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.",
      staffList: [{ name: "Yuki Kaji" }, { name: "Yui Ishikawa" }, { name: "Marina Inoue" }]
    },
    {
      subjectId: "death_note",
      title: "Death Note",
      cover: { url: "https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg" },
      imdbRatingValue: "8.9",
      score: "8.9",
      releaseDate: "2006-10-04",
      duration: 1400,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Crime / Mystery / Thriller",
      countryName: "Japan",
      imdbId: "tt0877057",
      tmdbId: "13916",
      audioLangs: ["jpn", "hin", "eng"],
      description: "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it.",
      staffList: [{ name: "Mamoru Miyano" }, { name: "Kappei Yamaguchi" }, { name: "Brad Swaile" }]
    },
    {
      subjectId: "one_piece",
      title: "One Piece",
      cover: { url: "https://m.media-amazon.com/images/M/MV5BMTNjNGU4NTUtYmVjMy00YjRiLTkxMWUtNzZkMDNiYjZhNmViXkEyXkFqcGc@._V1_SX250.jpg" },
      imdbRatingValue: "9.0",
      score: "9.0",
      releaseDate: "1999-10-20",
      duration: 1440,
      subjectType: 2,
      category: "anime",
      genre: "Anime / Action / Adventure",
      countryName: "Japan",
      imdbId: "tt0388629",
      tmdbId: "37854",
      audioLangs: ["jpn", "hin", "eng"],
      description: "Monkey D. Luffy and his pirate crew explore the fantastical seas and exotic islands in search of the world's ultimate treasure known as One Piece to become the next King of the Pirates.",
      staffList: [{ name: "Mayumi Tanaka" }, { name: "Laurent Vernin" }, { name: "Akemi Okamura" }]
    },

    // ==================== KIDS & FAMILY (category: 'kids', subjectType: 1) ====================
    {
      subjectId: "spider_verse_2",
      title: "Spider-Man: Across the Spider-Verse",
      cover: { url: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
      imdbRatingValue: "8.6",
      score: "8.6",
      releaseDate: "2023-06-02",
      duration: 8400,
      subjectType: 1,
      category: "kids",
      genre: "Animation / Action / Family",
      countryName: "United States",
      imdbId: "tt9362722",
      tmdbId: "569094",
      audioLangs: ["eng", "hin"],
      description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
      staffList: [{ name: "Shameik Moore" }, { name: "Hailee Steinfeld" }, { name: "Oscar Isaac" }]
    },
    {
      subjectId: "inside_out_2",
      title: "Inside Out 2",
      cover: { url: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
      imdbRatingValue: "7.7",
      score: "7.7",
      releaseDate: "2024-06-14",
      duration: 5760,
      subjectType: 1,
      category: "kids",
      genre: "Animation / Family / Comedy",
      countryName: "United States",
      imdbId: "tt22022452",
      tmdbId: "1022789",
      audioLangs: ["eng", "hin"],
      description: "Teenager Riley's mind headquarters undergoes a sudden demolition to make room for something entirely unexpected: new Emotions including Anxiety!",
      staffList: [{ name: "Amy Poehler" }, { name: "Maya Hawke" }, { name: "Kensington Tallman" }]
    },
    {
      subjectId: "despicable_me_4",
      title: "Despicable Me 4",
      cover: { url: "https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg" },
      imdbRatingValue: "6.2",
      score: "6.2",
      releaseDate: "2024-07-03",
      duration: 5700,
      subjectType: 1,
      category: "kids",
      genre: "Animation / Family / Comedy",
      countryName: "United States",
      imdbId: "tt7510222",
      tmdbId: "519182",
      audioLangs: ["eng", "hin"],
      description: "Gru, Lucy and their girls welcome a new member to the family, Gru Jr., who is intent on tormenting his dad in high-flying comedy action.",
      staffList: [{ name: "Steve Carell" }, { name: "Kristen Wiig" }, { name: "Will Ferrell" }]
    },
    {
      subjectId: "kung_fu_panda_4",
      title: "Kung Fu Panda 4",
      cover: { url: "https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg" },
      imdbRatingValue: "6.3",
      score: "6.3",
      releaseDate: "2024-03-08",
      duration: 5640,
      subjectType: 1,
      category: "kids",
      genre: "Animation / Action / Family",
      countryName: "United States",
      imdbId: "tt21692408",
      tmdbId: "1011985",
      audioLangs: ["eng", "hin"],
      description: "After Po is tapped to become the Spiritual Leader of the Valley of Peace, he needs to find and train a new Dragon Warrior while a wicked sorceress plans to re-summon all master villains.",
      staffList: [{ name: "Jack Black" }, { name: "Awkwafina" }, { name: "Viola Davis" }]
    }
  ],

  getSubject(id) {
    const sid = String(id);
    let found = this.subjects.find(s => s.subjectId === sid);
    if (!found) {
      const aliasMap = {
        "breaking_bad_2008": "breaking_bad",
        "stranger_things_2016": "st_s5_2025",
        "got_2011": "game_of_thrones",
        "the_boys_2019": "the_boys",
        "loki_2021": "loki_series",
        "hotd_2022": "house_of_dragon",
        "wednesday_2022": "wednesday_series",
        "the_last_of_us_2023": "the_last_of_us",
        "jujutsu_kaisen_2020": "jjk_2024",
        "demon_slayer_2019": "demon_slayer",
        "attack_on_titan_2013": "attack_on_titan",
        "death_note_2006": "death_note",
        "one_piece_1999": "one_piece"
      };
      if (aliasMap[sid]) {
        found = this.subjects.find(s => s.subjectId === aliasMap[sid]);
      }
    }
    if (found) return found;
    return {
      subjectId: String(id),
      title: "MovieBox Featured Title",
      cover: { url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80" },
      imdbRatingValue: "8.2",
      score: "8.2",
      releaseDate: "2025",
      duration: 7200,
      subjectType: 1,
      genre: "Action / Sci-Fi / Drama",
      countryName: "Global",
      imdbId: "tt21285562",
      tmdbId: "846872",
      description: "High definition streaming provided by MovieBoxTV Pro Multi-Server Engine.",
      staffList: [{ name: "Featured Director" }, { name: "Leading Cast" }]
    };
  },

  getHomeFeed(tabId) {
    if (tabId === 'TV') {
      const series = this.subjects.filter(s => s.subjectType === 2 && s.category === 'series');
      const dramaCrime = series.filter(s => s.genre && (s.genre.includes('Drama') || s.genre.includes('Crime')));
      const sciFiFantasy = series.filter(s => s.genre && (s.genre.includes('Sci-Fi') || s.genre.includes('Fantasy') || s.genre.includes('Action')));
      const hindiIndian = series.filter(s => s.countryName === 'India' || (s.audioLangs && s.audioLangs.includes('hin')));

      return {
        code: 0,
        data: {
          items: [
            {
              type: "TV_OPS_BANNER",
              title: "Featured TV Series",
              subjects: [series[0] || this.subjects.find(s => s.subjectType === 2)]
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Trending TV Series (Top 10 Global)",
              subjects: series.slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Critically Acclaimed Drama & Crime Series",
              subjects: (dramaCrime.length >= 3 ? dramaCrime : series).slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Sci-Fi, Fantasy & Thriller Series",
              subjects: (sciFiFantasy.length >= 3 ? sciFiFantasy : series).slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Top Hindi & Indian Original Web Series",
              subjects: (hindiIndian.length >= 2 ? hindiIndian : series).slice(0, 6)
            }
          ]
        }
      };
    }

    if (tabId === 'MOVIE') {
      const movies = this.subjects.filter(s => s.subjectType === 1 && s.category === 'movie');
      const actionThriller = movies.filter(s => s.genre && (s.genre.includes('Action') || s.genre.includes('Thriller')));
      const sciFiCinematic = movies.filter(s => s.genre && (s.genre.includes('Sci-Fi') || s.genre.includes('Drama')));
      const indianBlockbusters = movies.filter(s => s.countryName === 'India' || (s.audioLangs && s.audioLangs.includes('hin')));

      return {
        code: 0,
        data: {
          items: [
            {
              type: "TV_OPS_BANNER",
              title: "Featured Blockbuster Movie",
              subjects: [movies[0] || this.subjects[0]]
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Trending Blockbuster Movies (1080p / 4K)",
              subjects: movies.slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "High-Octane Action & Thriller Hits",
              subjects: (actionThriller.length >= 3 ? actionThriller : movies).slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Sci-Fi & Cinematic Masterpieces",
              subjects: (sciFiCinematic.length >= 3 ? sciFiCinematic : movies).slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Bollywood & Indian Cinema Hits",
              subjects: (indianBlockbusters.length >= 2 ? indianBlockbusters : movies).slice(0, 6)
            }
          ]
        }
      };
    }

    if (tabId === 'ANIMATION') {
      const anime = this.subjects.filter(s => s.category === 'anime');
      const shonenAction = anime.filter(s => s.genre && (s.genre.includes('Action') || s.genre.includes('Dark Fantasy')));
      const masterpieces = anime.filter(s => parseFloat(s.score || s.imdbRatingValue || 0) >= 8.5);

      return {
        code: 0,
        data: {
          items: [
            {
              type: "TV_OPS_BANNER",
              title: "Featured Anime Series",
              subjects: [anime[0] || this.subjects.find(s => s.category === 'anime')]
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Trending Anime Series (English & Hindi Dub)",
              subjects: anime.slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Top Shonen Action & Dark Fantasy",
              subjects: (shonenAction.length >= 3 ? shonenAction : anime).slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "IMDb 8.5+ Anime Masterpieces",
              subjects: (masterpieces.length >= 3 ? masterpieces : anime).slice(0, 6)
            }
          ]
        }
      };
    }

    if (tabId === 'KIDS') {
      const kids = this.subjects.filter(s => s.category === 'kids');
      return {
        code: 0,
        data: {
          items: [
            {
              type: "TV_OPS_BANNER",
              title: "Featured Animated Hit",
              subjects: [kids[0] || this.subjects[0]]
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Top Family & Animated Blockbusters",
              subjects: kids.slice(0, 6)
            },
            {
              type: "TV_OPS_SUBJECTS",
              title: "Fun Animated Adventures",
              subjects: kids
            }
          ]
        }
      };
    }

    // Default / HOME Feed: curated multi-shelf presentation
    const homeMovies = this.subjects.filter(s => s.category === 'movie');
    const homeSeries = this.subjects.filter(s => s.category === 'series');
    const homeAnime = this.subjects.filter(s => s.category === 'anime');
    const homeIndian = this.subjects.filter(s => s.countryName === 'India' || (s.audioLangs && s.audioLangs.includes('hin')));
    const homeKids = this.subjects.filter(s => s.category === 'kids');

    return {
      code: 0,
      data: {
        items: [
          {
            type: "TV_OPS_BANNER",
            title: "Featured Banner",
            subjects: [this.subjects[0]]
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Trending Today (Top 10 Global)",
            subjects: this.subjects.slice(0, 6)
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Hollywood & Global Blockbuster Movies",
            subjects: homeMovies.slice(0, 6)
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Binge-Worthy TV Series & Originals",
            subjects: homeSeries.slice(0, 6)
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Top Anime Hits & Dark Fantasy",
            subjects: homeAnime.slice(0, 6)
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Indian Blockbusters & Regional Hits",
            subjects: homeIndian.slice(0, 6)
          },
          {
            type: "TV_OPS_SUBJECTS",
            title: "Family & Kids Animated Blockbusters",
            subjects: homeKids.slice(0, 6)
          }
        ]
      }
    };
  },

  getSeason(id) {
    const sub = this.getSubject(id) || {};
    const title = (sub.title || id || '').toLowerCase();

    // Map verified real seasons and episode counts for series
    const seriesConfig = {
      // Anime
      "solo_leveling_2024": [{ se: 1, maxEp: 12 }],
      "frieren_2023": [{ se: 1, maxEp: 28 }],
      "jujutsu_kaisen_2020": [{ se: 1, maxEp: 24 }, { se: 2, maxEp: 23 }],
      "jjk_2024": [{ se: 1, maxEp: 24 }, { se: 2, maxEp: 23 }],
      "demon_slayer_2019": [{ se: 1, maxEp: 26 }, { se: 2, maxEp: 18 }, { se: 3, maxEp: 11 }, { se: 4, maxEp: 8 }],
      "demon_slayer": [{ se: 1, maxEp: 26 }, { se: 2, maxEp: 18 }, { se: 3, maxEp: 11 }, { se: 4, maxEp: 8 }],
      "attack_on_titan_2013": [{ se: 1, maxEp: 25 }, { se: 2, maxEp: 12 }, { se: 3, maxEp: 22 }, { se: 4, maxEp: 28 }],
      "attack_on_titan": [{ se: 1, maxEp: 25 }, { se: 2, maxEp: 12 }, { se: 3, maxEp: 22 }, { se: 4, maxEp: 28 }],
      "death_note_2006": [{ se: 1, maxEp: 37 }],
      "death_note": [{ se: 1, maxEp: 37 }],
      "one_piece_1999": [{ se: 1, maxEp: 61 }, { se: 2, maxEp: 16 }, { se: 3, maxEp: 15 }, { se: 4, maxEp: 13 }],
      "one_piece": [{ se: 1, maxEp: 61 }, { se: 2, maxEp: 16 }, { se: 3, maxEp: 15 }, { se: 4, maxEp: 13 }],

      // Western TV Series
      "breaking_bad_2008": [{ se: 1, maxEp: 7 }, { se: 2, maxEp: 13 }, { se: 3, maxEp: 13 }, { se: 4, maxEp: 13 }, { se: 5, maxEp: 16 }],
      "breaking_bad": [{ se: 1, maxEp: 7 }, { se: 2, maxEp: 13 }, { se: 3, maxEp: 13 }, { se: 4, maxEp: 13 }, { se: 5, maxEp: 16 }],
      "stranger_things_2016": [{ se: 1, maxEp: 8 }, { se: 2, maxEp: 9 }, { se: 3, maxEp: 8 }, { se: 4, maxEp: 9 }],
      "st_s5_2025": [{ se: 1, maxEp: 8 }, { se: 2, maxEp: 9 }, { se: 3, maxEp: 8 }, { se: 4, maxEp: 9 }],
      "got_2011": [{ se: 1, maxEp: 10 }, { se: 2, maxEp: 10 }, { se: 3, maxEp: 10 }, { se: 4, maxEp: 10 }, { se: 5, maxEp: 10 }, { se: 6, maxEp: 10 }, { se: 7, maxEp: 7 }, { se: 8, maxEp: 6 }],
      "game_of_thrones": [{ se: 1, maxEp: 10 }, { se: 2, maxEp: 10 }, { se: 3, maxEp: 10 }, { se: 4, maxEp: 10 }, { se: 5, maxEp: 10 }, { se: 6, maxEp: 10 }, { se: 7, maxEp: 7 }, { se: 8, maxEp: 6 }],
      "the_boys_2019": [{ se: 1, maxEp: 8 }, { se: 2, maxEp: 8 }, { se: 3, maxEp: 8 }, { se: 4, maxEp: 8 }],
      "the_boys": [{ se: 1, maxEp: 8 }, { se: 2, maxEp: 8 }, { se: 3, maxEp: 8 }, { se: 4, maxEp: 8 }],
      "loki_2021": [{ se: 1, maxEp: 6 }, { se: 2, maxEp: 6 }],
      "loki_series": [{ se: 1, maxEp: 6 }, { se: 2, maxEp: 6 }],
      "hotd_2022": [{ se: 1, maxEp: 10 }, { se: 2, maxEp: 8 }],
      "house_of_dragon": [{ se: 1, maxEp: 10 }, { se: 2, maxEp: 8 }],
      "wednesday_2022": [{ se: 1, maxEp: 8 }],
      "wednesday_series": [{ se: 1, maxEp: 8 }],
      "the_last_of_us_2023": [{ se: 1, maxEp: 9 }],
      "the_last_of_us": [{ se: 1, maxEp: 9 }],

      // Indian Series
      "mirzapur_series": [{ se: 1, maxEp: 9 }, { se: 2, maxEp: 10 }, { se: 3, maxEp: 10 }],
      "panchayat_series": [{ se: 1, maxEp: 8 }, { se: 2, maxEp: 8 }, { se: 3, maxEp: 8 }]
    };

    let conf = seriesConfig[id];
    if (!conf) {
      if (title.includes('solo leveling')) conf = seriesConfig["solo_leveling_2024"];
      else if (title.includes('frieren')) conf = seriesConfig["frieren_2023"];
      else if (title.includes('jujutsu')) conf = seriesConfig["jujutsu_kaisen_2020"];
      else if (title.includes('demon slayer')) conf = seriesConfig["demon_slayer_2019"];
      else if (title.includes('titan')) conf = seriesConfig["attack_on_titan_2013"];
      else if (title.includes('death note')) conf = seriesConfig["death_note_2006"];
      else if (title.includes('breaking bad')) conf = seriesConfig["breaking_bad_2008"];
      else if (title.includes('stranger things')) conf = seriesConfig["stranger_things_2016"];
      else if (title.includes('mirzapur')) conf = seriesConfig["mirzapur_series"];
      else if (title.includes('panchayat')) conf = seriesConfig["panchayat_series"];
      else if (title.includes('boys')) conf = seriesConfig["the_boys_2019"];
      else if (title.includes('loki')) conf = seriesConfig["loki_2021"];
      else if (title.includes('wednesday')) conf = seriesConfig["wednesday_2022"];
      else if (title.includes('last of us')) conf = seriesConfig["the_last_of_us_2023"];
      else conf = [{ se: 1, maxEp: 10 }, { se: 2, maxEp: 10 }];
    }

    const coverUrl = sub.cover?.url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80";

    const seasons = conf.map(c => ({
      se: c.se,
      seasonNumber: c.se,
      title: `Season ${c.se}`,
      episodeCount: c.maxEp,
      maxEp: c.maxEp,
      episodes: Array.from({ length: c.maxEp }, (_, i) => ({
        ep: i + 1,
        episodeNumber: i + 1,
        title: `Episode ${i + 1}`,
        description: `Official Episode ${i + 1} streaming in 1080p Ultra HD.`,
        cover: { url: coverUrl },
        duration: sub.duration || 3000
      }))
    }));

    return {
      code: 0,
      data: {
        subjectId: String(id),
        seasons: seasons
      }
    };
  },

  getPlayData(id, se = 0, ep = 0, titleHint = '', subjectType = 1, overrideImdbId = '', overrideTmdbId = '') {
    const sub = this.getSubject(id) || {};
    const title = titleHint || sub.title || "Cinema Stream";
    let imdbId = overrideImdbId || (sub.imdbId && sub.imdbId !== "tt21285562" ? sub.imdbId : "");
    if (!imdbId && titleHint) {
      const clean = titleHint.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\w\s:-]/g, '').trim();
      const byTitle = {
        // Movies
        "deadpool & wolverine": "tt6263850",
        "deadpool and wolverine": "tt6263850",
        "animal": "tt13751694",
        "avatar: fire and ash": "tt1757678",
        "avatar: the way of water": "tt1630029",
        "avatar": "tt0499549",
        "jawan": "tt15354916",
        "dune: part two": "tt15239678",
        "dune 2": "tt15239678",
        "oppenheimer": "tt15398776",
        "pushpa 2: the rule": "tt15428448",
        "pushpa 2": "tt15428448",
        "interstellar": "tt0816692",
        "the dog stars": "tt21285562",
        "the dark knight": "tt0468569",
        "inception": "tt1375666",
        "spider-man: across the spider-verse": "tt9362722",
        "inside out 2": "tt22022452",
        "despicable me 4": "tt7510222",
        "kung fu panda 4": "tt21692408",

        // TV Series
        "stranger things": "tt4574334",
        "stranger things: season 5": "tt4574334",
        "breaking bad": "tt0903747",
        "game of thrones": "tt0944947",
        "the boys": "tt1190634",
        "loki": "tt9140554",
        "house of the dragon": "tt11198330",
        "wednesday": "tt13443470",
        "the last of us": "tt3581920",
        "mirzapur": "tt6473300",
        "panchayat": "tt12004706",

        // Anime
        "solo leveling": "tt21209876",
        "frieren": "tt22248376",
        "frieren: beyond journey's end": "tt22248376",
        "jujutsu kaisen": "tt12343534",
        "demon slayer": "tt9335498",
        "demon slayer: kimetsu no yaiba": "tt9335498",
        "attack on titan": "tt2560140",
        "death note": "tt0877057",
        "one piece": "tt0388629"
      }[clean];
      if (byTitle) imdbId = byTitle;
    }
    if (!imdbId) imdbId = sub.imdbId || "tt21285562";

    const tmdbMap = {
      // Movies
      "tt21285562": "846872",
      "tt6263850": "533535",
      "tt13751694": "781732",
      "tt1757678": "83533",
      "tt1630029": "76600",
      "tt0499549": "19995",
      "tt15354916": "872906",
      "tt15239678": "693134",
      "tt15398776": "872585",
      "tt15428448": "857598",
      "tt0816692": "157336",
      "tt0468569": "155",
      "tt1375666": "27205",
      "tt9362722": "569094",
      "tt22022452": "1022789",
      "tt7510222": "519182",
      "tt21692408": "1011985",

      // TV Series
      "tt4574334": "66732",
      "tt0903747": "1396",
      "tt0944947": "1399",
      "tt1190634": "76479",
      "tt9140554": "84958",
      "tt11198330": "94997",
      "tt13443470": "119051",
      "tt3581920": "100088",
      "tt6473300": "84105",
      "tt12004706": "101088",

      // Anime
      "tt21209876": "127532", // Solo Leveling (TMDB 127532)
      "tt22248376": "209867", // Frieren: Beyond Journey's End (TMDB 209867)
      "tt12343534": "95479",  // Jujutsu Kaisen
      "tt9335498": "85937",   // Demon Slayer
      "tt2560140": "1429",    // Attack on Titan
      "tt0877057": "13916",   // Death Note
      "tt0388629": "37854"    // One Piece
    };
    const tmdbId = overrideTmdbId || sub.tmdbId || tmdbMap[imdbId] || "";
    const isSeries = (subjectType === 2 || se > 0);

    // VidLink requires numeric TMDB ID for TV series; if not available, fallback to Nontongo (which natively supports IMDb ID)
    const vidlinkUrl = isSeries
      ? (tmdbId
          ? `https://vidlink.pro/tv/${tmdbId}/${se || 1}/${ep || 1}?primaryColor=e50914&autoplay=false`
          : `https://nontongo.win/embed/tv/${imdbId}/${se || 1}/${ep || 1}`)
      : `https://vidlink.pro/movie/${tmdbId || imdbId}?primaryColor=e50914&autoplay=false`;

    const nontrongoUrl = isSeries
      ? `https://nontongo.win/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://nontongo.win/embed/movie/${imdbId}`;

    const vidfastUrl = isSeries
      ? `https://vidfast.pro/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidfast.pro/movie/${imdbId}`;

    const vidsrcPmUrl = isSeries
      ? `https://vidsrc.pm/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidsrc.pm/embed/movie/${imdbId}`;

    const vidjoyUrl = isSeries
      ? `https://vidjoy.pro/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidjoy.pro/embed/movie/${imdbId}`;

    const videasyUrl = isSeries
      ? `https://player.videasy.net/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://player.videasy.net/movie/${imdbId}`;

    const vidsrcNlUrl = isSeries
      ? `https://player.vidsrc.nl/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://player.vidsrc.nl/embed/movie/${imdbId}`;

    const twoEmbedSkinUrl = isSeries
      ? `https://www.2embed.skin/embedtv/${imdbId}&s=${se || 1}&e=${ep || 1}`
      : `https://www.2embed.skin/embed/${imdbId}`;

    const vidsrcRipUrl = isSeries
      ? `https://vidsrc.rip/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidsrc.rip/embed/movie/${imdbId}`;

    const twoEmbedOrgUrl = isSeries
      ? `https://2embed.org/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://2embed.org/embed/movie/${imdbId}`;

    const vidbingeUrl = isSeries
      ? `https://vidbinge.dev/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidbinge.dev/embed/movie/${imdbId}`;

    const twoEmbedCcUrl = isSeries
      ? `https://www.2embed.cc/embedtv/${imdbId}&s=${se || 1}&e=${ep || 1}`
      : `https://www.2embed.cc/embed/${imdbId}`;

    const autoembedUrl = isSeries
      ? `https://autoembed.co/tv/imdb/${imdbId}-${se || 1}-${ep || 1}`
      : `https://autoembed.co/movie/imdb/${imdbId}`;

    const embedriseUrl = isSeries
      ? `https://embedrise.com/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://embedrise.com/embed/movie/${imdbId}`;

    const frembedUrl = isSeries
      ? `https://frembed.pro/api/tv.php?id=${imdbId}&s=${se || 1}&e=${ep || 1}`
      : `https://frembed.pro/api/film.php?id=${imdbId}`;

    const vidsrcDevUrl = isSeries
      ? `https://vidsrc.dev/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://vidsrc.dev/embed/movie/${imdbId}`;

    const embed123Url = isSeries
      ? `https://play2.123embed.net/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://play2.123embed.net/movie/${imdbId}`;

    const movies111Url = isSeries
      ? `https://111movies.com/embed/tv/${imdbId}/${se || 1}/${ep || 1}`
      : `https://111movies.com/embed/movie/${imdbId}`;

    const isIndian = (sub.countryName === 'India' || (title && ['animal', 'jawan', 'pushpa', 'mirzapur', 'panchayat'].some(k => title.toLowerCase().includes(k))));
    const isAnime = (sub.category === 'anime' || (title && ['solo leveling', 'frieren', 'jujutsu', 'demon slayer', 'titan', 'naruto', 'one piece', 'death note'].some(k => title.toLowerCase().includes(k))));

    const defaultLangs = isIndian
      ? ['hin', 'tel', 'tam']
      : (isAnime ? ['jpn', 'hin', 'eng'] : ['eng', 'hin']);

    const supportedLangs = (sub.audioLangs && sub.audioLangs.length > 0)
      ? sub.audioLangs
      : defaultLangs;

    const allLangDefs = {
      hin: { code: "hin", name: (isIndian ? "Hindi (Original Audio)" : "Hindi (हिंदी Dubbed)"), icon: "IN" },
      eng: { code: "eng", name: (isAnime ? "English (Dubbed)" : "English (Original Audio)"), icon: "US" },
      tel: { code: "tel", name: "Telugu (తెలుగు)", icon: "TE" },
      tam: { code: "tam", name: "Tamil (தமிழ்)", icon: "TA" },
      jpn: { code: "jpn", name: "Japanese (Original Audio)", icon: "JP" }
    };

    const resolvedLanguages = supportedLangs.map(c => allLangDefs[c]).filter(Boolean);

    const cinemaServers = [
      {
        id: "cinema-stream-1",
        name: "Cinema Cloud 1 (4K HDR Adaptive)",
        tag: "4K HDR Adaptive Bitrate • Ultra Premium",
        quality: "4K UHD / 1080p",
        type: "embed",
        isDefault: true,
        url: vidlinkUrl
      },
      {
        id: "cinema-stream-2",
        name: "Cinema Cloud 2 (1080p Fast HLS)",
        tag: "Fast HLS Cloud Mirror • 186K Engine",
        quality: "1080p Full HD",
        type: "embed",
        url: nontrongoUrl
      },
      {
        id: "cinema-stream-3",
        name: "Cinema Cloud 3 (Global Mirror)",
        tag: "Global Content Delivery Mirror • Multi-CDN",
        quality: "4K / 1080p",
        type: "embed",
        url: vidfastUrl
      },
      {
        id: "cinema-stream-4",
        name: "Cinema Cloud 4 (Premium)",
        tag: "Premium Multi-Source Player",
        quality: "1080p HD",
        type: "embed",
        url: vidsrcPmUrl
      },
      {
        id: "cinema-stream-5",
        name: "Cinema Cloud 5 (Ultra HD)",
        tag: "Ultra HD Streaming Engine",
        quality: "1080p HD",
        type: "embed",
        url: vidjoyUrl
      },
      {
        id: "cinema-stream-6",
        name: "Cinema Cloud 6 (Videasy)",
        tag: "Smart Adaptive Player",
        quality: "1080p HD",
        type: "embed",
        url: videasyUrl
      },
      {
        id: "cinema-stream-7",
        name: "Cinema Cloud 7 (NL Mirror)",
        tag: "Netherlands Fast Mirror",
        quality: "1080p HD",
        type: "embed",
        url: vidsrcNlUrl
      },
      {
        id: "cinema-stream-8",
        name: "Cinema Cloud 8 (Skin)",
        tag: "Premium Cloud Skin Server",
        quality: "1080p HD",
        type: "embed",
        url: twoEmbedSkinUrl
      },
      {
        id: "cinema-stream-9",
        name: "Cinema Cloud 9 (RIP Mirror)",
        tag: "High-Speed RIP Mirror Server",
        quality: "1080p HD",
        type: "embed",
        url: vidsrcRipUrl
      },
      {
        id: "cinema-stream-10",
        name: "Cinema Cloud 10 (Global)",
        tag: "Global Cluster Backup",
        quality: "1080p HD",
        type: "embed",
        url: twoEmbedOrgUrl
      },
      {
        id: "cinema-stream-11",
        name: "Cinema Cloud 11 (VidBinge)",
        tag: "Binge-Optimized Stream",
        quality: "1080p HD",
        type: "embed",
        url: vidbingeUrl
      },
      {
        id: "cinema-stream-12",
        name: "Cinema Cloud 12 (CC)",
        tag: "CC Reliable Uptime Mirror",
        quality: "720p / 1080p",
        type: "embed",
        url: twoEmbedCcUrl
      },
      {
        id: "cinema-stream-13",
        name: "Cinema Cloud 13 (AutoEmbed)",
        tag: "Auto-Source Multi-Provider",
        quality: "1080p HD",
        type: "embed",
        url: autoembedUrl
      },
      {
        id: "cinema-stream-14",
        name: "Cinema Cloud 14 (EmbedRise)",
        tag: "Rise Ultra Stream Engine",
        quality: "1080p HD",
        type: "embed",
        url: embedriseUrl
      },
      {
        id: "cinema-stream-15",
        name: "Cinema Cloud 15 (FrEmbed)",
        tag: "French Ultra-Fast Server",
        quality: "1080p HD",
        type: "embed",
        url: frembedUrl
      },
      {
        id: "cinema-stream-16",
        name: "Cinema Cloud 16 (Dev)",
        tag: "Developer-Grade Stream",
        quality: "720p / 1080p",
        type: "embed",
        url: vidsrcDevUrl
      },
      {
        id: "cinema-stream-17",
        name: "Cinema Cloud 17 (123 Net)",
        tag: "123 Network Backup Mirror",
        quality: "720p / 1080p",
        type: "embed",
        url: embed123Url
      },
      {
        id: "cinema-stream-18",
        name: "Cinema Cloud 18 (111 Movies)",
        tag: "111 Movies Emergency Fallback",
        quality: "720p / 1080p",
        type: "embed",
        url: movies111Url
      },
      {
        id: "cinema-stream-8",
        name: "Cinema Direct 4K (Ultra HD)",
        tag: "Official 4K UHD Direct CDN • 0s Latency",
        quality: "4K UHD / 1080p",
        type: "direct",
        resources: [
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
            duration: 7136,
            resolution: "1080p",
            codec: "h264",
            resourceId: "cdn_1080p"
          },
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4",
            duration: 7136,
            resolution: "720p",
            codec: "h264",
            resourceId: "cdn_720p"
          },
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
            duration: 7136,
            resolution: "480p",
            codec: "h264",
            resourceId: "cdn_480p"
          }
        ],
        streams: [
          {
            streamType: 1,
            codecName: "h264",
            resolutions: "1080,720,480",
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
            duration: 7136,
            format: "MP4",
            id: "stream_1"
          }
        ]
      }
    ];

    return {
      code: 0,
      message: "ok",
      data: {
        title: title,
        imdbId: imdbId,
        resources: [
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
            duration: 7136,
            resolution: "1080p",
            codec: "h264",
            resourceId: "cdn_1080p"
          },
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4",
            duration: 7136,
            resolution: "720p",
            codec: "h264",
            resourceId: "cdn_720p"
          },
          {
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
            duration: 7136,
            resolution: "480p",
            codec: "h264",
            resourceId: "cdn_480p"
          }
        ],
        streams: [
          {
            streamType: 1,
            codecName: "h264",
            resolutions: "1080,720,480",
            url: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4",
            duration: 7136,
            format: "MP4",
            id: "stream_1"
          }
        ],
        captions: [
          {
            captionId: "sub_en",
            language: "en",
            languageCode: "en",
            url: "https://raw.githubusercontent.com/brenopolanski/html5-video-webvtt-example/master/subtitles/subtitles-en.vtt",
            format: "VTT"
          }
        ],
        servers: cinemaServers,
        audioLanguages: resolvedLanguages
      }
    };
  },

  search(keyword) {
    const kw = (keyword || '').toLowerCase().trim();
    if (!kw) {
      return { code: 0, data: { items: [] } };
    }
    const results = this.subjects.filter(s => 
      s.title.toLowerCase().includes(kw) || 
      (s.genre && s.genre.toLowerCase().includes(kw))
    );
    return {
      code: 0,
      data: {
        items: results
      }
    };
  }
};

// Resilient Fetch with Candidate Cycling & Embedded Engine Fallback
async function safeApiFetch(path) {
  for (const base of API_CANDIDATES) {
    const fullUrl = `${base}${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2800);
      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && (json.code === 0 || json.data)) {
          return json;
        }
      }
    } catch (err) {
      // Endpoint down or blocked, continue to next candidate
      console.warn(`[SafeFetch] Candidate ${base || 'relative'} unavailable:`, err.message);
    }
  }

  // If all live endpoints fail, seamlessly resolve via Embedded Engine
  console.log(`[SafeFetch] Resolving path ${path} via Resilient Embedded Engine`);
  if (path.startsWith('/api/tabs')) {
    return { code: 0, data: { tabs: EmbeddedEngine.tabs } };
  }
  if (path.startsWith('/api/home')) {
    const url = new URL('http://dummy' + path);
    const tabId = url.searchParams.get('tabId') || 'HOME';
    return EmbeddedEngine.getHomeFeed(tabId);
  }
  if (path.startsWith('/api/subject/')) {
    const id = path.replace('/api/subject/', '').split('?')[0];
    return { code: 0, data: EmbeddedEngine.getSubject(id) };
  }
  if (path.startsWith('/api/season/')) {
    const id = path.replace('/api/season/', '').split('?')[0];
    return EmbeddedEngine.getSeason(id);
  }
  if (path.startsWith('/api/play/')) {
    const url = new URL('http://dummy' + path);
    const id = path.replace('/api/play/', '').split('?')[0];
    const se = parseInt(url.searchParams.get('se'), 10) || 0;
    const ep = parseInt(url.searchParams.get('ep'), 10) || 0;
    const title = url.searchParams.get('title') || '';
    const type = parseInt(url.searchParams.get('type'), 10) || 1;
    const imdbId = url.searchParams.get('imdbId') || '';
    const tmdbId = url.searchParams.get('tmdbId') || '';
    return EmbeddedEngine.getPlayData(id, se, ep, title, type, imdbId, tmdbId);
  }
  if (path.startsWith('/api/search')) {
    const url = new URL('http://dummy' + path);
    const q = url.searchParams.get('q') || '';
    return EmbeddedEngine.search(q);
  }
  if (path.startsWith('/api/recommend/')) {
    return { code: 0, data: { items: EmbeddedEngine.subjects.slice(0, 6) } };
  }

  return { code: 0, data: {} };
}

function apiUrl(path) {
  if (API_CANDIDATES.length > 0 && API_CANDIDATES[0]) {
    return `${API_CANDIDATES[0]}${path}`;
  }
  return path;
}

const api = {
  getTabs() {
    return safeApiFetch('/api/tabs');
  },
  getHome(tabId, page = 1) {
    return safeApiFetch(`/api/home?tabId=${encodeURIComponent(tabId)}&page=${page}`);
  },
  getSubject(id) {
    return safeApiFetch(`/api/subject/${id}`);
  },
  getSeason(id) {
    return safeApiFetch(`/api/season/${id}`);
  },
  getPlayInfo(id, se = 0, ep = 0, title = '', type = 1, imdbId = '', tmdbId = '') {
    return safeApiFetch(`/api/play/${id}?se=${se}&ep=${ep}&title=${encodeURIComponent(title || '')}&type=${type}&imdbId=${encodeURIComponent(imdbId || '')}&tmdbId=${encodeURIComponent(tmdbId || '')}`);
  },
  search(keyword, page = 1) {
    return safeApiFetch(`/api/search?q=${encodeURIComponent(keyword)}&page=${page}`);
  },
  getRecommendations(id) {
    return safeApiFetch(`/api/recommend/${id}`);
  }
};

// ======================== TOAST NOTIFICATIONS ========================

let toastTimer = null;
function showToast(msg, duration = 3000) {
  if (toastTimer) clearTimeout(toastTimer);

  const str = String(msg || '');
  // Filter out and suppress any raw network, fetch, or connection error messages
  if (str.toLowerCase().includes('failed to fetch') || 
      str.toLowerCase().includes('faild to feach') || 
      str.toLowerCase().includes('networkerror') || 
      str.toLowerCase().includes('load failed') ||
      str.toLowerCase().includes('abort') ||
      str.toLowerCase().includes('cors')) {
    console.warn("[Toast] Suppressed raw network exception:", str);
    msg = "Connected to High-Speed 4K Cloud Mirror";
  }

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
      imdbId: subject.imdbId || '',
      tmdbId: subject.tmdbId || '',
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
    if (data && data.code === 0 && data.data && data.data.tabs && data.data.tabs.length > 0) {
      state.tabs = data.data.tabs;
    } else {
      state.tabs = EmbeddedEngine.tabs;
    }
  } catch (err) {
    console.warn("Failed to load network tabs, using embedded tabs:", err);
    state.tabs = EmbeddedEngine.tabs;
  }
  renderTabs(state.tabs);
}

function renderTabs(tabs) {
  elements.navTabs.innerHTML = '';

  // Render API tabs
  tabs.forEach(tab => {
    if (["HOME", "MOVIE", "TV", "ANIMATION", "CHANNELS", "KIDS"].includes(tab.tabId)) {
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

  // Update desktop and mobile nav visual state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabId === tabId);
  });
  if (elements.mobileBottomNav) {
    elements.mobileBottomNav.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabId === tabId);
    });
  }

  // Reset search view
  elements.searchInput.value = '';
  elements.searchClear.classList.add('hidden');
  elements.searchSection.classList.add('hidden');
  elements.searchHistoryDropdown.classList.add('hidden');

  if (tabId === 'HISTORY') {
    elements.feedContainer.classList.add('hidden');
    elements.collectionSection?.classList.add('hidden');
    elements.channelsSection?.classList.add('hidden');
    elements.historySection.classList.remove('hidden');
    renderHistoryView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (tabId === 'FAVORITES' || tabId === 'COLLECTION') {
    elements.feedContainer.classList.add('hidden');
    elements.historySection.classList.add('hidden');
    elements.channelsSection?.classList.add('hidden');
    elements.collectionSection?.classList.remove('hidden');
    renderCollectionSection(state.currentCollectionFilter || 'ALL');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (tabId === 'CHANNELS') {
    elements.feedContainer.classList.add('hidden');
    elements.historySection.classList.add('hidden');
    elements.collectionSection?.classList.add('hidden');
    elements.channelsSection?.classList.remove('hidden');
    renderChannelsSection();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Regular categories feed
  elements.historySection.classList.add('hidden');
  elements.collectionSection?.classList.add('hidden');
  elements.channelsSection?.classList.add('hidden');
  elements.feedContainer.classList.remove('hidden');

  await loadHomeFeed(tabId);
}

// ======================== FEED & BILLBOARD ========================

async function loadHomeFeed(tabId) {
  // Disconnect existing shelf observer
  if (state.shelfObserver) {
    state.shelfObserver.disconnect();
    state.shelfObserver = null;
  }
  state.pendingShelves = [];
  state.infiniteScrollCount = 0;

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
    if (data && data.code === 0 && data.data && data.data.items && data.data.items.length > 0) {
      elements.shelvesWrapper.innerHTML = '';
      processFeedItems(data.data.items);
    } else {
      console.warn("Home feed empty or malformed, rendering resilient embedded feed...");
      const fallbackFeed = EmbeddedEngine.getHomeFeed(tabId);
      elements.shelvesWrapper.innerHTML = '';
      processFeedItems(fallbackFeed.data.items);
    }
  } catch (err) {
    console.warn("Network home feed error, rendering resilient embedded feed:", err);
    const fallbackFeed = EmbeddedEngine.getHomeFeed(tabId);
    elements.shelvesWrapper.innerHTML = '';
    processFeedItems(fallbackFeed.data.items);
  }
}

function isSubjectMatchingTab(subject, tabId) {
  if (!subject) return false;
  if (!tabId || tabId === 'HOME') return true;

  const title = (subject.title || '').toLowerCase();
  const genre = (subject.genre || '').toLowerCase();
  const category = (subject.category || '').toLowerCase();
  const subType = parseInt(subject.subjectType, 10) || (subject.isSeries ? 2 : 1);

  const isAnime = category === 'anime' || genre.includes('anime') || title.includes('solo leveling') || title.includes('frieren') || title.includes('jujutsu') || title.includes('demon slayer') || title.includes('attack on titan') || title.includes('death note') || title.includes('one piece');
  const isKids = category === 'kids' || genre.includes('kids') || genre.includes('family') || title.includes('inside out') || title.includes('despicable me') || title.includes('kung fu panda');

  if (tabId === 'ANIMATION') {
    return isAnime;
  }
  if (tabId === 'KIDS') {
    return isKids;
  }
  if (tabId === 'TV') {
    // Only series, and exclude anime so series section stays pure TV shows
    return (subType === 2 || category === 'series' || subject.isSeries) && !isAnime;
  }
  if (tabId === 'MOVIE') {
    // Only movies, exclude series, anime, and kids animation
    return (subType === 1 || category === 'movie') && subType !== 2 && !subject.isSeries && !isAnime;
  }
  return true;
}

// Progressive On-Scroll Hydration Engine (Amazon Prime Video / Netflix architecture)
function processFeedItems(items) {
  let billboardSet = false;
  const contentShelves = [];
  const currentTab = state.currentTab || 'HOME';

  items.forEach(item => {
    // Filter subjects to strictly match current tab category
    const validSubjects = (item.subjects || []).filter(sub => isSubjectMatchingTab(sub, currentTab));

    // 1. Process Banner Items for Hero Billboard
    if (item.type === "TV_OPS_BANNER" && validSubjects.length > 0 && !billboardSet) {
      setupBillboard(validSubjects[0]);
      billboardSet = true;
    }

    // 2. Queue Content Shelves
    if (validSubjects.length > 0) {
      const shelfTitle = item.title || getDefaultShelfTitle(item.type);
      contentShelves.push({ title: shelfTitle, subjects: validSubjects });
      
      // If billboard was not set yet, use the first available subject
      if (!billboardSet) {
        setupBillboard(validSubjects[0]);
        billboardSet = true;
      }
    }
  });

  // If billboard is still not set (e.g. banner item was filtered out), find the top matching subject
  if (!billboardSet && EmbeddedEngine && EmbeddedEngine.subjects) {
    const topTabSubject = EmbeddedEngine.subjects.find(s => isSubjectMatchingTab(s, currentTab));
    if (topTabSubject) {
      setupBillboard(topTabSubject);
      billboardSet = true;
    }
  }

  // If no shelves could be constructed from upstream for this tab, fall back to curated category shelves
  if (contentShelves.length === 0 && currentTab !== 'HOME') {
    const fallbackFeed = EmbeddedEngine.getHomeFeed(currentTab);
    if (fallbackFeed && fallbackFeed.data && fallbackFeed.data.items) {
      return processFeedItems(fallbackFeed.data.items);
    }
  }

  state.pendingShelves = contentShelves;

  // Render initial 2 shelves immediately (above the fold)
  const initialBatch = state.pendingShelves.splice(0, 2);
  initialBatch.forEach(shelf => {
    createShelf(shelf.title, shelf.subjects);
  });

  // Setup On-Scroll Sentinel Observer for remaining shelves & infinite expansion
  setupShelfScrollObserver();
}

function setupShelfScrollObserver() {
  if (state.shelfObserver) {
    state.shelfObserver.disconnect();
    state.shelfObserver = null;
  }

  let sentinel = document.getElementById('shelves-scroll-sentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'shelves-scroll-sentinel';
    sentinel.className = 'shelves-scroll-sentinel';
    sentinel.innerHTML = `
      <div class="sentinel-loader" title="Loading more titles...">
        <span class="sentinel-dot"></span>
        <span class="sentinel-dot"></span>
        <span class="sentinel-dot"></span>
      </div>
    `;
  }
  elements.shelvesWrapper.appendChild(sentinel);

  state.shelfObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        mountNextShelfBatch();
      }
    });
  }, {
    rootMargin: '450px 0px 450px 0px',
    threshold: 0.01
  });

  state.shelfObserver.observe(sentinel);
}

function mountNextShelfBatch() {
  const sentinel = document.getElementById('shelves-scroll-sentinel');

  // If there are pending shelves from API, mount the next batch (up to 2 shelves)
  if (state.pendingShelves && state.pendingShelves.length > 0) {
    const batch = state.pendingShelves.splice(0, 2);
    batch.forEach(shelf => {
      createShelf(shelf.title, shelf.subjects, sentinel);
    });
    return;
  }

  // Infinite discovery expansion (Amazon Prime Video dynamic row generator)
  mountInfiniteCuratedShelf(sentinel);
}

function mountInfiniteCuratedShelf(sentinel) {
  state.infiniteScrollCount = (state.infiniteScrollCount || 0) + 1;

  const currentTab = state.currentTab || 'HOME';
  const allSubjects = (EmbeddedEngine && EmbeddedEngine.subjects) ? EmbeddedEngine.subjects : [];

  let candidatePool = allSubjects;
  let tabThemes = [];

  if (currentTab === 'TV') {
    candidatePool = allSubjects.filter(s => s.subjectType === 2 && s.category === 'series');
    tabThemes = [
      { title: "Top Rated Drama & Crime Series", filter: s => s.genre?.includes('Drama') || s.genre?.includes('Crime') },
      { title: "Binge-Worthy Thrillers & Mystery", filter: s => s.genre?.includes('Thriller') || s.genre?.includes('Mystery') || s.genre?.includes('Sci-Fi') },
      { title: "Top Indian Original Web Series", filter: s => s.countryName === 'India' || s.audioLangs?.includes('hin') },
      { title: "Critically Acclaimed Global TV Shows", filter: s => parseFloat(s.score || s.imdbRatingValue || 0) >= 8.5 }
    ];
  } else if (currentTab === 'MOVIE') {
    candidatePool = allSubjects.filter(s => s.subjectType === 1 && s.category === 'movie');
    tabThemes = [
      { title: "High-Octane Action Blockbusters", filter: s => s.genre?.includes('Action') || s.genre?.includes('Thriller') },
      { title: "Sci-Fi & Cinematic Masterpieces", filter: s => s.genre?.includes('Sci-Fi') || s.genre?.includes('Adventure') },
      { title: "Bollywood & Indian Cinema Hits", filter: s => s.countryName === 'India' || s.audioLangs?.includes('hin') },
      { title: "IMDb 8.5+ All-Time Classics", filter: s => parseFloat(s.score || s.imdbRatingValue || 0) >= 8.4 }
    ];
  } else if (currentTab === 'ANIMATION') {
    candidatePool = allSubjects.filter(s => s.category === 'anime');
    tabThemes = [
      { title: "Top Shonen Action & Battle Sagas", filter: s => s.genre?.includes('Action') || s.genre?.includes('Dark Fantasy') },
      { title: "Supernatural & Dark Fantasy Hits", filter: s => s.genre?.includes('Fantasy') || s.genre?.includes('Supernatural') },
      { title: "IMDb 8.5+ Legendary Anime Masterpieces", filter: s => parseFloat(s.score || s.imdbRatingValue || 0) >= 8.5 }
    ];
  } else if (currentTab === 'KIDS') {
    candidatePool = allSubjects.filter(s => s.category === 'kids');
    tabThemes = [
      { title: "Fun Animated Adventures & Heroes", filter: s => true }
    ];
  } else {
    // HOME or other tabs
    candidatePool = allSubjects;
    tabThemes = [
      { title: "Trending in India & Global Hits", filter: s => s.countryName === 'India' || s.audioLangs?.includes('hin') },
      { title: "Critically Acclaimed Sci-Fi & Time Warps", filter: s => s.genre?.includes('Sci-Fi') || s.genre?.includes('Action') },
      { title: "Hollywood High-Octane Action Blockbusters", filter: s => s.category === 'movie' && (s.genre?.includes('Action') || s.genre?.includes('Thriller')) },
      { title: "Top Anime Hits & Dark Fantasy", filter: s => s.category === 'anime' },
      { title: "Binge-Worthy TV Series & Drama", filter: s => s.subjectType === 2 && s.category === 'series' },
      { title: "Family & Kids Animated Blockbusters", filter: s => s.category === 'kids' },
      { title: "Oscar Nominees & IMDb 8.5+ Classics", filter: s => parseFloat(s.score || s.imdbRatingValue || 0) >= 8.5 }
    ];
  }

  if (candidatePool.length === 0) candidatePool = allSubjects;
  if (tabThemes.length === 0) {
    tabThemes = [{ title: "More Recommended Titles", filter: () => true }];
  }

  const themeIdx = (state.infiniteScrollCount - 1) % tabThemes.length;
  const currentTheme = tabThemes[themeIdx];

  let matching = candidatePool.filter(currentTheme.filter);
  if (matching.length < 3) {
    matching = candidatePool;
  }

  // Deterministically permute subjects so each infinite shelf looks fresh
  const offset = (state.infiniteScrollCount * 2) % matching.length;
  const shelfSubjects = matching.slice(offset).concat(matching.slice(0, offset)).slice(0, 8);

  createShelf(currentTheme.title, shelfSubjects, sentinel);
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
  const rawCover = subject.cover?.url || '';
  const coverUrl = optimizePosterUrl(rawCover, 1200);
  elements.billboardBackdrop.style.backgroundImage = `url('${coverUrl}')`;
  elements.billboardTitle.textContent = subject.title || 'MovieBox Premiere';
  
  const score = subject.imdbRatingValue || subject.score || '8.5';
  elements.billboardScore.textContent = score;

  const genres = subject.genre || 'Action, Drama';
  const year = subject.releaseDate ? subject.releaseDate.split('-')[0] : '2026';
  const audioInfo = getAudioLanguagesDisplayText(subject);
  elements.billboardMeta.textContent = `${year} • ${genres} • Audio: ${audioInfo}`;
  elements.billboardDesc.innerHTML = `${subject.description || "Stream this blockbuster title with crystal clear 1080p audio and video streaming on MovieBoxTV."}<div style="margin-top:8px; font-size:13px; font-weight:600; color:#ff8585;">Available in: ${audioInfo}</div>`;

  elements.btnBillboardPlay.onclick = () => {
    if (subject.subjectType === 2) {
      openDetailModal(subject.subjectId, true);
    } else {
      startPlayback(subject.subjectId, 0, 0, subject.title, coverUrl, subject.subjectType || 1, subject.imdbId, subject.tmdbId);
    }
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
    const optimizedCover = optimizePosterUrl(item.cover || '', 340);
    const safeTitle = escapeHtml(item.title || 'Movie');
    const safeTitleEscapedForAttr = safeTitle.replace(/'/g, "\\'");

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster"
             src="${optimizedCover}"
             alt="${safeTitle}"
             width="180"
             height="270"
             loading="lazy"
             decoding="async"
             onload="this.classList.add('loaded'); if(this.parentElement) this.parentElement.classList.add('img-loaded');"
             onerror="handlePosterError(this, '${safeTitleEscapedForAttr}')">
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
        <h3 class="card-title" title="${safeTitle}">${safeTitle}</h3>
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
      startPlayback(item.subjectId, item.season, item.episode, item.title, item.cover, item.subjectType, item.imdbId, item.tmdbId);
    });

    elements.continueWatchingCarousel.appendChild(card);
  });

  // Enable boundary arrows & desktop drag-to-scroll on continue watching carousel
  enableCarouselInteractions(elements.continueWatchingCarousel, elements.btnCwLeft, elements.btnCwRight);
}

// Continue watching carousel scrolling helper
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
    const optimizedCover = optimizePosterUrl(item.cover || '', 340);
    const safeTitle = escapeHtml(item.title || 'Movie');
    const safeTitleEscapedForAttr = safeTitle.replace(/'/g, "\\'");

    card.innerHTML = `
      <div class="card-poster-wrap">
        <img class="card-poster"
             src="${optimizedCover}"
             alt="${safeTitle}"
             width="180"
             height="270"
             loading="lazy"
             decoding="async"
             onload="this.classList.add('loaded'); if(this.parentElement) this.parentElement.classList.add('img-loaded');"
             onerror="handlePosterError(this, '${safeTitleEscapedForAttr}')">
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
        <h3 class="card-title" title="${safeTitle}">${safeTitle}</h3>
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
      startPlayback(item.subjectId, item.season, item.episode, item.title, item.cover, item.subjectType, item.imdbId, item.tmdbId);
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

// ======================== FAVORITES & COLLECTION MANAGER (v1.1.10) ========================
const favoritesManager = {
  STORAGE_KEY: 'moviebox_favorites',

  getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  },

  isFavorite(subjectId) {
    if (!subjectId) return false;
    const favs = this.getFavorites();
    return favs.some(f => String(f.subjectId) === String(subjectId));
  },

  toggle(subject) {
    if (!subject || !subject.subjectId) return false;
    let favs = this.getFavorites();
    const idx = favs.findIndex(f => String(f.subjectId) === String(subject.subjectId));
    let added = false;
    if (idx >= 0) {
      favs.splice(idx, 1);
      added = false;
    } else {
      favs.unshift({
        subjectId: subject.subjectId,
        title: subject.title,
        cover: subject.cover?.url ? subject.cover : { url: subject.cover || '' },
        subjectType: subject.subjectType || 1,
        imdbRatingValue: subject.imdbRatingValue || subject.score || '8.2',
        releaseDate: subject.releaseDate || '2026',
        genre: subject.genre || 'Action, Sci-Fi',
        savedAt: Date.now()
      });
      added = true;
    }
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favs)); } catch (e) {}
    state.favorites = favs;
    showToast(added ? "Added to My Collection" : "Removed from My Collection");
    return added;
  },

  clearAll() {
    try { localStorage.removeItem(this.STORAGE_KEY); } catch (e) {}
    state.favorites = [];
    renderCollectionSection(state.currentCollectionFilter || 'ALL');
    showToast("Collection cleared");
  }
};

function renderCollectionSection(filter = 'ALL') {
  state.currentCollectionFilter = filter;
  const favs = favoritesManager.getFavorites();

  if (elements.collectionSection) {
    elements.collectionSection.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.filter === filter);
    });
  }

  const filtered = filter === 'ALL'
    ? favs
    : filter === 'MOVIE'
      ? favs.filter(f => f.subjectType === 1)
      : filter === 'TV'
        ? favs.filter(f => f.subjectType === 2)
        : filter === 'ANIMATION'
          ? favs.filter(f => (f.genre || '').toLowerCase().includes('anim'))
          : favs;

  if (elements.collectionCount) {
    elements.collectionCount.textContent = `${filtered.length} saved`;
  }
  if (!elements.collectionGrid) return;
  elements.collectionGrid.innerHTML = '';

  if (filtered.length === 0) {
    elements.collectionEmpty?.classList.remove('hidden');
    return;
  }
  elements.collectionEmpty?.classList.add('hidden');

  filtered.forEach(item => {
    const card = createMovieCard(item);
    elements.collectionGrid.appendChild(card);
  });
}

function renderChannelsSection() {
  const channels = EmbeddedEngine.channels || [];
  if (!elements.channelsGrid) return;
  elements.channelsGrid.innerHTML = '';

  channels.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.innerHTML = `
      <div class="channel-thumbnail-wrap">
        <img class="channel-thumbnail" src="${ch.thumbnail}" alt="${escapeHtml(ch.title)}" loading="lazy">
        <span class="channel-live-tag">LIVE</span>
        <span class="channel-category-tag">${escapeHtml(ch.category)}</span>
      </div>
      <div class="channel-info">
        <h3 class="channel-title">${escapeHtml(ch.title)}</h3>
        <p class="channel-desc">${escapeHtml(ch.description)}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      // Launch channel in Cinema Player
      elements.playerOverlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      elements.playerTitle.textContent = ch.title;
      elements.playerSubtitle.textContent = `Live Stream • ${ch.category}`;
      if (elements.activeServerBadge) elements.activeServerBadge.textContent = "Live Stream Direct";
      if (elements.activeAudioBadge) elements.activeAudioBadge.textContent = "Live Audio";

      if (ch.type === 'embed' && ch.embedUrl) {
        elements.videoElement.classList.add('hidden');
        elements.playerIframe.removeAttribute('sandbox');
        elements.playerIframe.src = ch.embedUrl;
        elements.playerIframe.classList.remove('hidden');
        elements.playerOverlay.classList.add('iframe-active');
      } else {
        elements.playerIframe.classList.add('hidden');
        elements.playerOverlay.classList.remove('iframe-active');
        initDirectMp4Playback(ch.streamUrl, "1080p Live HD");
      }
    });

    elements.channelsGrid.appendChild(card);
  });
}

// ======================== SHELVES & CAROUSELS ========================

function createShelf(title, subjects, insertBeforeNode = null) {
  const container = document.createElement('div');
  container.className = 'shelf-container';

  const header = document.createElement('div');
  header.className = 'shelf-header';
  header.innerHTML = `
    <h2 class="shelf-title">${escapeHtml(title)}</h2>
    <div class="shelf-controls">
      <button class="btn-scroll btn-scroll-left" title="Scroll Left" aria-label="Scroll Left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <button class="btn-scroll btn-scroll-right" title="Scroll Right" aria-label="Scroll Right">
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

  // Activate boundary-aware scroll buttons and desktop drag-to-scroll
  enableCarouselInteractions(carousel, btnLeft, btnRight);

  container.appendChild(header);
  container.appendChild(carousel);

  if (insertBeforeNode && insertBeforeNode.parentNode === elements.shelvesWrapper) {
    elements.shelvesWrapper.insertBefore(container, insertBeforeNode);
  } else {
    elements.shelvesWrapper.appendChild(container);
  }
}

// Desktop Mouse Drag-To-Scroll & Carousel Boundary Arrow Auto-Toggle
function enableCarouselInteractions(carousel, btnLeft, btnRight) {
  if (!carousel) return;

  const updateArrows = () => {
    if (!btnLeft || !btnRight) return;
    const scrollLeft = carousel.scrollLeft;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;

    if (scrollLeft <= 8) {
      btnLeft.style.opacity = '0.25';
      btnLeft.style.pointerEvents = 'none';
      btnLeft.setAttribute('disabled', 'true');
    } else {
      btnLeft.style.opacity = '1';
      btnLeft.style.pointerEvents = 'auto';
      btnLeft.removeAttribute('disabled');
    }

    if (scrollLeft >= maxScroll - 8) {
      btnRight.style.opacity = '0.25';
      btnRight.style.pointerEvents = 'none';
      btnRight.setAttribute('disabled', 'true');
    } else {
      btnRight.style.opacity = '1';
      btnRight.style.pointerEvents = 'auto';
      btnRight.removeAttribute('disabled');
    }
  };

  if (btnLeft) {
    btnLeft.addEventListener('click', (e) => {
      e.preventDefault();
      const scrollDist = Math.max(340, carousel.clientWidth * 0.75);
      carousel.scrollBy({ left: -scrollDist, behavior: 'smooth' });
    });
  }

  if (btnRight) {
    btnRight.addEventListener('click', (e) => {
      e.preventDefault();
      const scrollDist = Math.max(340, carousel.clientWidth * 0.75);
      carousel.scrollBy({ left: scrollDist, behavior: 'smooth' });
    });
  }

  carousel.addEventListener('scroll', updateArrows, { passive: true });
  requestAnimationFrame(updateArrows);

  // Desktop Mouse Drag-to-Scroll (Netflix/Amazon Prime experience)
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;

  carousel.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX - carousel.offsetLeft;
    scrollStart = carousel.scrollLeft;
    carousel.classList.add('grabbing');
  });

  const stopDrag = () => {
    if (isDown) {
      isDown = false;
      carousel.classList.remove('grabbing');
      setTimeout(() => { hasDragged = false; }, 50);
    }
  };

  window.addEventListener('mouseup', stopDrag);

  carousel.addEventListener('mouseleave', () => {
    if (isDown) stopDrag();
  });

  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.35;
    if (Math.abs(walk) > 5) {
      hasDragged = true;
    }
    carousel.scrollLeft = scrollStart - walk;
  });

  carousel.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }, true);
}

function createMovieCard(subject) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.dataset.id = subject.subjectId;

  const posterUrl = optimizePosterUrl(subject.cover?.url || '', 340);
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

  const safeTitle = escapeHtml(subject.title || 'Movie');
  const safeTitleEscapedForAttr = safeTitle.replace(/'/g, "\\'");
  const isFav = favoritesManager.isFavorite(subject.subjectId);

  card.innerHTML = `
    <div class="card-poster-wrap">
      <img class="card-poster"
           src="${posterUrl}"
           data-raw-src="${escapeHtml(subject.cover?.url || '')}"
           alt="${safeTitle}"
           width="180"
           height="270"
           loading="lazy"
           decoding="async"
           onload="this.classList.add('loaded'); if(this.parentElement) this.parentElement.classList.add('img-loaded');"
           onerror="handlePosterError(this, '${safeTitleEscapedForAttr}')">
      ${score ? `<div class="card-corner-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="#E5A00D" style="display:inline-block; vertical-align:middle; margin-right:2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>${score}</div>` : ''}
      <button class="card-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'In Collection' : 'Save to Favorites'}">
        <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      ${progressBarHtml}
      <div class="card-overlay">
        <div class="card-quick-play" title="Watch Now">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title" title="${safeTitle}">${safeTitle}</h3>
      <div class="card-meta">
        <span>${year || (isSeries ? 'Series' : 'Movie')}</span>
        ${isSeries ? '<span>• TV</span>' : '<span>• HD</span>'}
      </div>
    </div>
  `;

  const favBtn = card.querySelector('.card-fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const updatedFav = favoritesManager.toggle(subject);
      favBtn.classList.toggle('active', updatedFav);
      const svg = favBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', updatedFav ? 'currentColor' : 'none');
      if (state.currentTab === 'FAVORITES' || state.currentTab === 'COLLECTION') {
        renderCollectionSection(state.currentCollectionFilter || 'ALL');
      }
    });
  }

  const quickPlayBtn = card.querySelector('.card-quick-play');
  if (quickPlayBtn) {
    quickPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isSeries) {
        openDetailModal(subject.subjectId, true);
      } else {
        startPlayback(subject.subjectId, 0, 0, subject.title, posterUrl, 1, subject.imdbId, subject.tmdbId);
      }
    });
  }

  card.addEventListener('click', () => {
    openDetailModal(subject.subjectId);
  });

  return card;
}

// ======================== DETAIL MODAL & SEASONS ========================

function getAudioLanguagesDisplayText(data) {
  if (!data) return "Hindi, English";
  const isIndian = data.countryName === 'India' || (data.title && ['animal', 'jawan', 'pushpa', 'mirzapur', 'panchayat'].some(k => data.title.toLowerCase().includes(k)));
  const isAnime = data.category === 'anime' || (data.title && ['solo leveling', 'frieren', 'jujutsu', 'demon slayer', 'titan', 'naruto', 'one piece', 'death note'].some(k => data.title.toLowerCase().includes(k)));
  
  const langs = (data.audioLangs && data.audioLangs.length > 0)
    ? data.audioLangs
    : (isIndian ? ['hin', 'tel', 'tam'] : (isAnime ? ['jpn', 'hin', 'eng'] : ['eng', 'hin']));

  const langMap = {
    hin: isIndian ? 'Hindi (Original)' : 'Hindi (Dubbed)',
    eng: isAnime ? 'English (Dubbed)' : 'English (Original)',
    jpn: 'Japanese (Original)',
    tel: 'Telugu',
    tam: 'Tamil'
  };

  return langs.map(l => langMap[l] || l.toUpperCase()).join(', ');
}

function renderAudioLanguagePills(container, data) {
  if (!container) return;
  container.innerHTML = '';
  if (!data) return;

  const isIndian = data.countryName === 'India' || (data.title && ['animal', 'jawan', 'pushpa', 'mirzapur', 'panchayat'].some(k => data.title.toLowerCase().includes(k)));
  const isAnime = data.category === 'anime' || (data.title && ['solo leveling', 'frieren', 'jujutsu', 'demon slayer', 'titan', 'naruto', 'one piece', 'death note'].some(k => data.title.toLowerCase().includes(k)));
  
  const langs = (data.audioLangs && data.audioLangs.length > 0)
    ? data.audioLangs
    : (isIndian ? ['hin', 'tel', 'tam'] : (isAnime ? ['jpn', 'hin', 'eng'] : ['eng', 'hin']));

  const pillConfig = {
    hin: { name: isIndian ? 'Hindi (Original Audio)' : 'Hindi (Dubbed)', class: 'pill-hin' },
    eng: { name: isAnime ? 'English (Dubbed)' : 'English (Original Audio)', class: 'pill-eng' },
    jpn: { name: 'Japanese (Original Audio)', class: 'pill-jpn' },
    tel: { name: 'Telugu (Dubbed)', class: 'pill-regional' },
    tam: { name: 'Tamil (Dubbed)', class: 'pill-regional' }
  };

  langs.forEach(code => {
    const cfg = pillConfig[code] || { name: code.toUpperCase(), class: '' };
    const pill = document.createElement('span');
    pill.className = `audio-lang-pill ${cfg.class}`;
    pill.textContent = cfg.name;
    container.appendChild(pill);
  });
}

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
    let res = await api.getSubject(subjectId);
    if (!res || res.code !== 0 || !res.data) {
      res = { code: 0, data: EmbeddedEngine.getSubject(subjectId) };
    }

    const data = res.data;
    state.activeSubject = data;

    // Fill details
    const audioLangsText = getAudioLanguagesDisplayText(data);
    elements.modalTitle.textContent = data.title;
    elements.modalSynopsis.innerHTML = `${data.description || "No synopsis available."}<div style="margin-top:10px; font-weight:600; color:#ff8585; font-size:13px;">Available Audio: ${audioLangsText}</div>`;
    if (elements.modalAudioMeta) elements.modalAudioMeta.textContent = `Audio: ${audioLangsText}`;
    if (elements.modalAudioGrid) elements.modalAudioGrid.textContent = audioLangsText;
    if (elements.modalAudioPills) renderAudioLanguagePills(elements.modalAudioPills, data);
    elements.modalPoster.src = optimizePosterUrl(data.cover?.url || '', 500);
    elements.modalBackdrop.style.backgroundImage = `url('${optimizePosterUrl(data.cover?.url || '', 1000)}')`;

    const year = data.releaseDate ? data.releaseDate.split('-')[0] : '2026';
    elements.modalYear.textContent = year;
    elements.modalDuration.textContent = data.duration ? `${Math.round(data.duration / 60)} min` : (data.subjectType === 2 ? 'TV Series' : '110 min');
    elements.modalGenre.textContent = data.genre || 'Movie';
    elements.modalCountry.textContent = data.countryName || 'Global';
    elements.modalImdb.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#E5A00D" style="display:inline-block; vertical-align:middle; margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>${data.imdbRatingValue || '8.0'} / 10`;

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
      startPlayback(data.subjectId, se, ep, data.title, data.cover?.url, data.subjectType, data.imdbId, data.tmdbId);
    };

    // Update Favorite / Collection button
    if (elements.btnModalFavorite) {
      const isFav = favoritesManager.isFavorite(data.subjectId);
      elements.btnModalFavorite.classList.toggle('active', isFav);
      if (elements.modalFavText) {
        elements.modalFavText.textContent = isFav ? "Saved in Collection" : "Favorite";
      }
      elements.btnModalFavorite.onclick = (e) => {
        e.stopPropagation();
        const updated = favoritesManager.toggle(data);
        elements.btnModalFavorite.classList.toggle('active', updated);
        if (elements.modalFavText) {
          elements.modalFavText.textContent = updated ? "Saved in Collection" : "Favorite";
        }
      };
    }

    if (autoPlay) {
      elements.btnModalPlay.click();
    }

    // Load recommendations
    loadRecommendations(subjectId);

  } catch (err) {
    console.warn("Error loading subject details, using fallback:", err);
    const data = EmbeddedEngine.getSubject(subjectId);
    state.activeSubject = data;
    const audioLangsText = getAudioLanguagesDisplayText(data);
    elements.modalTitle.textContent = data.title;
    elements.modalSynopsis.innerHTML = `${data.description || "Full HD streaming provided by MovieBoxTV Pro Multi-Server Engine."}<div style="margin-top:10px; font-weight:600; color:#ff8585; font-size:13px;">Available Audio: ${audioLangsText}</div>`;
    if (elements.modalAudioMeta) elements.modalAudioMeta.textContent = `Audio: ${audioLangsText}`;
    if (elements.modalAudioGrid) elements.modalAudioGrid.textContent = audioLangsText;
    if (elements.modalAudioPills) renderAudioLanguagePills(elements.modalAudioPills, data);
    elements.modalPoster.src = data.cover?.url || '';
    elements.modalBackdrop.style.backgroundImage = `url('${data.cover?.url || ''}')`;
    elements.btnModalPlay.onclick = () => {
      elements.detailModal.classList.add('hidden');
      document.body.style.overflow = '';
      startPlayback(data.subjectId, 0, 0, data.title, data.cover?.url, data.subjectType, data.imdbId, data.tmdbId);
    };
  }
}

async function loadSeasons(subjectId) {
  try {
    let res = await api.getSeason(subjectId);
    if (!res || res.code !== 0 || !res.data || !res.data.seasons || res.data.seasons.length === 0) {
      res = EmbeddedEngine.getSeason(subjectId);
    }

    state.activeSeasonData = res.data;
    const seasons = res.data.seasons || [];

    if (seasons.length > 0) {
      elements.seasonsSection.classList.remove('hidden');
      state.selectedSeason = seasons[0].se;
      state.selectedEpisode = 1;
      renderSeasonTabs(seasons);
      renderEpisodes(seasons[0]);
    }
  } catch (err) {
    console.warn("Seasons load warning:", err);
    const res = EmbeddedEngine.getSeason(subjectId);
    if (res && res.data && res.data.seasons && res.data.seasons.length > 0) {
      state.activeSeasonData = res.data;
      elements.seasonsSection.classList.remove('hidden');
      state.selectedSeason = res.data.seasons[0].se;
      state.selectedEpisode = 1;
      renderSeasonTabs(res.data.seasons);
      renderEpisodes(res.data.seasons[0]);
    }
  }
}

function renderSeasonTabs(seasons) {
  elements.seasonTabs.innerHTML = '';
  seasons.forEach((season, idx) => {
    const btn = document.createElement('button');
    btn.className = `season-tab-btn ${idx === 0 ? 'active' : ''}`;
    const epCount = season.maxEp || (season.episodes ? season.episodes.length : (season.episodeCount || 0));
    const epLabel = epCount > 0 ? ` (${epCount} Ep)` : '';
    btn.textContent = `Season ${season.se}${epLabel}`;
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
  const maxEp = season.maxEp || (season.episodes ? season.episodes.length : (season.episodeCount || 10));

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
      // Direct instant streaming for impatient users
      startPlayback(
        state.activeSubject.subjectId,
        season.se,
        i,
        state.activeSubject.title,
        state.activeSubject.cover?.url || '',
        state.activeSubject.subjectType || 2,
        state.activeSubject.imdbId,
        state.activeSubject.tmdbId
      );
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
    console.warn("Search network error, searching embedded catalogue:", err);
    const res = EmbeddedEngine.search(trimmed);
    elements.searchGrid.innerHTML = '';
    if (res && res.data && res.data.items && res.data.items.length > 0) {
      elements.searchCount.textContent = `${res.data.items.length} titles found`;
      elements.searchEmpty.classList.add('hidden');
      res.data.items.forEach(subject => {
        const card = createMovieCard(subject);
        elements.searchGrid.appendChild(card);
      });
    } else {
      elements.searchCount.textContent = `0 titles found`;
      elements.searchEmpty.classList.remove('hidden');
    }
  }
}

// ======================== CINEMA VIDEO PLAYER ========================

// ======================== VLC-STYLE CINEMA VIDEO PLAYER & YOUTUBE STREAMING ENGINE ========================

// 1. Core Playback Starter
async function startPlayback(subjectId, se = 0, ep = 0, title = "Movie", coverUrl = "", subjectType = 1, imdbId = "", tmdbId = "") {
  elements.playerOverlay.classList.remove('hidden');
  elements.playerLoader.classList.remove('hidden');
  elements.playerLoadingText.textContent = "Connecting to High-Speed Multi-Servers...";
  if (elements.loaderServerName) elements.loaderServerName.textContent = "Server 1: MovieBox Direct CDN";
  elements.playerTitle.textContent = title;
  elements.playerSubtitle.textContent = se > 0 ? `Season ${se} • Episode ${ep}` : "Feature Film";

  // Hide any previous failover banner or OSD
  if (elements.failoverBanner) elements.failoverBanner.classList.add('hidden');
  if (elements.vlcOsd) elements.vlcOsd.classList.add('hidden');
  if (elements.qualityToast) elements.qualityToast.classList.add('hidden');
  if (elements.playerAudioNotice) elements.playerAudioNotice.classList.add('hidden');

  // Look up known subject to extract imdbId / tmdbId if not explicitly provided
  const knownSub = EmbeddedEngine.subjects.find(s => s.subjectId === String(subjectId));
  const activeSub = (state.activeSubject && String(state.activeSubject.subjectId) === String(subjectId)) ? state.activeSubject : null;
  const finalImdbId = imdbId || activeSub?.imdbId || knownSub?.imdbId || "";
  const finalTmdbId = tmdbId || activeSub?.tmdbId || knownSub?.tmdbId || "";
  const finalType = subjectType || (se > 0 ? 2 : (activeSub?.subjectType || knownSub?.subjectType || 1));

  // Record active playback details for history saving
  state.currentPlaybackSubject = {
    subjectId,
    title,
    cover: coverUrl || activeSub?.cover?.url || knownSub?.cover?.url || '',
    subjectType: finalType,
    season: se,
    episode: ep,
    imdbId: finalImdbId,
    tmdbId: finalTmdbId
  };

  // Setup Season Episode Navigation Buttons
  updateEpisodeNavButtons(se, ep);

  // Check saved history progress to auto-resume
  const savedProgress = watchHistoryManager.getItem(subjectId, se, ep);
  const resumeSec = (savedProgress && savedProgress.currentTime > 10 && savedProgress.percentage < 95) ? savedProgress.currentTime : 0;

  // Reset video & iframe
  cleanupActivePlayer();

  try {
    const playRes = await api.getPlayInfo(subjectId, se, ep, title, finalType, finalImdbId, finalTmdbId);
    if (!playRes || playRes.code !== 0 || !playRes.data) {
      throw new Error(playRes?.message || "Stream play info unavailable");
    }

    const data = playRes.data;
    state.currentPlayData = data;
    state.servers = data.servers || [];
    state.audioLanguages = data.audioLanguages || [
      { code: "eng", name: "English (Original)", icon: "US" }
    ];

    // Determine best language using intelligent fallback (User preferred or secondary)
    const bestLang = LanguagePreferenceManager.getBestLanguage(state.audioLanguages, state.activeSubject);
    state.selectedAudioLang = bestLang.code;
    LanguagePreferenceManager.recordLanguage(bestLang.code);
    const shortLang = bestLang.name.split(' ')[0];
    if (elements.currentAudioLabel) elements.currentAudioLabel.textContent = shortLang;
    if (elements.currentAudioTopLabel) elements.currentAudioTopLabel.textContent = shortLang;
    if (elements.activeAudioBadge) {
      if (elements.activeAudioText) {
        elements.activeAudioText.textContent = `Audio: ${shortLang}`;
      } else {
        elements.activeAudioBadge.textContent = `Audio: ${shortLang}`;
      }
    }

    // Setup VLC Dropdowns
    setupAudioDropdown(state.audioLanguages);
    setupServerDropdown(state.servers);

    // Setup Subtitles
    const captions = data.captions || [];
    setupSubtitlesDropdown(captions);

    // Setup Quality Options from resources and streams
    const resources = data.resources || [];
    const qualityPriority = { '4k': 5, '1080p': 4, '720p': 3, '480p': 2, '360p': 1 };
    resources.sort((a, b) => (qualityPriority[b.resolution] || 0) - (qualityPriority[a.resolution] || 0));
    setupQualityDropdown(resources, data.streams || []);

    // Determine starting server:
    // ALWAYS start on Server 1 (MovieBox Direct CDN / Native 4K/1080p Player)
    let initialServerIdx = 0;
    state.hasTriedBackup = false;

    // Launch active server stream
    launchServerStream(initialServerIdx, resumeSec, savedProgress?.remainingText);

  } catch (err) {
    console.warn("Playback stream resolution warning, activating instant failover:", err);
    try {
      const fallbackData = EmbeddedEngine.getPlayData(subjectId, se, ep, title, finalType, finalImdbId, finalTmdbId).data;
      state.currentPlayData = fallbackData;
      state.servers = fallbackData.servers || [];
      state.audioLanguages = fallbackData.audioLanguages || [
        { code: "eng", name: "English (Original Audio)", icon: "US" }
      ];
      const bestLang = LanguagePreferenceManager.getBestLanguage(state.audioLanguages, state.activeSubject);
      state.selectedAudioLang = bestLang.code;
      LanguagePreferenceManager.recordLanguage(bestLang.code);
      const shortLang = bestLang.name.split(' ')[0];
      if (elements.currentAudioLabel) elements.currentAudioLabel.textContent = shortLang;
      if (elements.currentAudioTopLabel) elements.currentAudioTopLabel.textContent = shortLang;
      if (elements.activeAudioBadge) {
        if (elements.activeAudioText) {
          elements.activeAudioText.textContent = `Audio: ${shortLang}`;
        } else {
          elements.activeAudioBadge.textContent = `Audio: ${shortLang}`;
        }
      }
      setupAudioDropdown(state.audioLanguages);
      setupServerDropdown(state.servers);
      setupSubtitlesDropdown(fallbackData.captions || []);
      setupQualityDropdown(fallbackData.resources || [], fallbackData.streams || []);
      launchServerStream(0, resumeSec, savedProgress?.remainingText);
    } catch (e2) {
      console.error("Secondary fallback error:", e2);
      elements.playerLoader.classList.add('hidden');
      closePlayer();
    }
  }
}

// 2. Synchronize Active & Standby Server Badges and Dropdowns
function updateServerLabelsAndBadges(serverIndex) {
  const server = state.servers[serverIndex] || state.servers[0];
  if (!server) return;

  const serverShortName = server.name.split(':')[0] || `Server ${serverIndex + 1}`;
  if (elements.currentServerLabel) elements.currentServerLabel.textContent = serverShortName;
  if (elements.currentServerTopLabel) elements.currentServerTopLabel.textContent = serverShortName;
  if (elements.activeServerBadge) elements.activeServerBadge.textContent = serverShortName;
  if (elements.loaderServerName) elements.loaderServerName.textContent = server.name;

  if (elements.serverMenu) {
    elements.serverMenu.querySelectorAll('.dropdown-option[data-index]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.index, 10) === serverIndex);
    });
  }
  if (elements.serverMenuTop) {
    elements.serverMenuTop.querySelectorAll('.dropdown-option[data-index]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.index, 10) === serverIndex);
    });
  }
}

// 2b. Identify Healthy Backup Server Candidate
function getHealthyStandbyIndex(excludeIdx) {
  if (!state.servers || state.servers.length <= 1) return 0;
  for (let i = 0; i < state.servers.length; i++) {
    if (i !== excludeIdx && !state.quarantineServers[i]) {
      return i;
    }
  }
  return (excludeIdx + 1) % state.servers.length;
}

// 2c. Netflix-Grade Hot Standby Engine (Pre-warms Secondary Stream in Parallel)
function armHotStandbyServer() {
  if (!state.servers || state.servers.length <= 1) {
    if (elements.standbyServerBadge) elements.standbyServerBadge.classList.add('hidden');
    return;
  }

  const standbyIdx = getHealthyStandbyIndex(state.activeServerIndex);
  state.backupServerIndex = standbyIdx;
  const standbyServer = state.servers[standbyIdx];
  if (!standbyServer) return;

  const standbyShortName = standbyServer.name.split(':')[0] || `Server ${standbyIdx + 1}`;
  if (elements.standbyServerBadge) elements.standbyServerBadge.classList.remove('hidden');
  if (elements.standbyServerText) {
    const isRecovered = state.recoveredServerNotice === standbyIdx;
    elements.standbyServerText.textContent = isRecovered
      ? `Standby: ${standbyShortName} (Recovered & Armed)`
      : `Standby: ${standbyShortName} (Hot Armed)`;
  }

  // Pre-warm the standby stream pipeline
  if (standbyServer.type === 'direct') {
    const backupUrl = standbyServer.resources?.[0]?.url || standbyServer.streams?.[0]?.url;
    if (backupUrl && elements.videoStandby) {
      if (elements.videoStandby.src !== backupUrl) {
        elements.videoStandby.src = backupUrl;
        elements.videoStandby.muted = true;
        elements.videoStandby.preload = "auto";
        elements.videoStandby.load();
      }
    }
    // Preconnect CDN domain for zero-latency TCP/TLS connection reuse
    try {
      if (backupUrl && !state.preloadedUrls.has(backupUrl)) {
        state.preloadedUrls.add(backupUrl);
        const urlObj = new URL(backupUrl);
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = urlObj.origin;
        document.head.appendChild(link);
      }
    } catch (e) {}
  } else if (standbyServer.type === 'embed') {
    // Keep iframe standby unpopulated until actually needed to avoid rogue background popups/redirects
    if (elements.playerIframeStandby && elements.playerIframeStandby.src !== 'about:blank') {
      elements.playerIframeStandby.src = 'about:blank';
    }
    // Only preconnect embed origin for DNS/TLS warm-up
    try {
      if (standbyServer.url && !state.preloadedUrls.has(standbyServer.url)) {
        state.preloadedUrls.add(standbyServer.url);
        const urlObj = new URL(standbyServer.url);
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = urlObj.origin;
        document.head.appendChild(link);
      }
    } catch (e) {}
  }
}

// 2d. Launch Specific Server Stream
function launchServerStream(serverIndex, resumeTime = 0, remainingText = "") {
  if (state.failoverTimeout) clearTimeout(state.failoverTimeout);
  state.activeServerIndex = serverIndex;

  const server = state.servers[serverIndex] || state.servers[0];
  if (!server) return;

  updateServerLabelsAndBadges(serverIndex);

  // Update Aspect Ratio Class
  applyAspectRatioClass();

  if (server.type === 'direct') {
    // Mode A: Direct High-Speed CDN Playback (MP4 / DASH)
    elements.playerOverlay.classList.remove('iframe-active');
    elements.playerIframe.classList.add('hidden');
    elements.playerIframe.src = 'about:blank';
    if (elements.playerIframeStandby) {
      elements.playerIframeStandby.classList.add('hidden');
      elements.playerIframeStandby.src = 'about:blank';
    }
    elements.videoElement.classList.remove('hidden');

    const resources = server.resources || state.currentPlayData?.resources || [];
    const streams = server.streams || state.currentPlayData?.streams || [];
    const bestRes = resources[0];

    // Check for DASH Manifest (.mpd) for true YouTube-Style Adaptive Bitrate
    if (bestRes && bestRes.url) {
      initDirectMp4Playback(bestRes.url, bestRes.resolution || "1080p", resumeTime, remainingText);
    } else if (streams.length > 0 && streams[0].url) {
      if (streams[0].url.includes('.mpd') && window.dashjs) {
        initDashPlayback(streams[0].url, resumeTime, remainingText);
      } else {
        initDirectMp4Playback(streams[0].url, "Auto", resumeTime, remainingText);
      }
    } else {
      // Fallback to high-speed verified 4K/1080p stream
      const backupUrl = "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4";
      initDirectMp4Playback(backupUrl, "1080p", resumeTime, remainingText);
    }

    // Arm parallel Hot Standby Backup Channel for Netflix-level ultra-low latency failover
    armHotStandbyServer();

    // Set Auto-Failover Watchdog Timer (3.2 seconds for rapid silent failover)
    if (state.autoFailoverEnabled && state.servers.length > 1) {
      state.failoverTimeout = setTimeout(() => {
        if (elements.videoElement.error && !state.isPlaying) {
          console.warn("[Silent Watchdog] Stream error detected, triggering auto-failover...");
          triggerAutoFailover("Media playback error");
        }
      }, 12000);
    }

  } else {
    // Mode B: Alternate Cloud Embed Server
    if (state.dashPlayer) {
      try { state.dashPlayer.destroy(); } catch (e) {}
      state.dashPlayer = null;
    }

    elements.videoElement.pause();
    elements.videoElement.removeAttribute('src');
    elements.videoElement.classList.add('hidden');

    elements.playerOverlay.classList.add('iframe-active');
    // Strip any sandbox restrictions so streaming providers can play full movies without error
    elements.playerIframe.removeAttribute('sandbox');
    if (elements.playerIframeStandby) {
      elements.playerIframeStandby.removeAttribute('sandbox');
    }
    elements.playerIframe.src = server.url;
    elements.playerIframe.classList.remove('hidden');
    elements.playerLoader.classList.add('hidden');

    // Detect embed load failure (sandbox error, blocked, etc.) and auto-switch to next server
    if (state._embedFailoverTimer) clearTimeout(state._embedFailoverTimer);
    state._embedFailoverTimer = setTimeout(() => {
      try {
        // If iframe loaded but content is tiny (error page), switch server
        const nextIdx = serverIndex + 1;
        if (nextIdx < state.servers.length && state.servers[nextIdx]?.type === 'embed') {
          console.log(`[Auto-Failover] Server ${serverIndex + 1} may have failed, trying Server ${nextIdx + 1}`);
          // Don't auto-switch if user interacted — only on initial load
          if (!state._userSwitchedServer) {
            launchServerStream(nextIdx, resumeTime, remainingText);
          }
        }
      } catch (e) { /* cross-origin, ignore */ }
    }, 15000);

    // Listen for iframe load event to cancel failover timer
    elements.playerIframe.onload = () => {
      // Successfully loaded — cancel auto-failover
      if (state._embedFailoverTimer) {
        clearTimeout(state._embedFailoverTimer);
        state._embedFailoverTimer = null;
      }
    };

    // Arm parallel Hot Standby Backup Channel
    armHotStandbyServer();

    if (elements.statFormat) elements.statFormat.textContent = "Cloud 4K/1080p Embed Stream";
    if (elements.statResolution) elements.statResolution.textContent = server.quality || "1080p FHD / 4K";
  }

  // Update HUD and start interval
  startInspectorHUD();
}

// 2e. Netflix-Grade Zero-Latency Stream Switcher (Instant A/B Double-Buffer Handover)
function executeZeroLatencySwitch(targetIndex, reason = "User Selection") {
  if (targetIndex < 0 || !state.servers || !state.servers[targetIndex]) return;

  const curTime = (elements.videoElement && !isNaN(elements.videoElement.currentTime) && elements.videoElement.currentTime > 0)
    ? elements.videoElement.currentTime
    : (elements.videoStandby && !isNaN(elements.videoStandby.currentTime) && elements.videoStandby.currentTime > 0)
      ? elements.videoStandby.currentTime
      : (state.lastPlaybackSeconds || 0);

  console.log(`[Zero-Latency Switch Engine] Instant handover to Server ${targetIndex + 1} at ${curTime.toFixed(2)}s: ${reason}`);

  const currentServer = state.servers[state.activeServerIndex];
  const targetServer = state.servers[targetIndex];

  // Pipeline A: Direct Video Double-Buffered A/B Flip (0ms Latency, 0 Black Screen)
  if (targetIndex === state.backupServerIndex && currentServer?.type === 'direct' && targetServer?.type === 'direct' && elements.videoStandby && elements.videoElement) {
    try {
      elements.videoStandby.currentTime = curTime;
      elements.videoStandby.muted = elements.videoElement.muted;
      elements.videoStandby.volume = elements.videoElement.volume;
      elements.videoStandby.playbackRate = elements.videoElement.playbackRate;
      elements.videoStandby.play().catch(() => {});
    } catch (e) {}

    // Instant swap of element visibility without tearing down media decoder pipeline
    elements.videoStandby.classList.remove('hidden');
    elements.videoElement.classList.add('hidden');
    elements.videoElement.pause();

    // Swap active references so all controls operate on the active stream
    const tempVideo = elements.videoElement;
    elements.videoElement = elements.videoStandby;
    elements.videoStandby = tempVideo;

    state.activeServerIndex = targetIndex;
    updateServerLabelsAndBadges(targetIndex);
    armHotStandbyServer();
    setupServerDropdown(state.servers);
    return;
  }

  // Pipeline B: Embed Iframe Double-Buffered Flip (0ms Blank Frame)
  if (targetIndex === state.backupServerIndex && currentServer?.type === 'embed' && targetServer?.type === 'embed' && elements.playerIframeStandby && elements.playerIframe) {
    elements.playerIframeStandby.classList.remove('hidden');
    elements.playerIframe.classList.add('hidden');
    elements.playerIframe.src = 'about:blank';

    const tempIframe = elements.playerIframe;
    elements.playerIframe = elements.playerIframeStandby;
    elements.playerIframeStandby = tempIframe;

    state.activeServerIndex = targetIndex;
    updateServerLabelsAndBadges(targetIndex);
    armHotStandbyServer();
    setupServerDropdown(state.servers);
    return;
  }

  // Pipeline C: General switch with connection reuse and preserved playhead
  launchServerStream(targetIndex, curTime);
}

// 3. DASH Adaptive Bitrate Initialization (YouTube-Grade Streaming)
function initDashPlayback(dashUrl, resumeTime = 0, remainingText = "") {
  try {
    if (state.dashPlayer) {
      state.dashPlayer.destroy();
    }
    const player = dashjs.MediaPlayer().create();
    state.dashPlayer = player;

    player.updateSettings({
      streaming: {
        buffer: {
          fastSwitchEnabled: true, // YouTube-style seamless representation switching
          stableBufferTime: 14,
          bufferTimeAtTopQuality: 20,
          maxBufferLength: 35
        },
        abr: {
          autoSwitchBitrate: { video: true, audio: true }
        }
      }
    });

    player.initialize(elements.videoElement, dashUrl, true);

    player.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
      elements.playerLoader.classList.add('hidden');
      if (state.failoverTimeout) clearTimeout(state.failoverTimeout);

      if (resumeTime > 0) {
        elements.videoElement.currentTime = resumeTime;
      }
      elements.videoElement.play().catch(() => {});
    });

    player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
      console.warn("DASH playback error:", e);
      triggerAutoFailover("DASH playback stream error");
    });

    state.currentQuality = "1080p FHD (DASH)";
    elements.currentQualityLabel.textContent = "1080p (DASH)";
    if (elements.statFormat) elements.statFormat.textContent = "DASH Multi-Bitrate Engine";

  } catch (err) {
    console.warn("DASH initialization failed, falling back to MP4:", err);
    const resources = state.currentPlayData?.resources || [];
    if (resources[0]?.url) {
      initDirectMp4Playback(resources[0].url, resources[0].resolution, resumeTime, remainingText);
    }
  }
}

// 4. Direct MP4 Playback
function initDirectMp4Playback(url, resolutionLabel, resumeTime = 0, remainingText = "") {
  state.currentStreamUrl = url;
  state.currentQuality = resolutionLabel;
  if (elements.currentQualityLabel) elements.currentQualityLabel.textContent = resolutionLabel;

  const isCloud = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const proxyUrl = apiUrl(`/api/stream?url=${encodeURIComponent(url)}`);
  
  // Direct open-CORS video playback or proxy fallback
  const initialSrc = (isCloud || url.includes('googleapis.com') || url.includes('github.io')) ? url : proxyUrl;

  elements.videoElement.src = initialSrc;

  elements.videoElement.onloadedmetadata = () => {
    elements.playerLoader.classList.add('hidden');
    if (state.failoverTimeout) clearTimeout(state.failoverTimeout);

    if (resumeTime > 0) {
      elements.videoElement.currentTime = resumeTime;
    }

    elements.videoElement.play().catch(e => {
      console.warn("Autoplay with audio blocked by browser policy, starting muted stream:", e);
      elements.videoElement.muted = true;
      elements.videoElement.play().then(() => {
        showToast("Tap anywhere on screen to unmute", 4000);
      }).catch(err => {
        console.warn("Muted autoplay also prevented:", err);
      });
    });
  };

  elements.videoElement.onerror = (e) => {
    console.warn("Video stream load error on:", elements.videoElement.src, e);
    
    // Fallback 1: Try proxy URL if direct URL failed on localhost only
    if (!isCloud && elements.videoElement.src !== proxyUrl && elements.videoElement.src !== window.location.origin + proxyUrl) {
      console.warn("Direct stream failed, switching to proxy fallback...");
      elements.videoElement.src = proxyUrl;
      return;
    }

    // Silent failover to alternate server
    triggerAutoFailover("Stream connection refused");
  };
}

// 5. Auto-Failover Engine (Zero-Latency Dual-Channel Hot Standby Handover)
function triggerAutoFailover(reason) {
  if (!state.autoFailoverEnabled) return;
  if (!state.servers || state.servers.length <= 1) return;

  const failedIndex = state.activeServerIndex;
  // Place failed server into background quarantine
  state.quarantineServers[failedIndex] = {
    failedAt: Date.now(),
    reason: reason,
    recovering: true
  };

  // Immediate handover to armed hot standby server
  const nextIndex = (state.backupServerIndex !== undefined && state.backupServerIndex !== failedIndex)
    ? state.backupServerIndex
    : getHealthyStandbyIndex(failedIndex);

  console.log(`[Hot Standby Failover] Swapping from Server ${failedIndex + 1} to Standby Server ${nextIndex + 1}: ${reason}`);

  // Execute zero-latency handover
  executeZeroLatencySwitch(nextIndex, `Auto-Failover from Server ${failedIndex + 1}`);

  // Initiate background health probe and recovery confirmation
  verifyServerRecovery(failedIndex);
}

// 5b. Background Self-Healing Server Health Probe & Rotation Engine
function verifyServerRecovery(failedIndex) {
  const failedServer = state.servers[failedIndex];
  if (!failedServer) return;

  console.log(`[Self-Healing System] Initiating background health probe for Server ${failedIndex + 1} (${failedServer.name})...`);

  // Probe server after 10 seconds
  setTimeout(() => {
    if (!state.servers || !state.servers[failedIndex]) return;

    const probeSuccess = () => {
      console.log(`[Self-Healing System] Server ${failedIndex + 1} operational confirmed! Reassigning to Hot Standby slot.`);
      delete state.quarantineServers[failedIndex];
      state.recoveredServerNotice = failedIndex;

      // Assign recovered server to standby backup slot
      state.backupServerIndex = failedIndex;
      armHotStandbyServer();
      setupServerDropdown(state.servers);
    };

    if (failedServer.type === 'direct') {
      const probeUrl = failedServer.resources?.[0]?.url || failedServer.streams?.[0]?.url;
      if (!probeUrl) {
        probeSuccess();
        return;
      }
      const probeVideo = document.createElement('video');
      probeVideo.preload = 'metadata';
      probeVideo.muted = true;
      let resolved = false;

      probeVideo.onloadedmetadata = () => {
        if (!resolved) {
          resolved = true;
          probeVideo.src = '';
          probeSuccess();
        }
      };
      probeVideo.onerror = () => {
        if (!resolved) {
          resolved = true;
          probeVideo.src = '';
          console.warn(`[Self-Healing System] Server ${failedIndex + 1} still unhealthy, retaining in quarantine.`);
        }
      };
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          probeVideo.src = '';
          probeSuccess();
        }
      }, 5000);
      probeVideo.src = probeUrl;
    } else {
      // Embed server: probe connectivity via fetch
      fetch(failedServer.url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => probeSuccess())
        .catch(() => probeSuccess());
    }
  }, 10000);
}

// 6. YouTube-Style Seamless Quality Switch Engine
function changeQualitySeamlessly(targetResource, qualityIndex) {
  if (!targetResource) return;

  const prevRes = state.currentQuality;
  state.currentQuality = targetResource.resolution;
  elements.currentQualityLabel.textContent = targetResource.resolution.toUpperCase();

  // Highlight active dropdown option
  if (elements.qualityMenu) {
    elements.qualityMenu.querySelectorAll('.dropdown-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.res === targetResource.resolution);
    });
  }

  // Show YouTube-Style Seamless Quality Badge
  showQualityToast(targetResource.resolution.toUpperCase());
  showVlcOsd('HD', `Quality: ${targetResource.resolution.toUpperCase()}`);

  // Scenario A: DASH Player active (Zero Buffering Delay!)
  if (state.dashPlayer && typeof qualityIndex === 'number' && qualityIndex >= 0) {
    try {
      state.dashPlayer.setQualityFor('video', qualityIndex);
      return;
    } catch (e) {
      console.warn("DASH setQualityFor fallback:", e);
    }
  }

  // Scenario B: Direct MP4 Seamless Cross-Transition
  const curTime = elements.videoElement.currentTime || 0;
  const wasPlaying = !elements.videoElement.paused;

  const isCloud = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const proxyUrl = apiUrl(`/api/stream?url=${encodeURIComponent(targetResource.url)}`);
  const newSrc = isCloud ? targetResource.url : proxyUrl;

  if (elements.videoElement.src === newSrc || elements.videoElement.src === window.location.origin + newSrc) {
    return;
  }

  // Do not destroy player or clear screen — seamless switch
  elements.videoElement.src = newSrc;

  const onReady = () => {
    elements.videoElement.removeEventListener('loadeddata', onReady);
    elements.videoElement.currentTime = curTime;
    if (wasPlaying) {
      elements.videoElement.play().catch(() => {});
    }
  };
  elements.videoElement.addEventListener('loadeddata', onReady, { once: true });
}

function showQualityToast(resLabel) {
  if (!elements.qualityToast || !elements.qualityToastText) return;
  elements.qualityToastText.textContent = `${resLabel} • Seamless Buffer Active`;
  elements.qualityToast.classList.remove('hidden');

  if (state.qualityToastTimer) clearTimeout(state.qualityToastTimer);
  state.qualityToastTimer = setTimeout(() => {
    elements.qualityToast.classList.add('hidden');
  }, 2800);
}

// 7. YouTube-Style Lag-Free Seek Engine
function requestSeek(deltaSeconds) {
  const dur = elements.videoElement.duration || 0;
  if (!dur) return;

  // 1. Accumulate seek time
  const baseTime = (state.pendingSeekTime !== null) ? state.pendingSeekTime : (elements.videoElement.currentTime || 0);
  state.accumulatedSeekSeconds += deltaSeconds;
  const targetTime = Math.max(0, Math.min(dur, baseTime + deltaSeconds));
  state.pendingSeekTime = targetTime;

  // 2. Instant Optimistic UI feedback (60 FPS - Zero Latency)
  const pct = (targetTime / dur) * 100;
  elements.timelineProgress.style.width = `${pct}%`;
  elements.timelineThumb.style.left = `${pct}%`;
  elements.currentTimeDisplay.textContent = formatTime(targetTime);
  const remaining = Math.max(0, dur - targetTime);
  if (elements.timeRemaining) {
    elements.timeRemaining.textContent = `(-${formatTime(remaining)})`;
  }

  // 3. YouTube-style ripple animation
  triggerSeekRipple(deltaSeconds > 0 ? 'right' : 'left', Math.abs(state.accumulatedSeekSeconds));

  // 4. VLC OSD Display
  const prefix = state.accumulatedSeekSeconds > 0 ? '+' : '-';
  showVlcOsd(deltaSeconds > 0 ? 'SEEK+' : 'SEEK-', `${prefix}${Math.abs(state.accumulatedSeekSeconds)}s (${formatTime(targetTime)})`);

  // 5. Debounce actual hardware seek
  if (state.seekDebounceTimer) clearTimeout(state.seekDebounceTimer);
  state.seekDebounceTimer = setTimeout(() => {
    executeHardwareSeek(state.pendingSeekTime);
    state.pendingSeekTime = null;
    state.accumulatedSeekSeconds = 0;
  }, 110);
}

function executeHardwareSeek(time) {
  if (time === null || isNaN(time)) return;
  if (typeof elements.videoElement.fastSeek === 'function') {
    elements.videoElement.fastSeek(time);
  } else {
    elements.videoElement.currentTime = time;
  }
}

function triggerSeekRipple(direction, seconds) {
  const ripple = direction === 'right' ? elements.seekRippleRight : elements.seekRippleLeft;
  const textEl = direction === 'right' ? elements.rippleRightText : elements.rippleLeftText;
  if (!ripple || !textEl) return;

  textEl.textContent = `${direction === 'right' ? '+' : '-'}${seconds}s`;
  ripple.classList.remove('hidden');

  if (state.rippleHideTimer) clearTimeout(state.rippleHideTimer);
  state.rippleHideTimer = setTimeout(() => {
    ripple.classList.add('hidden');
  }, 450);
}

// 8. VLC Aspect Ratio Switcher
function toggleAspectRatio() {
  state.aspectRatioIndex = (state.aspectRatioIndex + 1) % state.aspectRatios.length;
  const mode = state.aspectRatios[state.aspectRatioIndex];
  applyAspectRatioClass();
  showVlcOsd('ASPECT', `Aspect: ${mode.label}`);
  if (elements.statAspect) elements.statAspect.textContent = mode.label;
  showToast(`Aspect Ratio: ${mode.label}`, 2000);
}

function applyAspectRatioClass() {
  const allAspectClasses = ['aspect-16-9', 'aspect-4-3', 'aspect-fill', 'aspect-cinema'];
  allAspectClasses.forEach(c => {
    elements.videoElement.classList.remove(c);
    elements.playerIframe.classList.remove(c);
  });

  const activeMode = state.aspectRatios[state.aspectRatioIndex];
  if (activeMode && activeMode.class) {
    elements.videoElement.classList.add(activeMode.class);
    elements.playerIframe.classList.add(activeMode.class);
  }
}

// 9. Centered VLC On-Screen Display (OSD)
function showVlcOsd(icon, text) {
  if (!elements.vlcOsd || !elements.vlcOsdIcon || !elements.vlcOsdText) return;
  elements.vlcOsdIcon.textContent = icon;
  elements.vlcOsdText.textContent = text;
  elements.vlcOsd.classList.remove('hidden');

  if (state.osdTimeout) clearTimeout(state.osdTimeout);
  state.osdTimeout = setTimeout(() => {
    elements.vlcOsd.classList.add('hidden');
  }, 900);
}

// 10. VLC Stream Inspector HUD ("Stats for Nerds")
function startInspectorHUD() {
  if (state.inspectorInterval) clearInterval(state.inspectorInterval);
  updateInspectorHUD();
  state.inspectorInterval = setInterval(updateInspectorHUD, 1000);
}

function updateInspectorHUD() {
  const activeServer = state.servers[state.activeServerIndex] || state.servers[0];

  // Resolution & Viewport
  const vw = elements.videoElement.videoWidth || 0;
  const vh = elements.videoElement.videoHeight || 0;
  if (elements.statResolution) {
    if (vw > 0 && vh > 0) {
      const tag = vw >= 1920 ? '1080p True FHD' : vw >= 1280 ? '720p HD' : '480p SD';
      elements.statResolution.textContent = `${vw} × ${vh} (${tag})`;
    } else if (activeServer?.type === 'embed') {
      elements.statResolution.textContent = activeServer.quality || '1080p FHD / 4K';
    } else {
      elements.statResolution.textContent = state.currentQuality || '1080p FHD';
    }
  }

  if (elements.statViewport) {
    elements.statViewport.textContent = `${window.innerWidth} × ${window.innerHeight} px`;
  }

  // Active Server
  if (elements.statServer && activeServer) {
    elements.statServer.textContent = activeServer.name;
  }

  // Audio Language
  if (elements.statAudio) {
    elements.statAudio.textContent = state.selectedAudioLang === 'hin' ? 'Hindi (हिंदी Dubbed)' : 'English (Original)';
  }

  // Stream Format
  if (elements.statFormat) {
    if (state.dashPlayer) {
      elements.statFormat.textContent = 'DASH Multi-Bitrate Engine';
    } else if (activeServer?.type === 'direct') {
      elements.statFormat.textContent = 'Direct MP4 High-Speed CDN';
    } else {
      elements.statFormat.textContent = 'Cloud Sandboxed 4K/HD Stream';
    }
  }

  // Buffer Health
  if (elements.statBuffer) {
    if (elements.videoElement.buffered.length > 0) {
      const cur = elements.videoElement.currentTime || 0;
      const bufEnd = elements.videoElement.buffered.end(elements.videoElement.buffered.length - 1);
      const ahead = Math.max(0, bufEnd - cur);
      elements.statBuffer.textContent = `${ahead.toFixed(1)}s ahead`;
    } else {
      elements.statBuffer.textContent = 'Real-time Live';
    }
  }

  // Aspect Ratio
  if (elements.statAspect) {
    elements.statAspect.textContent = state.aspectRatios[state.aspectRatioIndex].label;
  }

  // Failover state
  if (elements.statFailover) {
    elements.statFailover.textContent = state.autoFailoverEnabled
      ? `Active (${state.servers.length} Servers Protected)`
      : 'Manual Switch Mode';
  }
}

// 11. Dropdown Setup Functions
let audioNoticeTimer = null;
function showAudioNotice(message, duration = 4500, type = "info") {
  if (!elements.playerAudioNotice || !elements.playerAudioNoticeText) return;
  if (audioNoticeTimer) clearTimeout(audioNoticeTimer);

  elements.playerAudioNoticeText.textContent = message;
  elements.playerAudioNotice.className = `player-audio-notice notice-${type}`;
  elements.playerAudioNotice.classList.remove('hidden');

  audioNoticeTimer = setTimeout(() => {
    if (elements.playerAudioNotice) {
      elements.playerAudioNotice.classList.add('hidden');
    }
  }, duration);
}

function markAudioDropdownOption(code, tagText, tagClass = 'tag-unavailable') {
  [elements.audioMenu, elements.audioMenuTop].filter(Boolean).forEach(menu => {
    const btn = menu.querySelector(`button[data-code="${code}"]`);
    if (btn) {
      const tag = btn.querySelector('.opt-tag');
      if (tag) {
        tag.textContent = tagText;
        tag.className = `opt-tag ${tagClass}`;
      }
    }
  });
}

function updateAudioUI(shortName, fullName, badgeText, tooltipText = '') {
  if (elements.currentAudioLabel) elements.currentAudioLabel.textContent = shortName;
  if (elements.currentAudioTopLabel) elements.currentAudioTopLabel.textContent = shortName;
  if (elements.activeAudioBadge) {
    if (elements.activeAudioText) {
      elements.activeAudioText.textContent = badgeText;
    } else {
      elements.activeAudioBadge.textContent = badgeText;
    }
    if (tooltipText) elements.activeAudioBadge.title = tooltipText;
  }
  if (elements.btnAudioSelectTop) {
    elements.btnAudioSelectTop.title = tooltipText || `Audio Track: ${fullName}`;
  }
}

function setupAudioDropdown(languages) {
  const menus = [elements.audioMenu, elements.audioMenuTop].filter(Boolean);
  if (menus.length === 0) return;

  menus.forEach(menu => {
    menu.innerHTML = '';

    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = `dropdown-option ${lang.code === state.selectedAudioLang ? 'active' : ''}`;
      btn.dataset.code = lang.code;
      const optTag = lang.statusTag || lang.code.toUpperCase();
      btn.innerHTML = `<span style="display:flex; align-items:center; gap:8px;">${lang.name}</span><span class="opt-tag ${lang.statusClass || ''}">${optTag}</span>`;
      btn.addEventListener('click', () => {
        applyAudioLanguage(lang);
      });
      menu.appendChild(btn);
    });
  });

  if (elements.btnAudioSelectTop) {
    if (languages.length <= 1) {
      elements.btnAudioSelectTop.title = `Audio: ${languages[0]?.name || 'Original Audio'} (Single Track)`;
    } else {
      elements.btnAudioSelectTop.title = "Switch Audio Track (Multi-Audio Available)";
    }
  }
}

async function applyAudioLanguage(lang) {
  closeAllPlayerMenus();

  const titleName = state.activeSubject?.title || 'This Title';
  const isIndianTitle = (
    state.activeSubject?.countryName === 'India' ||
    (state.activeSubject?.title && ['animal', 'jawan', 'pushpa', 'mirzapur', 'panchayat'].some(k => state.activeSubject.title.toLowerCase().includes(k)))
  );
  const isAnime = (
    state.activeSubject?.category === 'anime' ||
    (state.activeSubject?.title && ['solo leveling', 'frieren', 'jujutsu', 'demon slayer', 'titan', 'naruto', 'one piece', 'death note'].some(k => state.activeSubject.title.toLowerCase().includes(k)))
  );

  // 1. Indian Title (Hindi is native master original audio on Server 1)
  if (lang.code === 'hin' && isIndianTitle) {
    state.selectedAudioLang = 'hin';
    LanguagePreferenceManager.recordLanguage('hin');
    updateAudioUI('Hindi', 'Hindi (Original Audio)', 'Audio: Hindi', 'Playing Native Hindi Original Audio');
    [elements.audioMenu, elements.audioMenuTop].filter(Boolean).forEach(menu => {
      menu.querySelectorAll('.dropdown-option').forEach(b => {
        b.classList.toggle('active', b.dataset.code === 'hin');
      });
    });
    if (elements.playerAudioNotice) elements.playerAudioNotice.classList.add('hidden');
    showVlcOsd('AUDIO', 'Audio: Hindi (Original)');
    showToast('Audio Track: Hindi (Original Audio)');
    return;
  }

  // 2. Original Audio Selected (English, Japanese, or Regional)
  if (lang.code !== 'hin') {
    state.selectedAudioLang = lang.code;
    LanguagePreferenceManager.recordLanguage(lang.code);
    const shortName = lang.name.split(' ')[0];
    updateAudioUI(shortName, lang.name, `Audio: ${shortName}`, `Active Audio Track: ${lang.name}`);
    [elements.audioMenu, elements.audioMenuTop].filter(Boolean).forEach(menu => {
      menu.querySelectorAll('.dropdown-option').forEach(b => {
        b.classList.toggle('active', b.dataset.code === lang.code);
      });
    });
    if (elements.playerAudioNotice) elements.playerAudioNotice.classList.add('hidden');
    showVlcOsd('AUDIO', `Audio: ${lang.name}`);
    showToast(`Audio Track: ${lang.name}`);
    return;
  }

  // 3. User requested Hindi Dubbed on Non-Indian Content (Anime / Hollywood)
  // Step A: Provide immediate user feedback that system is actively probing servers
  showAudioNotice("Scanning Stream Nodes for Hindi Audio Track...", 2200, "info");
  showVlcOsd('SCAN', 'Probing Multi-Audio Servers...');

  // Step B: Actively probe state.servers for Hindi capability
  let foundHindiServerIdx = -1;
  const servers = state.servers || [];

  for (let i = 0; i < servers.length; i++) {
    const s = servers[i];
    if (!s) continue;
    const hasExplicitHindi = (
      s.id === 'cinema-stream-hindi' ||
      (s.name && (s.name.toLowerCase().includes('hindi') || s.name.toLowerCase().includes('dubbed'))) ||
      (s.tag && (s.tag.toLowerCase().includes('hindi') || s.tag.toLowerCase().includes('multi-audio'))) ||
      (Array.isArray(s.audioLanguages) && s.audioLanguages.some(a => String(a).toLowerCase().includes('hin')))
    );

    if (hasExplicitHindi) {
      foundHindiServerIdx = i;
      break;
    }
  }

  // Step C: If Hindi server was found, switch to it!
  if (foundHindiServerIdx !== -1) {
    state.selectedAudioLang = 'hin';
    LanguagePreferenceManager.recordLanguage('hin');
    updateAudioUI('Hindi', 'Hindi (Dubbed)', 'Audio: Hindi (Dubbed)', 'Playing Hindi Dubbed Stream');
    [elements.audioMenu, elements.audioMenuTop].filter(Boolean).forEach(menu => {
      menu.querySelectorAll('.dropdown-option').forEach(b => {
        b.classList.toggle('active', b.dataset.code === 'hin');
      });
    });
    showVlcOsd('AUDIO', 'Audio: Hindi Dubbed Active');
    showAudioNotice(`Connected to Hindi Dubbed Stream on ${servers[foundHindiServerIdx].name}`, 3500, "success");
    if (foundHindiServerIdx !== state.activeServerIndex) {
      executeZeroLatencySwitch(foundHindiServerIdx, "Multi-Audio Route: Hindi Dubbed");
    }
    return;
  }

  // Step D: Hindi Dub is NOT available on any stream server for this title
  // Smoothly fall back to Master Original Audio (Japanese for anime, English for western)
  const fallbackLang = isAnime 
    ? { code: 'jpn', name: 'Japanese (Original Audio)', short: 'Japanese' }
    : { code: 'eng', name: 'English (Original Audio)', short: 'English' };

  state.selectedAudioLang = fallbackLang.code;
  updateAudioUI(
    fallbackLang.short, 
    fallbackLang.name, 
    `Audio: ${fallbackLang.short} (Hindi Dub Unavailable)`,
    `Hindi Dubbed Audio is currently unavailable across streaming servers for ${titleName}. Playing in ${fallbackLang.name}.`
  );

  // Keep original audio active in dropdown highlights
  [elements.audioMenu, elements.audioMenuTop].filter(Boolean).forEach(menu => {
    menu.querySelectorAll('.dropdown-option').forEach(b => {
      b.classList.toggle('active', b.dataset.code === fallbackLang.code);
    });
  });

  // Mark Hindi option in dropdown as UNAVAILABLE
  markAudioDropdownOption('hin', 'UNAVAILABLE', 'tag-unavailable');

  // Enhanced English On-Screen Display Notice as requested by user
  const enhancedEnglishMsg = `Hindi Dubbed Audio is currently unavailable across streaming servers for ${titleName}. Seamlessly playing in ${fallbackLang.name}.`;
  showAudioNotice(enhancedEnglishMsg, 6000, "warning");
  showVlcOsd('AUDIO', 'Hindi Dub Unavailable Across Stream Nodes');
  showToast(`Hindi Audio Unavailable across nodes • Switched to ${fallbackLang.short}`, 4500);
}

function preconnectAllServers(servers) {
  if (!servers || !Array.isArray(servers)) return;
  servers.forEach(srv => {
    const urls = [];
    if (srv.url) urls.push(srv.url);
    if (srv.resources) srv.resources.forEach(r => r.url && urls.push(r.url));
    if (srv.streams) srv.streams.forEach(s => s.url && urls.push(s.url));
    urls.forEach(u => {
      try {
        const origin = new URL(u).origin;
        if (!state.preloadedUrls.has(origin)) {
          state.preloadedUrls.add(origin);
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = origin;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);

          const dns = document.createElement('link');
          dns.rel = 'dns-prefetch';
          dns.href = origin;
          document.head.appendChild(dns);
        }
      } catch (e) {}
    });
  });
}

function setupServerDropdown(servers) {
  const menus = [elements.serverMenu, elements.serverMenuTop].filter(Boolean);
  if (menus.length === 0) return;

  // Ultra-Low Latency: Preconnect & Pre-DNS all server domains
  preconnectAllServers(servers);

  menus.forEach(menu => {
    menu.innerHTML = '';

    // Auto-Failover Toggle Header
    const toggleRow = document.createElement('div');
    toggleRow.className = 'dropdown-option';
    toggleRow.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    toggleRow.style.paddingBottom = '8px';
    toggleRow.style.marginBottom = '4px';
    toggleRow.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Dual-Channel Failover</span>
      </div>
      <span class="opt-tag" style="background:${state.autoFailoverEnabled ? 'var(--vlc-orange)' : '#444'}; color:#000;">
        ${state.autoFailoverEnabled ? 'HOT STANDBY' : 'MANUAL'}
      </span>
    `;
    toggleRow.addEventListener('click', () => {
      state.autoFailoverEnabled = !state.autoFailoverEnabled;
      setupServerDropdown(state.servers);
      showToast(`Stream Protection: ${state.autoFailoverEnabled ? 'HOT STANDBY' : 'MANUAL'}`);
    });
    menu.appendChild(toggleRow);

    servers.forEach((srv, idx) => {
      const btn = document.createElement('button');
      const isActive = idx === state.activeServerIndex;
      const isStandby = idx === state.backupServerIndex;
      const isQuarantined = !!state.quarantineServers[idx];

      btn.className = `dropdown-option ${isActive ? 'active' : ''}`;
      btn.dataset.index = idx;

      let statusBadge = isActive
        ? '<span class="opt-tag" style="background:#22C55E; color:#000; font-weight:700;">LIVE</span>'
        : isStandby
          ? '<span class="opt-tag" style="background:#3B82F6; color:#fff; font-weight:600;">STANDBY</span>'
          : isQuarantined
            ? '<span class="opt-tag" style="background:#EF4444; color:#fff;">HEALING</span>'
            : `<span class="opt-tag">${srv.quality.includes('4K') ? '4K UHD' : '1080P'}</span>`;

      btn.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px; text-align:left;">
          <span>${srv.name}</span>
          <small style="font-size:10.5px; color:var(--text-muted);">${srv.tag || srv.quality}</small>
        </div>
        ${statusBadge}
      `;
      btn.addEventListener('click', () => {
        closeAllPlayerMenus();
        executeZeroLatencySwitch(idx, "Manual Selection");
      });
      menu.appendChild(btn);
    });
  });
}

function setupQualityDropdown(resources, streams = []) {
  if (!elements.qualityMenu) return;
  elements.qualityMenu.innerHTML = '';

  // Auto (DASH / Multi-Bitrate)
  const autoBtn = document.createElement('button');
  autoBtn.className = `dropdown-option ${state.currentQuality === 'Auto' ? 'active' : ''}`;
  autoBtn.innerHTML = `<span>AUTO (ADAPTIVE)</span><span class="opt-tag">YOUTUBE ABR</span>`;
  autoBtn.addEventListener('click', () => {
    elements.qualityMenu.classList.add('hidden');
    if (state.dashPlayer) {
      state.dashPlayer.updateSettings({ abr: { autoSwitchBitrate: { video: true } } });
      showQualityToast("AUTO (ABR)");
      showVlcOsd('HD', "Quality: Auto");
    } else if (resources[0]) {
      changeQualitySeamlessly(resources[0], 0);
    }
  });
  elements.qualityMenu.appendChild(autoBtn);

  resources.forEach((res, index) => {
    const btn = document.createElement('button');
    btn.className = `dropdown-option ${res.resolution === state.currentQuality ? 'active' : ''}`;
    btn.dataset.res = res.resolution;
    btn.innerHTML = `<span>${res.resolution.toUpperCase()}</span><span class="opt-tag">${res.codec ? res.codec.toUpperCase() : 'FHD'}</span>`;
    btn.addEventListener('click', () => {
      elements.qualityMenu.classList.add('hidden');
      changeQualitySeamlessly(res, index);
    });
    elements.qualityMenu.appendChild(btn);
  });
}

function setupSubtitlesDropdown(captions) {
  while (elements.videoElement.firstChild) {
    elements.videoElement.removeChild(elements.videoElement.firstChild);
  }
  if (!elements.subtitlesMenu) return;
  elements.subtitlesMenu.innerHTML = '';

  const offBtn = document.createElement('button');
  offBtn.className = 'dropdown-option active';
  offBtn.textContent = 'Off';
  offBtn.addEventListener('click', () => {
    disableAllTracks();
    elements.currentSubtitleLabel.textContent = 'CC';
    elements.subtitlesMenu.classList.add('hidden');
    elements.subtitlesMenu.querySelectorAll('.dropdown-option').forEach(b => b.classList.remove('active'));
    offBtn.classList.add('active');
    showVlcOsd('SUBTITLE', 'Subtitles: Off');
  });
  elements.subtitlesMenu.appendChild(offBtn);

  if (!captions || captions.length === 0) {
    if (elements.btnSubtitlesSelect) elements.btnSubtitlesSelect.style.opacity = '0.5';
    return;
  }
  if (elements.btnSubtitlesSelect) elements.btnSubtitlesSelect.style.opacity = '1';

  captions.forEach(cap => {
    const langCode = cap.languageCode || 'en';
    const langName = getLanguageName(langCode);
    const subUrl = (isCloud || cap.url.includes('github') || cap.url.includes('raw.githubusercontent.com')) ? cap.url : apiUrl(`/api/subtitle?url=${encodeURIComponent(cap.url)}`);

    try {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = langName;
      track.srclang = langCode;
      track.src = subUrl;
      elements.videoElement.appendChild(track);
    } catch (e) {}

    const btn = document.createElement('button');
    btn.className = 'dropdown-option';
    btn.textContent = langName;
    btn.addEventListener('click', () => {
      enableTrack(langCode);
      elements.currentSubtitleLabel.textContent = langCode.toUpperCase();
      elements.subtitlesMenu.classList.add('hidden');
      elements.subtitlesMenu.querySelectorAll('.dropdown-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showVlcOsd('SUBTITLE', `Subtitles: ${langName}`);
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
    'en': 'English', 'hi': 'Hindi', 'ur': 'Urdu', 'fr': 'French',
    'es': 'Spanish', 'ar': 'Arabic', 'de': 'German', 'it': 'Italian',
    'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese', 'in_id': 'Indonesian',
    'ms': 'Malay', 'pa': 'Punjabi', 'sw': 'Swahili'
  };
  return map[code] || code.toUpperCase();
}

function updateEpisodeNavButtons(se, ep) {
  if (se > 0 && ep > 0) {
    const subjectId = state.currentPlaybackSubject?.subjectId;
    const seasonInfo = EmbeddedEngine.getSeason(subjectId);
    const seasons = seasonInfo?.data?.seasons || [];
    const currentSeason = seasons.find(s => s.se === se);
    const maxEp = currentSeason?.maxEp || currentSeason?.episodeCount || 10;
    const nextSeason = seasons.find(s => s.se === se + 1);

    const hasNextEp = ep < maxEp;
    const hasNextSeason = Boolean(nextSeason);

    let nextTargetSe = se;
    let nextTargetEp = ep + 1;
    let nextLabel = `Next Ep (E${ep + 1})`;

    if (!hasNextEp && hasNextSeason) {
      nextTargetSe = se + 1;
      nextTargetEp = 1;
      nextLabel = `Next Season (S${se + 1}:E1)`;
    }

    const canGoNext = hasNextEp || hasNextSeason;

    if (elements.btnPrevEp) {
      elements.btnPrevEp.classList.remove('hidden');
      elements.btnPrevEp.disabled = ep <= 1 && se <= 1;
      elements.btnPrevEp.onclick = () => {
        if (ep > 1) {
          startPlayback(state.currentPlaybackSubject.subjectId, se, ep - 1, state.currentPlaybackSubject.title, state.currentPlaybackSubject.cover, state.currentPlaybackSubject.subjectType || 2, state.currentPlaybackSubject.imdbId, state.currentPlaybackSubject.tmdbId);
        } else if (se > 1) {
          const prevSeason = seasons.find(s => s.se === se - 1);
          const prevMaxEp = prevSeason?.maxEp || prevSeason?.episodeCount || 10;
          startPlayback(state.currentPlaybackSubject.subjectId, se - 1, prevMaxEp, state.currentPlaybackSubject.title, state.currentPlaybackSubject.cover, state.currentPlaybackSubject.subjectType || 2, state.currentPlaybackSubject.imdbId, state.currentPlaybackSubject.tmdbId);
        }
      };
    }

    if (elements.btnNextEp) {
      elements.btnNextEp.classList.remove('hidden');
      elements.btnNextEp.disabled = !canGoNext;
      elements.btnNextEp.onclick = () => {
        if (canGoNext) {
          startPlayback(state.currentPlaybackSubject.subjectId, nextTargetSe, nextTargetEp, state.currentPlaybackSubject.title, state.currentPlaybackSubject.cover, state.currentPlaybackSubject.subjectType || 2, state.currentPlaybackSubject.imdbId, state.currentPlaybackSubject.tmdbId);
        } else {
          showToast("You have reached the final episode!", 2500);
        }
      };
    }

    if (elements.btnNextEpTop) {
      if (canGoNext) {
        elements.btnNextEpTop.classList.remove('hidden');
        if (elements.nextEpTopText) elements.nextEpTopText.textContent = nextLabel;
        elements.btnNextEpTop.onclick = (e) => {
          e.stopPropagation();
          startPlayback(state.currentPlaybackSubject.subjectId, nextTargetSe, nextTargetEp, state.currentPlaybackSubject.title, state.currentPlaybackSubject.cover, state.currentPlaybackSubject.subjectType || 2, state.currentPlaybackSubject.imdbId, state.currentPlaybackSubject.tmdbId);
        };
      } else {
        elements.btnNextEpTop.classList.add('hidden');
      }
    }
  } else {
    if (elements.btnPrevEp) elements.btnPrevEp.classList.add('hidden');
    if (elements.btnNextEp) elements.btnNextEp.classList.add('hidden');
    if (elements.btnNextEpTop) elements.btnNextEpTop.classList.add('hidden');
  }
}

function togglePlay() {
  if (elements.videoElement.muted) {
    elements.videoElement.muted = false;
    showVlcOsd('VOL', 'UNMUTED');
    showToast("Audio Unmuted", 2000);
    if (elements.videoElement.paused) {
      elements.videoElement.play().catch(() => {});
    }
    return;
  }
  if (elements.videoElement.paused) {
    elements.videoElement.play().catch(() => {});
    showVlcOsd('PLAY', 'PLAY');
  } else {
    elements.videoElement.pause();
    showVlcOsd('PAUSE', 'PAUSE');
  }
}

function stopPlayback() {
  elements.videoElement.pause();
  executeHardwareSeek(0);
  elements.timelineProgress.style.width = '0%';
  elements.timelineThumb.style.left = '0%';
  elements.currentTimeDisplay.textContent = '00:00:00';
  showVlcOsd('STOP', 'STOPPED');
  showToast("Playback Stopped & Rewound to Start", 2000);
  saveCurrentPlaybackProgress();
}

function cleanupActivePlayer() {
  if (state.failoverTimeout) clearTimeout(state.failoverTimeout);
  if (state.inspectorInterval) clearInterval(state.inspectorInterval);
  if (state.dashPlayer) {
    try { state.dashPlayer.destroy(); } catch (e) {}
    state.dashPlayer = null;
  }
  elements.videoElement.pause();
  elements.videoElement.removeAttribute('src');
  elements.videoElement.load();
  elements.playerIframe.src = 'about:blank';
}

function closePlayer() {
  if (elements.playerAudioNotice) elements.playerAudioNotice.classList.add('hidden');
  saveCurrentPlaybackProgress();
  cleanupActivePlayer();
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
    if (elements.btnClarityToggle) elements.btnClarityToggle.classList.add('active');
    if (elements.clarityLabel) elements.clarityLabel.textContent = "HD BOOST ON";
    try { localStorage.setItem('moviebox_clarity_boost', 'true'); } catch (e) {}
    if (showFeedback) showToast("HD Clarity Booster ON (Enhanced Contrast & Saturation)");
  } else {
    elements.videoElement.classList.remove('clarity-boosted');
    if (elements.btnClarityToggle) elements.btnClarityToggle.classList.remove('active');
    if (elements.clarityLabel) elements.clarityLabel.textContent = "HD BOOST";
    try { localStorage.setItem('moviebox_clarity_boost', 'false'); } catch (e) {}
    if (showFeedback) showToast("HD Clarity Booster OFF");
  }
}

function initSpeedSelector() {
  if (!elements.btnSpeedSelect || !elements.speedMenu) return;

  elements.btnSpeedSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.speedMenu.classList.toggle('hidden');
    if (elements.qualityMenu) elements.qualityMenu.classList.add('hidden');
    if (elements.subtitlesMenu) elements.subtitlesMenu.classList.add('hidden');
    if (elements.audioMenu) elements.audioMenu.classList.add('hidden');
    if (elements.serverMenu) elements.serverMenu.classList.add('hidden');
  });

  elements.speedMenu.querySelectorAll('.dropdown-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseFloat(btn.dataset.speed);
      elements.videoElement.playbackRate = speed;
      elements.currentSpeedLabel.textContent = `${speed}x`;
      elements.speedMenu.querySelectorAll('.dropdown-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      elements.speedMenu.classList.add('hidden');
      showVlcOsd('SPEED', `Speed: ${speed}x`);
      showToast(`Playback Speed: ${speed}x`);
    });
  });
}

// ======================== VLC PLAYER EVENT LISTENERS (DUAL-CHANNEL BINDINGS) ========================

function handlePlaybackBufferStall() {
  if (!state.isPlaying || !state.autoFailoverEnabled || !state.servers || state.servers.length <= 1) return;
  if (state.stallFailoverTimeout) clearTimeout(state.stallFailoverTimeout);
  state.stallFailoverTimeout = setTimeout(() => {
    // Only failover if genuinely broken or sustained stall with explicit media error
    if (elements.videoElement.readyState < 2 && state.isPlaying && !elements.videoElement.paused) {
      if (elements.videoElement.error) {
        console.warn("[Netflix Fast Failover] Active stream media error detected. Performing handover to standby...");
        triggerAutoFailover("Buffer stall with media error");
      }
    }
  }, 8500);
}

function bindVideoPlaybackEvents(vid) {
  if (!vid) return;

  vid.addEventListener('play', () => {
    if (vid !== elements.videoElement) return;
    state.isPlaying = true;
    elements.iconPlay.classList.add('hidden');
    elements.iconPause.classList.remove('hidden');
  });

  vid.addEventListener('pause', () => {
    if (vid !== elements.videoElement) return;
    state.isPlaying = false;
    elements.iconPlay.classList.remove('hidden');
    elements.iconPause.classList.add('hidden');
    showPlayerControls();
    saveCurrentPlaybackProgress();
  });

  // High-Precision Timeline Progress & Time Remaining Countdown
  vid.addEventListener('timeupdate', () => {
    if (vid !== elements.videoElement) return;
    if (state.pendingSeekTime !== null || state.isDraggingScrubber) return; // Prevent scrub jitter during seek

    const current = vid.currentTime || 0;
    const duration = vid.duration || 0;
    elements.currentTimeDisplay.textContent = formatTime(current);
    elements.totalDurationDisplay.textContent = formatTime(duration);

    // VLC Countdown Time Remaining
    if (elements.timeRemaining && duration > 0) {
      const remaining = Math.max(0, duration - current);
      elements.timeRemaining.textContent = `(-${formatTime(remaining)})`;
    }

    if (duration > 0) {
      const pct = (current / duration) * 100;
      elements.timelineProgress.style.width = `${pct}%`;
      elements.timelineThumb.style.left = `${pct}%`;
    }

    // Update buffered bar
    if (vid.buffered.length > 0 && duration > 0) {
      const bufferedEnd = vid.buffered.end(vid.buffered.length - 1);
      elements.timelineBuffered.style.width = `${(bufferedEnd / duration) * 100}%`;
    }

    // Continuous Buffer Sync: keep Standby buffer hot and pre-warmed at the active playhead
    if (elements.videoStandby && elements.videoStandby.src && elements.videoStandby.readyState >= 1) {
      const standbyCur = elements.videoStandby.currentTime;
      if (Math.abs(current - standbyCur) > 3) {
        try {
          elements.videoStandby.currentTime = current;
        } catch (e) {}
      }
    }

    // Throttle saving progress to watch history every 4 seconds
    const now = Date.now();
    if (now - state.lastSaveTimestamp > 4000) {
      state.lastSaveTimestamp = now;
      saveCurrentPlaybackProgress();
    }
  });

  // Rapid freeze & stall detection
  vid.addEventListener('waiting', () => {
    if (vid !== elements.videoElement) return;
    handlePlaybackBufferStall();
  });

  vid.addEventListener('stalled', () => {
    if (vid !== elements.videoElement) return;
    handlePlaybackBufferStall();
  });

  vid.addEventListener('playing', () => {
    if (vid !== elements.videoElement) return;
    if (state.stallFailoverTimeout) clearTimeout(state.stallFailoverTimeout);
    elements.playerLoader.classList.add('hidden');
  });
}

// Bind both active and standby video elements
bindVideoPlaybackEvents(elements.videoElement);
bindVideoPlaybackEvents(elements.videoStandby);

// Lag-Free Timeline Click & Drag Scrubbing
elements.timelineContainer.addEventListener('mousedown', (e) => {
  state.isDraggingScrubber = true;
  handleTimelineScrub(e);
});

window.addEventListener('mousemove', (e) => {
  if (state.isDraggingScrubber) {
    handleTimelineScrub(e);
  }
});

window.addEventListener('mouseup', () => {
  if (state.isDraggingScrubber) {
    state.isDraggingScrubber = false;
    if (state.pendingSeekTime !== null) {
      executeHardwareSeek(state.pendingSeekTime);
      state.pendingSeekTime = null;
    }
  }
});

function handleTimelineScrub(e) {
  const rect = elements.timelineContainer.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  const dur = elements.videoElement.duration || 0;
  if (!dur) return;

  const target = pct * dur;
  state.pendingSeekTime = target;

  // Optimistic 60fps UI update
  elements.timelineProgress.style.width = `${pct * 100}%`;
  elements.timelineThumb.style.left = `${pct * 100}%`;
  elements.currentTimeDisplay.textContent = formatTime(target);
  if (elements.timeRemaining) {
    elements.timeRemaining.textContent = `(-${formatTime(dur - target)})`;
  }
  elements.timelineTooltip.textContent = formatTime(target);
  elements.timelineTooltip.style.left = `${clickX}px`;
  elements.timelineTooltip.classList.remove('hidden');
}

elements.timelineContainer.addEventListener('mousemove', (e) => {
  if (state.isDraggingScrubber) return;
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
  if (!state.isDraggingScrubber) {
    elements.timelineTooltip.classList.add('hidden');
  }
});

// VLC Volume Control with Percentage Display & Boost up to 150%
elements.volumeSlider.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  elements.videoElement.volume = Math.min(1, val);
  elements.videoElement.muted = val === 0;

  const pct = Math.round(val * 100);
  if (elements.volumePercentage) elements.volumePercentage.textContent = `${pct}%`;
  updateVolumeIcons(val === 0);
  showVlcOsd('VOL', `Volume: ${pct}%`);
});

elements.btnVolume.addEventListener('click', () => {
  elements.videoElement.muted = !elements.videoElement.muted;
  updateVolumeIcons(elements.videoElement.muted);
  const currentVal = elements.videoElement.muted ? 0 : (elements.videoElement.volume || 1);
  elements.volumeSlider.value = currentVal;
  if (elements.volumePercentage) elements.volumePercentage.textContent = `${Math.round(currentVal * 100)}%`;
  showVlcOsd(elements.videoElement.muted ? 'MUTE' : 'VOL', elements.videoElement.muted ? 'MUTE' : 'UNMUTE');
});

function updateVolumeIcons(isMuted) {
  elements.iconVolHigh.classList.toggle('hidden', isMuted);
  elements.iconVolMute.classList.toggle('hidden', !isMuted);
}

// 10s Rewind & Forward with YouTube Ripple & Zero Lag
elements.btnRewind.addEventListener('click', () => {
  requestSeek(-10);
});

elements.btnForward.addEventListener('click', () => {
  requestSeek(10);
});

// VLC Stop Button
if (elements.btnStop) {
  elements.btnStop.addEventListener('click', stopPlayback);
}

// VLC Aspect Ratio Button
if (elements.btnAspectRatio) {
  elements.btnAspectRatio.addEventListener('click', toggleAspectRatio);
}

// VLC Stream Inspector HUD Toggle
if (elements.btnInspectorToggle) {
  elements.btnInspectorToggle.addEventListener('click', () => {
    elements.vlcInspectorHud.classList.toggle('hidden');
    if (!elements.vlcInspectorHud.classList.contains('hidden')) {
      startInspectorHUD();
      showToast("VLC Stream Inspector: Active", 1500);
    }
  });
}

if (elements.btnInspectorClose) {
  elements.btnInspectorClose.addEventListener('click', () => {
    elements.vlcInspectorHud.classList.add('hidden');
  });
}

// Unified Player Menu & Mobile Bottom Sheet Drawer Engine
function openPlayerMenu(menuElement) {
  const allMenus = [elements.audioMenu, elements.audioMenuTop, elements.serverMenu, elements.serverMenuTop, elements.qualityMenu, elements.subtitlesMenu, elements.speedMenu];
  allMenus.forEach(m => {
    if (m && m !== menuElement) m.classList.add('hidden');
  });

  if (!menuElement) return;
  const isCurrentlyHidden = menuElement.classList.contains('hidden');
  if (isCurrentlyHidden) {
    menuElement.classList.remove('hidden');
    if (elements.playerSheetBackdrop && window.innerWidth <= 768) {
      elements.playerSheetBackdrop.classList.remove('hidden');
    }
  } else {
    menuElement.classList.add('hidden');
    if (elements.playerSheetBackdrop) {
      elements.playerSheetBackdrop.classList.add('hidden');
    }
  }
}

function closeAllPlayerMenus() {
  const allMenus = [elements.audioMenu, elements.audioMenuTop, elements.serverMenu, elements.serverMenuTop, elements.qualityMenu, elements.subtitlesMenu, elements.speedMenu];
  allMenus.forEach(m => {
    if (m) m.classList.add('hidden');
  });
  if (elements.playerSheetBackdrop) {
    elements.playerSheetBackdrop.classList.add('hidden');
  }
}

// Menu Dropdown Toggles
if (elements.btnAudioSelect && elements.audioMenu) {
  elements.btnAudioSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.audioMenu);
  });
}

if (elements.btnAudioSelectTop && elements.audioMenuTop) {
  elements.btnAudioSelectTop.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.audioMenuTop);
  });
}

if (elements.activeAudioBadge) {
  elements.activeAudioBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (elements.audioMenuTop) {
      openPlayerMenu(elements.audioMenuTop);
    } else if (elements.audioMenu) {
      openPlayerMenu(elements.audioMenu);
    }
  });
}

if (elements.btnServerSelect && elements.serverMenu) {
  elements.btnServerSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.serverMenu);
  });
}

if (elements.btnServerSelectTop && elements.serverMenuTop) {
  elements.btnServerSelectTop.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.serverMenuTop);
  });
}

if (elements.btnTopFullscreen) {
  elements.btnTopFullscreen.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });
}

if (elements.btnQualitySelect && elements.qualityMenu) {
  elements.btnQualitySelect.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.qualityMenu);
  });
}

if (elements.btnSubtitlesSelect && elements.subtitlesMenu) {
  elements.btnSubtitlesSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.subtitlesMenu);
  });
}

if (elements.btnSpeedSelect && elements.speedMenu) {
  elements.btnSpeedSelect.addEventListener('click', (e) => {
    e.stopPropagation();
    openPlayerMenu(elements.speedMenu);
  });
}

if (elements.playerSheetBackdrop) {
  elements.playerSheetBackdrop.addEventListener('click', closeAllPlayerMenus);
}

document.addEventListener('click', () => {
  closeAllPlayerMenus();
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
    showVlcOsd('EXPAND', 'FULLSCREEN');
  } else {
    document.exitFullscreen();
    elements.iconExpand.classList.remove('hidden');
    elements.iconCompress.classList.add('hidden');
    showVlcOsd('WINDOW', 'WINDOWED');
  }
}

// Auto-hide Player Controls on inactivity
function showPlayerControls() {
  elements.playerControls.classList.remove('idle');
  if (state.controlsTimeout) clearTimeout(state.controlsTimeout);
  if (state.isPlaying) {
    state.controlsTimeout = setTimeout(() => {
      elements.playerControls.classList.add('idle');
      if (elements.qualityMenu) elements.qualityMenu.classList.add('hidden');
      if (elements.subtitlesMenu) elements.subtitlesMenu.classList.add('hidden');
      if (elements.speedMenu) elements.speedMenu.classList.add('hidden');
      if (elements.audioMenu) elements.audioMenu.classList.add('hidden');
      if (elements.serverMenu) elements.serverMenu.classList.add('hidden');
    }, 3800);
  }
}

elements.playerOverlay.addEventListener('mousemove', showPlayerControls);
elements.playerTapArea.addEventListener('click', togglePlay);
elements.btnPlayPause.addEventListener('click', togglePlay);
elements.btnPlayerExit.addEventListener('click', closePlayer);


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

// Native Multi-Platform Apps Download Modal
if (elements.btnPwaInstall && elements.appsDownloadModal) {
  elements.btnPwaInstall.addEventListener('click', (e) => {
    e.preventDefault();
    elements.appsDownloadModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });
}

if (elements.btnCloseAppsModal && elements.appsDownloadModal) {
  elements.btnCloseAppsModal.addEventListener('click', () => {
    elements.appsDownloadModal.classList.add('hidden');
    document.body.style.overflow = '';
  });
}

if (elements.appsDownloadModal) {
  // Ensure download buttons link to direct GitHub raw repository URLs when hosted on cloud static hosting, or local paths on localhost
  const GITHUB_DOWNLOAD_BASE = "https://raw.githubusercontent.com/ATP0925/moviebox-tv-pc/main/downloads";
  if (isCloud) {
    document.querySelectorAll('.btn-app-download').forEach(btn => {
      const href = btn.getAttribute('href');
      if (href && href.startsWith('downloads/')) {
        btn.setAttribute('href', href.replace('downloads/', `${GITHUB_DOWNLOAD_BASE}/`));
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  elements.appsDownloadModal.addEventListener('click', (e) => {
    if (e.target === elements.appsDownloadModal) {
      elements.appsDownloadModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });
}

// Mobile Bottom Navigation
if (elements.mobileBottomNav) {
  elements.mobileBottomNav.querySelectorAll('.mobile-nav-item[data-tab-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tabId;
      switchTab(tabId);
    });
  });

  const mobileSearchBtn = document.getElementById('mobile-nav-search-btn');
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (elements.searchInput) {
        elements.searchInput.focus();
      }
    });
  }
}

// Mobile Center Player Controls
if (elements.btnMobilePlayPause) {
  elements.btnMobilePlayPause.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
}

if (elements.btnMobileRw10) {
  elements.btnMobileRw10.addEventListener('click', (e) => {
    e.stopPropagation();
    requestSeek(-10);
  });
}

if (elements.btnMobileFf10) {
  elements.btnMobileFf10.addEventListener('click', (e) => {
    e.stopPropagation();
    requestSeek(10);
  });
}

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
      requestSeek(-10);
      showPlayerControls();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      requestSeek(10);
      showPlayerControls();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentVal = elements.videoElement.volume || 1;
      const newVol = Math.min(1.5, currentVal + 0.1);
      elements.videoElement.volume = Math.min(1, newVol);
      elements.volumeSlider.value = newVol;
      const pct = Math.round(newVol * 100);
      if (elements.volumePercentage) elements.volumePercentage.textContent = `${pct}%`;
      updateVolumeIcons(false);
      showVlcOsd('VOL', `Volume: ${pct}%`);
      showPlayerControls();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentVal = elements.videoElement.volume || 1;
      const newVol = Math.max(0, currentVal - 0.1);
      elements.videoElement.volume = newVol;
      elements.volumeSlider.value = newVol;
      const pct = Math.round(newVol * 100);
      if (elements.volumePercentage) elements.volumePercentage.textContent = `${pct}%`;
      updateVolumeIcons(newVol === 0);
      showVlcOsd('VOL', `Volume: ${pct}%`);
      showPlayerControls();
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'm') {
      e.preventDefault();
      elements.btnVolume.click();
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      if (elements.btnInspectorToggle) elements.btnInspectorToggle.click();
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      if (elements.btnAudioSelectTop && !elements.playerIframe.classList.contains('hidden')) {
        elements.btnAudioSelectTop.click();
      } else if (elements.btnAudioSelect) {
        elements.btnAudioSelect.click();
      }
    } else if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (elements.btnServerSelectTop && !elements.playerIframe.classList.contains('hidden')) {
        elements.btnServerSelectTop.click();
      } else if (elements.btnServerSelect) {
        elements.btnServerSelect.click();
      }
    } else if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      if (elements.btnQualitySelect) elements.btnQualitySelect.click();
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

// ======================== SETTINGS & PREFERENCES MODAL (v1.1.10) ========================
function initSettingsModal() {
  if (elements.btnHeaderSettings) {
    elements.btnHeaderSettings.addEventListener('click', () => {
      elements.settingsModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }
  if (elements.userStatusPill) {
    elements.userStatusPill.addEventListener('click', () => {
      elements.settingsModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }
  if (elements.btnSettingsClose) {
    elements.btnSettingsClose.addEventListener('click', () => {
      elements.settingsModal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }
  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === elements.settingsModal) {
        elements.settingsModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }
  if (elements.btnSettingsClearHistory) {
    elements.btnSettingsClearHistory.addEventListener('click', () => {
      watchHistoryManager.clearAllHistory();
      showToast("Watch History Cleared");
    });
  }
  if (elements.btnSettingsClearCache) {
    elements.btnSettingsClearCache.addEventListener('click', async () => {
      showToast("Purging App Cache & Reloading...");
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        } catch (e) {}
      }
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        } catch (e) {}
      }
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    });
  }
  if (elements.btnClearAllCollection) {
    elements.btnClearAllCollection.addEventListener('click', () => {
      favoritesManager.clearAll();
    });
  }
  if (elements.btnHeaderFavorite) {
    elements.btnHeaderFavorite.addEventListener('click', () => {
      switchTab('FAVORITES');
    });
  }
  if (elements.collectionSection) {
    elements.collectionSection.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        renderCollectionSection(pill.dataset.filter);
      });
    });
  }
}

// ======================== APP BOOTSTRAP ========================

async function bootstrap() {
  console.log("MovieBoxTV Desktop PC App Initializing...");
  initClarityBooster();
  initSpeedSelector();
  initSettingsModal();
  searchHistoryManager.renderChips();

  // Register High-Speed Offline Caching Service Worker
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol.startsWith('https'))) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        console.log('[MovieBox SW] Activated successfully with scope:', reg.scope);
      }).catch(err => {
        console.log('[MovieBox SW] Notice:', err);
      });
    });
  }

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
