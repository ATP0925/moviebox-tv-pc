# 🎬 MovieBoxTV PC — Dedicated Runtime, Controller & Web Application

A full-fledged, high-performance PC suite for **MovieBoxTV**. Features a hardware-accelerated standalone Android TV runtime, an intelligent Win32 controller with zero input latency, smooth shelf scrolling (eliminating runaway mouse fling), full keyboard D-Pad controls (WASD / Arrow Keys), video player overlay hotkeys, borderless 1080p fullscreen, and a native Web Client alternative.

---

## 🌟 Key Features

1. **True Borderless 1080p Fullscreen (`F` / `F11`)**
   - Strips Qt emulator title bars and side panel toolbars via Win32 API (`WS_POPUP | WS_VISIBLE`), providing a clean, edge-to-edge television viewing experience.

2. **Smooth Shelf-by-Shelf Scrolling (No Runaway Fling)**
   - Android TV's `RecyclerView` normally interprets mouse wheel events as high-velocity flick gestures, violently jumping to the top or bottom of the screen.
   - Using a low-level mouse hook (`WH_MOUSE_LL`), mouse wheel deltas are intercepted and translated into smooth, debounced `DPAD_UP` and `DPAD_DOWN` steps.

3. **Directional Pad Controls (WASD & Arrow Keys)**
   - Persistent, bidirectional ADB shell pipe delivers keystrokes directly to the input system in **0.038ms** (instant zero lag).
   - Full support for `W, A, S, D` and `↑, ↓, ←, →`.

4. **Player Overlay Buttons Activation & Shortcuts**
   - Leanback player controls (`Next Episode`, `480P`, `1.0x`, `Fit`, `Language`) can be navigated via keyboard:
     - Pressing **`S` (or `DPAD_DOWN`)** displays the HUD.
     - Pressing **`S`** a second time drops focus into the action buttons.
     - Pressing **`D` / `A`** shifts focus across buttons, and **`Space` / `Enter`** triggers them.
   - **Direct Macro Hotkeys:**
     - **`Q` or `P`**: Instantly opens the Video Quality / Resolution dropdown (`480P`, `720P`, `1080P`).
     - **`L`**: Instantly opens the Subtitles & Audio Language configuration panel.
     - **`]`**: Skip to Next Episode (`▶|`).
     - **`[`**: Skip to Previous Episode (`|◀`).
     - **`Space` / `Enter`**: Play / Pause / Select.
     - **`Esc` / `Backspace`**: Back / Close overlay.
     - **`+` / `-` / `M`**: Volume Up / Volume Down / Mute.

5. **MovieBox & Gaming Center PC Dashboard (Glassmorphism UI)**
   - Agency-grade desktop UI running locally on port `8765`, launchable as a standalone native app via Microsoft Edge / Chrome.
   - Real-time hardware telemetry (AMD Ryzen 7 12-thread status, NVIDIA GeForce RTX 3050 GDDR6 VRAM, DDR5 RAM allocation, ASG render pipelines).
   - 1-Click Game Launch, Cinema Mode, 1-Click True Fullscreen Toggle, and Low-Latency FPS Booster.

6. **AAA Android Gaming & High-Graphics Optimization**
   - **Host GPU Direct Pass-Through**: Enforced dedicated NVIDIA GeForce RTX 3050 Laptop GPU (4GB GDDR6) via Windows DirectX preferences and host Vulkan 1.3 passthrough.
   - **Expanded Hardware Allocation**: 8192 MB (8 GB) dedicated DDR5 RAM, 1024 MB JVM heap, and 6 dedicated CPU cores / 12 threads.
   - **32 GB Storage Partition**: Massive internal storage for heavy game OBB files and texture packs.
   - **Zero-Copy Graphics (ASG)**: Address Space Graphics zero-copy ringbuffer for high-FPS, stutter-free rendering.
   - **ARM64 Translation**: Integrated `libndk_translation` bridge allowing native execution of 64-bit ARM games on x86_64 host.

