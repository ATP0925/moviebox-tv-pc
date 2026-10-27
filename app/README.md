# 🎬 MovieBox Cinema Web App

A high-performance modern cinema web streaming platform featuring 1080p/4K playback, real-time watch progress tracking ("Kitna dekha, kitna baaki hai"), continue watching shelves, recent search history, multi-language subtitles, and HD clarity enhancement.

---

## 🚀 Features

- **Ultra HD 1080p Streaming:** Automatically selects top bitrate stream source.
- **✨ HD Clarity Booster:** Studio-grade contrast and saturation filters for vibrant cinema visuals.
- **🕒 Smart Watch History:**
  - Real-time timestamp tracking every 4 seconds.
  - Formatted remaining time badges (e.g. `45m left`, `1h 12m left`).
  - Home carousel shelf: **Continue Watching** with progress bars and 1-click resume.
  - Dedicated **History** page with complete statistics and management.
- **🔍 Search History & Quick Chips:** Instant recall of recent queries and 1-click search chips.
- **🌐 Multi-Language Subtitles:** Direct SRT captions in Hindi, English, Spanish, Arabic, French, and more.
- **🛡️ Anonymous & Secure:** Zero personal credentials leaked, strict security headers enabled (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`).

---

## 🛠️ Deploy to Vercel (Auto-Deploy via GitHub)

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MovieBox Cinema Web App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/moviebox-cinema.git
   git push -u origin main
   ```
2. Log in to [vercel.com](https://vercel.com).
3. Click **"Add New"** > **"Project"**.
4. Import your `moviebox-cinema` repository.
5. Keep default settings (`Framework Preset: Other`, Root directory: `./`).
6. Click **Deploy**. Vercel will automatically build and host your full-stack app with free global CDN & serverless API routes!

---

## 🔥 Deploy to Firebase Hosting

This project is linked to Firebase project `mbox-cinema-9182a`:
```bash
npx -y firebase-tools@latest deploy --only hosting
```
Live URL: [https://mbox-cinema-9182a.web.app](https://mbox-cinema-9182a.web.app)

---

## 💻 Local Development

```bash
npm install
npm start
```
Open [http://localhost:4567](http://localhost:4567) in your browser.
