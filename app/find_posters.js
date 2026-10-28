const https = require('https');
const http = require('http');

function optimizePosterUrl(url, targetWidth = 340) {
  if (!url || typeof url !== 'string') return '';

  if (url.includes('media-amazon.com') || url.includes('imdb.com')) {
    let opt = url;
    if (opt.includes('_FMjpg_')) {
      opt = opt.replace(/_FMjpg_/, '_FMwebp_');
    } else if (opt.includes('_V1_') && !opt.includes('_FMwebp_')) {
      opt = opt.replace(/_V1_/, '_V1_FMwebp_');
    }
    if (opt.includes('_QL')) {
      opt = opt.replace(/_QL\d+_/, '_QL65_');
    } else if (opt.includes('_FMwebp_')) {
      opt = opt.replace(/_FMwebp_/, '_FMwebp_QL65_');
    }
    if (/_UX\d+_/.test(opt)) {
      opt = opt.replace(/_UX\d+_/, `_UX${targetWidth}_`);
    } else if (/_UY\d+_/.test(opt)) {
      opt = opt.replace(/_UY\d+_/, `_UY${Math.round(targetWidth * 1.5)}_`);
    } else if (opt.includes('_V1_')) {
      opt = opt.replace(/_V1_/, `_V1_UX${targetWidth}_`);
    }
    return opt;
  }

  if (url.includes('images.unsplash.com')) {
    if (url.includes('w=')) {
      return url.replace(/w=\d+/, `w=${targetWidth}`).replace(/q=\d+/, 'q=65').replace(/fm=\w+/, 'fm=webp') + (url.includes('fm=') ? '' : '&fm=webp');
    }
    return `${url}&w=${targetWidth}&q=65&fm=webp&fit=crop&auto=format`;
  }

  if (url.includes('image.tmdb.org')) {
    const size = targetWidth > 600 ? 'w780' : (targetWidth > 300 ? 'w342' : 'w185');
    return url.replace(/\/original\//, `/${size}/`).replace(/\/w500\//, `/${size}/`);
  }

  return url;
}

const list = [
  { id: 0, title: "The Dog Stars", url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80" },
  { id: 1, title: "Deadpool & Wolverine", url: "https://m.media-amazon.com/images/M/MV5BZTk5ODY0MmQtMzA3Ni00NGY1LThiYzItZThiNjFiNDM4MTM3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" },
  { id: 2, title: "Stranger Things: Season 5", url: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg" },
  { id: 3, title: "Animal", url: "https://image.tmdb.org/t/p/w500/pwBtk8ngoMtqn0qv8j1feSFTKUn.jpg" },
  { id: 4, title: "Avatar: Fire and Ash", url: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg" },
  { id: 5, title: "Jawan", url: "https://image.tmdb.org/t/p/w500/jFt1gS4BGHlK8xt76Y81Alp4dbt.jpg" },
  { id: 6, title: "Dune: Part Two", url: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg" },
  { id: 7, title: "Oppenheimer", url: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  { id: 8, title: "Solo Leveling", url: "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg" },
  { id: 9, title: "Jujutsu Kaisen", url: "https://image.tmdb.org/t/p/w500/6qQzMJG27XOJsyAEEIisoJB45j2.jpg" },
  { id: 10, title: "Pushpa 2: The Rule", url: "https://image.tmdb.org/t/p/w500/1T21FblunT0y8fz7YaW8JMYgUKm.jpg" },
  { id: 11, title: "Interstellar", url: "https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg" }
];

list.forEach(item => {
  const optimized = optimizePosterUrl(item.url, 340);
  const client = optimized.startsWith('https') ? https : http;
  client.get(optimized, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    console.log(`[STATUS ${res.statusCode}] #${item.id} ${item.title} -> ${res.headers['content-type']}, ${res.headers['content-length']} bytes`);
  }).on('error', err => {
    console.log(`[ERR] #${item.id} ${item.title} -> ${err.message}`);
  });
});
