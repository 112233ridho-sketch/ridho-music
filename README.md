# Ridho Music

Pemutar musik lokal dengan tema gelap, dibuat memakai HTML, CSS, dan JavaScript. File audio dipilih langsung dari perangkat dan diputar menggunakan pemutar audio browser/WebView.

## Jalankan di Android atau browser

Cara paling sederhana: buka `www/index.html` di browser. Untuk menjalankan lewat server dari folder `ridho-music`:

```sh
python -m http.server 8081 --directory www
```

Buka `http://localhost:8081` di browser. Tekan **Tambah lagu** atau **Pilih file audio**, lalu pilih satu atau beberapa lagu dari penyimpanan HP.

## Fitur

- Memilih beberapa file audio lokal, termasuk MP3.
- Play/pause, next/previous, dan playlist yang bisa dicari serta diurutkan.
- Progress yang bisa digeser, kontrol volume, shuffle, dan repeat mati/playlist/satu lagu.
- Cover ilustrasi yang berubah warna mengikuti lagu dan penanda favorit sesi.
- Kontrol media lock-screen melalui Media Session jika browser mendukungnya.
- Volume disimpan di perangkat; playlist file lokal sengaja tidak disimpan setelah halaman ditutup.

## Persiapan APK Android dengan Capacitor

Proyek sudah memiliki `package.json`, `capacitor.config.json`, dan web root `www/`. Gunakan Node.js 22+, Android Studio, dan Android SDK sesuai kebutuhan Capacitor 8. Dari folder proyek:

```sh
npm install
npx cap add android
npx cap sync android
npx cap open android
```

Di Android Studio, build APK melalui **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Setelah mengubah file di `www`, jalankan `npx cap sync android` lagi.

Untuk build lewat terminal setelah proyek Android dibuat:

```sh
npm run android:debug
```

Paket Capacitor 8 mengikuti panduan resmi instalasi Capacitor: https://capacitorjs.com/docs/getting-started
