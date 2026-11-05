(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const audio = $('audio');
  const filePicker = $('filePicker');
  const playlist = [];
  let currentIndex = -1;
  let shuffle = false;
  let repeat = 'off'; // off | all | one
  let shuffledHistory = [];
  let sortAZ = false;
  let isSeeking = false;
  let toastTimer;

  const icons = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>'
  };
  const toast = message => {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  };
  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60), secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };
  const cleanName = name => name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Lagu tanpa judul';
  const currentTrack = () => playlist[currentIndex] || null;

  function updateCover(track) {
    const art = $('coverArt');
    const palettes = [
      ['#344c40','#1e3938','#172b2f','#283427'],
      ['#554137','#3b2d32','#252b33','#34303a'],
      ['#344756','#293847','#202b3a','#35364a'],
      ['#594c36','#46352f','#263431','#3c4031'],
      ['#4b3853','#342c49','#1e303a','#37413c'],
      ['#3c5147','#25413f','#1d3030','#414533'],
      ['#544144','#3d3138','#263437','#3d3e34']
    ];
    const p = palettes[Math.max(0, currentIndex) % palettes.length];
    art.style.background = `linear-gradient(142deg,${p[0]} 0%,${p[1]} 38%,${p[2]} 69%,${p[3]} 100%)`;
    $('coverTitle').innerHTML = track ? escapeHtml(track.title).replace(/\s+/g, '<br>') : 'Temukan<br>irama baru.';
    $('trackTitle').textContent = track ? track.title : 'Belum ada lagu';
    $('trackArtist').textContent = track ? (track.artist || 'Berkas audio lokal') : 'Tambahkan MP3 untuk mulai mendengarkan';
    $('trackSource').textContent = track ? 'DIPUTAR DARI PERANGKAT' : 'PILIH LAGU DARI PERANGKAT';
    $('favoriteBtn').classList.toggle('active', Boolean(track?.favorite));
    $('favoriteBtn').setAttribute('aria-pressed', String(Boolean(track?.favorite)));
    $('coverArt').setAttribute('aria-label', track ? `Cover ilustrasi untuk ${track.title}` : 'Cover album Ridho Music');
    updateMediaSession(track);
  }
  function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function filteredIndices() {
    const query = $('searchInput').value.trim().toLocaleLowerCase();
    let indices = playlist.map((_, i) => i).filter(i => !query || `${playlist[i].title} ${playlist[i].artist}`.toLocaleLowerCase().includes(query));
    if (sortAZ) indices = indices.sort((a,b) => playlist[a].title.localeCompare(playlist[b].title, 'id'));
    return indices;
  }
  function renderPlaylist() {
    const list = $('playlistList'); list.replaceChildren();
    const indices = filteredIndices();
    for (const i of indices) {
      const track = playlist[i], row = document.createElement('button');
      row.type = 'button'; row.className = `track-row${i === currentIndex ? ' current' : ''}`; row.setAttribute('role','listitem');
      row.setAttribute('aria-label', `${i === currentIndex && !audio.paused ? 'Sedang diputar: ' : 'Putar '}${track.title}, ${formatTime(track.duration)}`);
      row.innerHTML = `<span class="row-play">${i === currentIndex && !audio.paused ? icons.pause : icons.play}</span><span class="row-copy"><span class="row-title">${escapeHtml(track.title)}</span><span class="row-artist">${escapeHtml(track.artist || 'Berkas audio lokal')}</span></span><span class="row-duration">${formatTime(track.duration)}</span>`;
      row.addEventListener('click', () => playTrack(i)); list.appendChild(row);
    }
    $('playlistCount').textContent = playlist.length;
    $('emptyState').classList.toggle('visible', playlist.length === 0);
    $('playlistMeta').style.display = playlist.length ? 'flex' : 'none';
    $('clearPlaylist').disabled = playlist.length === 0;
    $('previousBtn').disabled = $('nextBtn').disabled = playlist.length < 2;
    const total = playlist.reduce((sum,t) => sum + (t.duration || 0), 0);
    $('totalTime').textContent = `${formatTime(total).padStart(4,'0')} TOTAL`;
  }
  function updatePlayState() {
    const playing = !audio.paused && !audio.ended;
    $('playBtn').classList.toggle('playing', playing);
    $('playBtn').setAttribute('aria-label', playing ? 'Jeda' : 'Putar');
    renderPlaylist();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }
  function updateProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!isSeeking) {
      const value = duration ? Math.round(audio.currentTime / duration * 1000) : 0;
      $('seekBar').value = value;
      $('seekBar').style.setProperty('--progress', `${value / 10}%`);
    }
    $('currentTime').textContent = formatTime(audio.currentTime);
    $('duration').textContent = formatTime(duration);
  }
  function setRepeat(mode) {
    repeat = mode; audio.loop = mode === 'one';
    const button = $('repeatBtn'); button.classList.toggle('active', mode !== 'off'); button.classList.toggle('one', mode === 'one');
    button.setAttribute('aria-pressed', String(mode !== 'off'));
    button.setAttribute('aria-label', `Ulang ${mode === 'off' ? 'mati' : mode === 'all' ? 'semua lagu' : 'satu lagu'}`);
    $('playerMessage').textContent = mode === 'one' ? 'Mode ulang satu lagu aktif.' : mode === 'all' ? 'Mode ulang playlist aktif.' : (playlist.length ? 'Musik tersimpan lokal di perangkat.' : 'Pilih satu atau beberapa file audio dari HP kamu.');
  }
  function updateMediaSession(track) {
    if (!('mediaSession' in navigator) || !track) return;
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist || 'Ridho Music', album: 'Playlist lokal' }); } catch (_) {}
  }
  function configureMediaActions() {
    if (!('mediaSession' in navigator)) return;
    const actions = { play: () => audio.play(), pause: () => audio.pause(), previoustrack: previousTrack, nexttrack: nextTrack, seekbackward: () => { audio.currentTime = Math.max(0, audio.currentTime - 10); }, seekforward: () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10); }, seekto: details => { if (Number.isFinite(details.seekTime)) audio.currentTime = details.seekTime; } };
    for (const [name, handler] of Object.entries(actions)) { try { navigator.mediaSession.setActionHandler(name, handler); } catch (_) {} }
  }
  function chooseNextIndex() {
    if (playlist.length < 2) return currentIndex;
    if (!shuffle) return currentIndex + 1 < playlist.length ? currentIndex + 1 : (repeat === 'all' ? 0 : -1);
    const candidates = playlist.map((_,i) => i).filter(i => i !== currentIndex);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    if (currentIndex >= 0) shuffledHistory.push(currentIndex);
    return next;
  }
  async function playTrack(index, autoplay = true) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    audio.src = playlist[index].url;
    audio.loop = repeat === 'one';
    $('seekBar').disabled = false;
    updateCover(playlist[index]); renderPlaylist(); updateProgress();
    $('playerMessage').textContent = 'Memuat lagu…';
    if (!autoplay) { audio.load(); updatePlayState(); return; }
    try { await audio.play(); $('playerMessage').textContent = 'Musik tersimpan lokal di perangkat.'; }
    catch (error) { $('playerMessage').textContent = 'Tekan tombol putar untuk mulai mendengarkan.'; if (error?.name !== 'AbortError') toast('File ini tidak dapat diputar di browser.'); }
    updatePlayState();
  }
  async function nextTrack() {
    if (!playlist.length) return;
    if (repeat === 'one' && currentIndex >= 0) { audio.currentTime = 0; try { await audio.play(); } catch (_) {} return; }
    const next = chooseNextIndex();
    if (next >= 0) await playTrack(next);
    else { audio.pause(); audio.currentTime = 0; updateProgress(); updatePlayState(); }
  }
  async function previousTrack() {
    if (!playlist.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    let previous = -1;
    if (shuffle && shuffledHistory.length) previous = shuffledHistory.pop();
    else if (currentIndex > 0) previous = currentIndex - 1;
    else if (repeat === 'all' && playlist.length > 1) previous = playlist.length - 1;
    if (previous >= 0) await playTrack(previous);
    else audio.currentTime = 0;
  }
  async function togglePlayback() {
    if (!playlist.length) { filePicker.click(); return; }
    if (audio.paused) {
      if (!audio.src && currentIndex >= 0) audio.src = playlist[currentIndex].url;
      try { await audio.play(); $('playerMessage').textContent = 'Musik tersimpan lokal di perangkat.'; }
      catch (_) { toast('Tekan putar lagi untuk memulai audio.'); }
    } else audio.pause();
    updatePlayState();
  }
  function addFiles(files) {
    const selected = [...files].filter(file => file.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|wav|flac|opus|webm)$/i.test(file.name));
    if (!selected.length) { toast('Pilih file audio seperti MP3.'); return; }
    const start = playlist.length;
    selected.forEach(file => playlist.push({ file, url: URL.createObjectURL(file), title: cleanName(file.name), artist: 'Berkas audio lokal', duration: 0, favorite: false }));
    renderPlaylist(); toast(`${selected.length} lagu ditambahkan ke playlist.`);
    if (currentIndex < 0) playTrack(start);
    else $('playerMessage').textContent = 'Musik tersimpan lokal di perangkat.';
    filePicker.value = '';
  }
  function clearPlaylist() {
    audio.pause(); audio.removeAttribute('src'); audio.load();
    playlist.forEach(track => URL.revokeObjectURL(track.url)); playlist.length = 0; currentIndex = -1; shuffledHistory = [];
    $('seekBar').value = 0; $('seekBar').disabled = true; $('seekBar').style.setProperty('--progress','0%');
    $('currentTime').textContent = $('duration').textContent = '0:00'; $('playerMessage').textContent = 'Pilih satu atau beberapa file audio dari HP kamu.';
    updateCover(null); updatePlayState(); renderPlaylist();
  }

  $('addMusic').addEventListener('click', () => filePicker.click());
  $('emptyAdd').addEventListener('click', () => filePicker.click());
  filePicker.addEventListener('change', e => addFiles(e.target.files));
  $('playBtn').addEventListener('click', togglePlayback);
  $('previousBtn').addEventListener('click', previousTrack);
  $('nextBtn').addEventListener('click', nextTrack);
  $('shuffleBtn').addEventListener('click', () => { shuffle = !shuffle; $('shuffleBtn').classList.toggle('active', shuffle); $('shuffleBtn').setAttribute('aria-pressed', String(shuffle)); $('shuffleBtn').setAttribute('aria-label', shuffle ? 'Acak aktif' : 'Acak mati'); if (!shuffle) shuffledHistory = []; toast(shuffle ? 'Mode acak aktif' : 'Mode acak dimatikan'); });
  $('repeatBtn').addEventListener('click', () => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'));
  $('seekBar').addEventListener('input', () => { isSeeking = true; const value = Number($('seekBar').value); $('seekBar').style.setProperty('--progress', `${value / 10}%`); if (Number.isFinite(audio.duration)) $('currentTime').textContent = formatTime(audio.duration * value / 1000); });
  $('seekBar').addEventListener('change', () => { if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number($('seekBar').value) / 1000; isSeeking = false; updateProgress(); });
  $('volumeBar').addEventListener('input', () => { audio.volume = Number($('volumeBar').value) / 100; $('volumeLabel').textContent = $('volumeBar').value; $('volumeBar').style.setProperty('--progress', `${$('volumeBar').value}%`); try { localStorage.setItem('ridho-volume', $('volumeBar').value); } catch (_) {} });
  $('favoriteBtn').addEventListener('click', () => { const track = currentTrack(); if (!track) { toast('Putar lagu terlebih dahulu.'); return; } track.favorite = !track.favorite; updateCover(track); toast(track.favorite ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit'); });
  $('searchInput').addEventListener('input', renderPlaylist);
  $('sortBtn').addEventListener('click', () => { sortAZ = !sortAZ; $('sortBtn').title = sortAZ ? 'Urutan A–Z' : 'Urutan ditambahkan'; $('sortBtn').setAttribute('aria-label', $('sortBtn').title); renderPlaylist(); });
  $('clearPlaylist').addEventListener('click', clearPlaylist);
  audio.addEventListener('loadedmetadata', () => { const track = currentTrack(); if (track) track.duration = Number.isFinite(audio.duration) ? audio.duration : 0; updateProgress(); renderPlaylist(); });
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('durationchange', updateProgress);
  audio.addEventListener('play', updatePlayState);
  audio.addEventListener('pause', updatePlayState);
  audio.addEventListener('ended', () => { if (repeat === 'one') return; if (repeat === 'all' || (shuffle && playlist.length > 1) || currentIndex < playlist.length - 1) nextTrack(); else updatePlayState(); });
  audio.addEventListener('error', () => { if (currentTrack()) { $('playerMessage').textContent = 'Format file tidak didukung atau file tidak dapat dibaca.'; toast('Audio tidak dapat diputar.'); } });
  window.addEventListener('keydown', e => { if (e.target.matches('input')) return; if (e.code === 'Space') { e.preventDefault(); togglePlayback(); } else if (e.code === 'ArrowRight' && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); else if (e.code === 'ArrowLeft' && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, audio.currentTime - 5); });
  window.addEventListener('pagehide', () => playlist.forEach(track => URL.revokeObjectURL(track.url)));

  try { const storedVolume = localStorage.getItem('ridho-volume'); const savedVolume = storedVolume === null ? NaN : Number(storedVolume); if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) $('volumeBar').value = savedVolume; } catch (_) {}
  audio.volume = Number($('volumeBar').value) / 100; $('volumeLabel').textContent = $('volumeBar').value; $('volumeBar').style.setProperty('--progress', `${$('volumeBar').value}%`);
  configureMediaActions(); updateCover(null); renderPlaylist(); setRepeat('off');
})();
