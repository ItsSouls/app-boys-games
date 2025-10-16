import { videoSeed } from '../data/videoSeed.js';

const API_BASE = process.env.API_BASE || 'https://app-boys-games-backend.onrender.com/api';
const TOKEN = process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error('ADMIN_TOKEN env var required');
  process.exit(1);
}

async function main() {
  for (const video of videoSeed) {
    const payload = {
      title: video.title,
      description: video.description || '',
      embedUrl: video.embedUrl,
      emoji: video.emoji || '🎬',
    };

    const res = await fetch(`${API_BASE}/admin/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to create video', payload.title, err?.error || res.statusText);
      continue;
    }

    const data = await res.json();
    console.log('Created video', data?.video?.title || payload.title);
  }
}

main().catch((err) => {
  console.error('Upload failed', err);
  process.exit(1);
});
