let currentSongIndex = 0;
let currentSong = new Audio();
let songs = [];
const currFolder = "songs";

// Shuffle state
let isShuffleOn = false;
let shuffleHistory = []; // store previously played songs for "previous" button

// Utility: convert seconds → MM:SS
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// Fetch song list
async function getSongs() {
  songs = [];
  try {
    const res = await fetch(`${currFolder}/info.json`);
    if (res.ok) {
      const info = await res.json();
      if (Array.isArray(info.songs)) songs = info.songs;
    }
  } catch (err) {
    console.warn("Could not fetch info.json. Using fallback.");
    songs = ["Song1.mp3", "Song2.mp3", "Song3.mp3"];
  }
  renderSongs(songs);
}

// Render song list
function renderSongs(list = songs) {
  const songUL = document.querySelector(".songlist ul");
  songUL.innerHTML = "";
  list.forEach((songFile, index) => {
    const displayName = decodeURIComponent(songFile.replace(/\.mp3$/i, ""));
    const li = document.createElement("li");
    li.setAttribute("data-filename", songFile);
    li.innerHTML = `<div class="info">${displayName}</div>`;
    li.addEventListener("click", () => playMusic(songFile));
    songUL.appendChild(li);
  });
}

// Play a song
function playMusic(track, pause = false) {
  currentSongIndex = songs.findIndex(s => s === track || decodeURIComponent(s) === track);
  if (currentSongIndex < 0) currentSongIndex = 0;

  const cleanTrack = track.split("/").pop().split("\\").pop();
  currentSong.src = `${currFolder}/${encodeURIComponent(cleanTrack)}`;

  if (!pause) {
    currentSong.play();
    document.getElementById("play").src = "pause.svg";
  }

  const displayName = decodeURIComponent(cleanTrack.replace(/\.mp3$/i, ""));
  document.querySelector(".songinfo").textContent = displayName;

  document.querySelectorAll(".songlist ul li").forEach(li => li.classList.remove("playing"));
  const songItems = document.querySelectorAll(".songlist ul li");
  if (songItems[currentSongIndex]) {
    songItems[currentSongIndex].classList.add("playing");
    songItems[currentSongIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Random song index for shuffle
function getRandomSongIndex() {
  if (songs.length <= 1) return 0;
  let randIndex;
  do {
    randIndex = Math.floor(Math.random() * songs.length);
  } while (randIndex === currentSongIndex);
  return randIndex;
}

// Initialize player
async function main() {
  await getSongs();
  if (songs.length > 0) playMusic(songs[0], true);

  const playBtn = document.getElementById("play");
  const nextBtn = document.getElementById("next");
  const prevBtn = document.getElementById("previous");
  const shuffleBtn = document.getElementById("shuffle");
  const currentElem = document.querySelector(".current-time");
  const totalElem = document.querySelector(".total-time");
  const circleElem = document.querySelector(".circle");
  const seekbarElem = document.querySelector(".seekbar");

  let isDragging = false;

  // Play/Pause
  playBtn.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      playBtn.src = "pause.svg";
    } else {
      currentSong.pause();
      playBtn.src = "play.svg";
    }
  });

  // Time update
  currentSong.addEventListener("timeupdate", () => {
    if (!isDragging && currentSong.duration) {
      circleElem.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    }
    currentElem.textContent = secondsToMinutesSeconds(currentSong.currentTime);
    totalElem.textContent = secondsToMinutesSeconds(currentSong.duration);
  });

  // Update total duration once loaded
  currentSong.addEventListener("loadedmetadata", () => {
    totalElem.textContent = secondsToMinutesSeconds(currentSong.duration);
  });

  // Auto-next
  currentSong.addEventListener("ended", () => {
    if (isShuffleOn) {
      shuffleHistory.push(currentSongIndex);
      currentSongIndex = getRandomSongIndex();
    } else {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
    playMusic(songs[currentSongIndex]);
  });

  // Seekbar interaction
  function updateSeek(e) {
    const rect = seekbarElem.getBoundingClientRect();
    let offsetX = e.clientX - rect.left;
    offsetX = Math.max(0, Math.min(offsetX, rect.width));
    const percent = offsetX / rect.width;
    circleElem.style.left = percent * 100 + "%";
    currentSong.currentTime = currentSong.duration * percent;
  }

  seekbarElem.addEventListener("mousedown", (e) => {
    isDragging = true;
    updateSeek(e);
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) updateSeek(e);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) isDragging = false;
  });

  // Next/Previous
  nextBtn.addEventListener("click", () => {
    if (isShuffleOn) {
      shuffleHistory.push(currentSongIndex);
      currentSongIndex = getRandomSongIndex();
    } else {
      currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
    playMusic(songs[currentSongIndex]);
  });

  prevBtn.addEventListener("click", () => {
    if (isShuffleOn && shuffleHistory.length > 0) {
      currentSongIndex = shuffleHistory.pop();
    } else {
      currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    }
    playMusic(songs[currentSongIndex]);
  });

  // Shuffle toggle
  shuffleBtn.addEventListener("click", () => {
    isShuffleOn = !isShuffleOn;
    shuffleBtn.classList.toggle("active", isShuffleOn);
    if (isShuffleOn) shuffleHistory = [];
  });

  // Search filter (smart)
  document.querySelector(".search-box").addEventListener("input", e => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderSongs(songs);
      return;
    }

    const queryWords = query.split(/\s+/);

    const filteredAndSorted = songs
      .map(song => {
        const name = decodeURIComponent(song).replace(/\.mp3$/i, "").toLowerCase();
        const nameWords = name.split(/\s|_|-/).filter(Boolean);
        let matchCount = 0;
        queryWords.forEach(qw => {
          if (nameWords.some(word => word.includes(qw))) matchCount++;
        });
        const allWordsExist = queryWords.every(qw =>
          nameWords.some(word => word.includes(qw))
        );
        return { song, name, matchCount, allWordsExist };
      })
      .filter(item => item.allWordsExist)
      .sort((a, b) => {
        const aStarts = a.name.startsWith(query) ? 1 : 0;
        const bStarts = b.name.startsWith(query) ? 1 : 0;
        if (bStarts - aStarts !== 0) return bStarts - aStarts;
        if (b.matchCount - a.matchCount !== 0) return b.matchCount - a.matchCount;
        return a.name.localeCompare(b.name);
      })
      .map(item => item.song);

    renderSongs(filteredAndSorted);
  });
}

main();