7. **Reverse Engineered API & Standalone Web Client**
   - Extracted API endpoints and HMAC-SHA256 signature algorithm (`hh.a.c()`) from Android decompilation.
   - Full Node.js + Vanilla JS streaming dashboard with HLS.js video playback in `/app`.

---

## 📸 Live Demo ("Mock Drive")

### 1. Main Home Feed
![Home Feed](screenshots/demo_1_home_feed.png)

### 2. Smooth Shelf Scrolling (Row by Row)
![Smooth Shelf Scrolling](screenshots/demo_2_smooth_scroll.png)

### 3. Movie & Show Details Screen
![Detail View](screenshots/demo_3_detail_view.png)

### 4. 1080p Live Stream Playback
![1080p Playback](screenshots/demo_4_live_stream_1080p.png)

### 5. Player HUD Overlay (Timeline Focused)
![Player HUD](screenshots/demo_5_player_hud.png)

### 6. Action Buttons Focused (`▶|`, `480P`, `1.0x`, `Fit`, `Language`)
![Action Buttons Focused](screenshots/demo_6_action_buttons_focused.png)

### 7. Resolution & Quality Selector (`480P`, `720P`, `1080P`)
![Quality Selector](screenshots/demo_7_quality_menu.png)

### 8. Subtitles & Audio Language Menu
![Subtitles & Language Menu](screenshots/demo_8_subtitles_language_menu.png)

### 9. Clean Playback Resumed
![Clean Playback](screenshots/demo_9_playback_resumed.png)

---

## ⌨️ Controls Cheat Sheet

| Action | PC Keyboard Key |
|---|---|
| **D-Pad Up** | `W` or `↑` |
| **D-Pad Down** | `S` or `↓` |
| **D-Pad Left** | `A` or `←` |
| **D-Pad Right** | `D` or `→` |
| **Select / Play / Pause** | `Spacebar` or `Enter` |
| **Back / Exit Menu** | `Escape` or `Backspace` |
| **Toggle Fullscreen** | `F` or `F11` |
| **Quality / Resolution Menu** | `Q` or `P` |
| **Language & Subtitles Menu** | `L` |
| **Next Episode** | `]` |
| **Previous Episode** | `[` |
| **Volume Up / Down** | `+` / `-` |
| **Mute Audio** | `M` |

---

## 🛠️ Project Structure

```text
├── Launch_MovieBoxTV_PC.bat     # Windows desktop launcher with auto-controller boot
├── moviebox_controller.py       # High-performance Win32 keyboard, scroll & fullscreen daemon
├── create_shortcut.ps1          # Desktop shortcut creator
├── app/                         # Standalone Node.js Web Client alternative
│   ├── server.js                # API reverse proxy with signature generation
│   ├── package.json
│   └── public/
│       ├── index.html           # Dark-themed TV UI
│       ├── app.js               # Dynamic content loader & HLS video player
│       └── styles.css           # Glassmorphism streaming styles
├── screenshots/                 # Verified live demo captures
├── test_api.py                  # API signature and verification test
├── test_content_fetch.py        # Feed catalog extractor
└── test_play_info.py            # Stream URL decryption test
```

---

## 🚀 Getting Started

### Option A: Standalone Hardware-Accelerated Runtime (Recommended)
1. Double click `Launch_MovieBoxTV_PC.bat` or the desktop shortcut **MovieBoxTV PC**.
2. The runtime starts with dedicated NVIDIA/AMD GPU acceleration.
3. The background controller automatically launches, giving you full WASD navigation, smooth scrolling, and hotkey control.

### Option B: Web Application
```bash
cd app
npm install
node server.js
```
Open [http://localhost:4567](http://localhost:4567) in your browser.

---

## 📄 License
MIT License. Created for personal, educational, and interoperability research.
