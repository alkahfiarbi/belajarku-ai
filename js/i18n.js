// i18n.js
//
// User-interface strings for BelajarKu AI, in English (default — the
// hackathon requires the app to support English) and Bahasa Indonesia
// (the audience story: Indonesian students on phones).
//
// t(key, lang) returns the string for `lang` ('en' | 'id'), falling back
// to English for missing keys.

const STRINGS = {
  'app.tagline': {
    en: 'Study smarter — on-device first, cloud when it matters.',
    id: 'Belajar lebih pintar — di perangkat dulu, cloud saat perlu.',
  },
  'app.intro': {
    en: 'Paste your study material, then let AI turn it into a summary, flashcards, a quiz — or just ask it a question. Short work runs on your device (private, offline, free). Long work goes to the cloud.',
    id: 'Tempel materi belajarmu, lalu biarkan AI mengubahnya jadi ringkasan, kartu flash, kuis — atau tanyakan saja. Pekerjaan singkat berjalan di perangkatmu (privat, offline, gratis). Materi panjang dikirim ke cloud.',
  },
  'status.firebase-missing': {
    en: 'Demo mode: Firebase is not connected yet. The app works, but AI calls need a Firebase project — see README.md, section "Connect Firebase".',
    id: 'Mode demo: Firebase belum terhubung. Aplikasi tetap jalan, tapi panggilan AI butuh proyek Firebase — lihat README.md, bagian "Connect Firebase".',
  },
  'status.firebase-ok': {
    en: 'Firebase connected.',
    id: 'Firebase terhubung.',
  },
  'status.device-checking': {
    en: 'Checking on-device model…',
    id: 'Memeriksa model di perangkat…',
  },
  'status.device-available': {
    en: 'On-device model ready (Gemini Nano)',
    id: 'Model di perangkat siap (Gemini Nano)',
  },
  'status.device-downloading': {
    en: 'On-device model downloading…',
    id: 'Model di perangkat sedang diunduh…',
  },
  'status.device-downloadable': {
    en: 'On-device model can be downloaded',
    id: 'Model di perangkat bisa diunduh',
  },
  'status.device-unavailable': {
    en: 'On-device model not available on this browser — cloud will be used',
    id: 'Model di perangkat tidak tersedia di browser ini — cloud yang akan dipakai',
  },
  'status.device-unsupported': {
    en: 'This browser has no on-device model (needs Chrome 139+ on desktop)',
    id: 'Browser ini tidak punya model di perangkat (butuh Chrome 139+ di desktop)',
  },
  'status.signed-out': {
    en: 'Not signed in — saved sets stay on this device only',
    id: 'Belum masuk — set yang disimpan hanya ada di perangkat ini',
  },
  'status.signed-in-anon': {
    en: 'Signed in anonymously — sets are saved to your account',
    id: 'Masuk sebagai tamu — set tersimpan di akunmu',
  },
  'label.material': {
    en: 'Study material',
    id: 'Materi belajar',
  },
  'label.material-placeholder': {
    en: 'Paste lecture notes, a textbook page, an article… anything you need to study.',
    id: 'Tempel catatan kuliah, halaman buku, artikel… apa pun yang perlu dipelajari.',
  },
  'label.sample-id': {
    en: 'Load sample (Indonesian)',
    id: 'Muat contoh (Indonesia)',
  },
  'label.sample-en': {
    en: 'Load sample (English)',
    id: 'Muat contoh (Inggris)',
  },
  'label.mode': {
    en: 'Inference mode',
    id: 'Mode inferensi',
  },
  'mode.auto': {
    en: 'Auto — on-device first, cloud fallback',
    id: 'Otomatis — perangkat dulu, cloud sebagai cadangan',
  },
  'mode.on-device': {
    en: 'On-device only',
    id: 'Hanya di perangkat',
  },
  'mode.cloud': {
    en: 'Cloud only',
    id: 'Hanya cloud',
  },
  'tool.summary': {
    en: 'Summary',
    id: 'Ringkasan',
  },
  'tool.flashcards': {
    en: 'Flashcards',
    id: 'Kartu flash',
  },
  'tool.quiz': {
    en: 'Quiz',
    id: 'Kuis',
  },
  'tool.ask': {
    en: 'Ask a question',
    id: 'Tanya jawab',
  },
  'action.run': {
    en: 'Run',
    id: 'Jalankan',
  },
  'action.prepare-device': {
    en: 'Prepare on-device model',
    id: 'Siapkan model di perangkat',
  },
  'action.save-set': {
    en: 'Save this study set',
    id: 'Simpan set belajar ini',
  },
  'action.sign-in': {
    en: 'Sign in anonymously',
    id: 'Masuk sebagai tamu',
  },
  'label.ask-placeholder': {
    en: 'Ask something about the material above…',
    id: 'Tanyakan sesuatu tentang materi di atas…',
  },
  'label.your-question': {
    en: 'Your question',
    id: 'Pertanyaanmu',
  },
  'badge.on-device': {
    en: 'On-device · Gemini Nano — private · offline · free',
    id: 'Di perangkat · Gemini Nano — privat · offline · gratis',
  },
  'badge.cloud': {
    en: 'Cloud · gemini-3.5-flash-lite',
    id: 'Cloud · gemini-3.5-flash-lite',
  },
  'route.auto-device': {
    en: 'Short material + local model ready, so this ran on your device.',
    id: 'Materi singkat + model lokal siap, jadi ini berjalan di perangkatmu.',
  },
  'route.auto-too-long': {
    en: 'Material is longer than the on-device limit, so this went to the cloud for better quality.',
    id: 'Materi lebih panjang dari batas perangkat, jadi ini dikirim ke cloud demi kualitas.',
  },
  'route.auto-no-device': {
    en: 'No on-device model on this browser, so this went to the cloud.',
    id: 'Tidak ada model di perangkat pada browser ini, jadi ini dikirim ke cloud.',
  },
  'route.offline-device': {
    en: 'You are offline — this ran on your device.',
    id: 'Kamu sedang offline — ini berjalan di perangkatmu.',
  },
  'route.mode-on-device': {
    en: 'You chose on-device only.',
    id: 'Kamu memilih hanya di perangkat.',
  },
  'route.mode-cloud': {
    en: 'You chose cloud only.',
    id: 'Kamu memilih hanya cloud.',
  },
  'route.on-device-unavailable': {
    en: 'On-device model is not available on this browser. Switch to Auto or Cloud mode, or open this page in Chrome 139+ on desktop.',
    id: 'Model di perangkat tidak tersedia di browser ini. Pindah ke mode Otomatis atau Cloud, atau buka halaman ini di Chrome 139+ di desktop.',
  },
  'route.too-long-for-device': {
    en: 'This material is too long for the on-device model. Shorten it or switch to Auto / Cloud mode.',
    id: 'Materi ini terlalu panjang untuk model di perangkat. Persingkat atau pindah ke mode Otomatis / Cloud.',
  },
  'route.offline-no-cloud': {
    en: 'You are offline and Cloud mode needs internet. Switch to Auto or On-device mode.',
    id: 'Kamu sedang offline dan mode Cloud butuh internet. Pindah ke mode Otomatis atau Di perangkat.',
  },
  'route.offline-no-device': {
    en: 'You are offline and there is no on-device model on this browser, so nothing can answer right now.',
    id: 'Kamu sedang offline dan tidak ada model di perangkat pada browser ini, jadi belum ada yang bisa menjawab.',
  },
  'error.no-material': {
    en: 'Paste some study material first.',
    id: 'Tempel materi belajar dulu.',
  },
  'error.no-question': {
    en: 'Type a question first.',
    id: 'Tulis pertanyaan dulu.',
  },
  'error.firebase-missing': {
    en: 'Firebase is not connected. Follow README.md → "Connect Firebase" to enable AI.',
    id: 'Firebase belum terhubung. Ikuti README.md → "Connect Firebase" untuk mengaktifkan AI.',
  },
  'error.ai-failed': {
    en: 'The AI call failed. Check your connection and Firebase setup, then try again.',
    id: 'Panggilan AI gagal. Periksa koneksi dan pengaturan Firebase, lalu coba lagi.',
  },
  'error.no-cards': {
    en: 'The model did not return usable flashcards. Try again or shorten the material.',
    id: 'Model tidak mengembalikan kartu flash yang bisa dipakai. Coba lagi atau persingkat materi.',
  },
  'error.no-questions': {
    en: 'The model did not return usable quiz questions. Try again or shorten the material.',
    id: 'Model tidak mengembalikan soal kuis yang bisa dipakai. Coba lagi atau persingkat materi.',
  },
  'label.key-terms': {
    en: 'Key terms',
    id: 'Istilah kunci',
  },
  'label.known': {
    en: 'Known',
    id: 'Sudah hafal',
  },
  'label.unknown': {
    en: 'Still learning',
    id: 'Masih belajar',
  },
  'label.flip': {
    en: 'Tap card to flip',
    id: 'Ketuk kartu untuk membalik',
  },
  'label.score': {
    en: 'Score',
    id: 'Skor',
  },
  'label.correct': {
    en: 'Correct!',
    id: 'Benar!',
  },
  'label.wrong': {
    en: 'Not quite — the correct answer is:',
    id: 'Belum tepat — jawaban yang benar:',
  },
  'label.why': {
    en: 'Why:',
    id: 'Alasannya:',
  },
  'label.next': {
    en: 'Next',
    id: 'Lanjut',
  },
  'label.restart-quiz': {
    en: 'Restart quiz',
    id: 'Ulangi kuis',
  },
  'label.saved-sets': {
    en: 'Saved study sets',
    id: 'Set belajar tersimpan',
  },
  'label.no-saved-sets': {
    en: 'No saved sets yet. Generate something, then save it.',
    id: 'Belum ada set tersimpan. Buat sesuatu dulu, lalu simpan.',
  },
  'label.delete': {
    en: 'Delete',
    id: 'Hapus',
  },
  'label.open': {
    en: 'Open',
    id: 'Buka',
  },
  'label.how-it-works': {
    en: 'How the hybrid part works',
    id: 'Cara kerja bagian hybrid',
  },
  'text.how-it-works': {
    en: 'Every request is single-turn text. In Auto mode the app first asks Chrome’s on-device model (Gemini Nano). If the material is short and the model is ready, the answer never leaves your device — private, offline, free. If the material is long, or the device has no local model, the same prompt goes to Gemini in the cloud instead. The badge above each result shows which path answered.',
    id: 'Setiap permintaan adalah teks satu putaran. Dalam mode Otomatis, aplikasi pertama-tama meminta model di perangkat (Gemini Nano) di Chrome. Jika materi singkat dan model siap, jawaban tidak pernah meninggalkan perangkatmu — privat, offline, gratis. Jika materi panjang, atau perangkat tidak punya model lokal, prompt yang sama dikirim ke Gemini di cloud. Lencana di atas setiap hasil menunjukkan jalur mana yang menjawab.',
  },
};

export function t(key, lang) {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

export function supportedLangs() {
  return ['en', 'id'];
}
