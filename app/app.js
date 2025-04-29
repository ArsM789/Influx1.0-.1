// const btnSidebarToggle = document.getElementById("btn-sidebar-toggle");

// btnSidebarToggle.addEventListener("click", () => {
//   const aside = document.querySelector(".aside");
//   aside.classList.toggle("active");
// });

// Импортируем данные треков
import { data as tracks } from "./data.js";

// Получаем все необходимые элементы
const musicList = document.querySelector(".musick-list-item-content");
const playButton = document.querySelector(".button-play");
const prevButton = document.querySelector(".button-prev");
const nextButton = document.querySelector(".button-next");
const progressBar = document.querySelector(".progress-bar");
const progressBarFill = document.querySelector(".progress-bar-fill");
const currentTime = document.querySelector(".time-current");
const totalTime = document.querySelector(".time-duration");
const volumeIcon = document.querySelector(".volume-icon");
const replayButton = document.querySelector(".replay-button-button");
const shuffleButton = document.querySelector(".shuffle-button-button");
const coverImg = document.getElementById("cover-track-player");

// Получаем элементы управления громкостью
const volumeSlider = document.querySelector(".volume-slider");
const volumeProgress = document.querySelector(".volume-slider-progress");

// Создаем аудио объект
const audio = new Audio();

// Загружаем состояние из localStorage
const loadState = () => {
  const savedState = localStorage.getItem("playerState");
  if (savedState) {
    const state = JSON.parse(savedState);
    currentTrackIndex = state.currentTrackIndex || 0;
    audio.volume = state.volume || 1;
    if (state.currentTime) {
      audio.currentTime = state.currentTime;
    }
    isMuted = state.isMuted || false;
    isReplayEnabled = state.isReplayEnabled || false;
    isShuffleEnabled = state.isShuffleEnabled || false;

    // Если режим перемешивания включен, создаем перемешанный плейлист
    if (isShuffleEnabled) {
      shuffledPlaylist = shuffleArray(tracks);
      shuffleButton.classList.add("active");
      shuffleButton.style.color = "var(--color-accent)";
    }

    // Обновляем визуальное отображение кнопки повтора
    if (isReplayEnabled) {
      replayButton.classList.add("active");
      replayButton.style.color = "var(--color-accent)";
    }

    // Обновляем визуальное отображение громкости
    volumeProgress.style.width = `${audio.volume * 100}%`;

    if (isMuted) {
      audio.volume = 0;
      volumeIcon.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      volumeProgress.style.width = "0%";
    }
  }
};

// Сохраняем состояние в localStorage
const saveState = () => {
  const state = {
    currentTrackIndex,
    volume: audio.volume,
    currentTime: audio.currentTime,
    isMuted,
    isReplayEnabled,
    isShuffleEnabled,
  };
  localStorage.setItem("playerState", JSON.stringify(state));
};

// Состояние плеера
let isPlaying = false;
let currentTrackIndex = 0;
let isMuted = false;
let isReplayEnabled = false;
let isShuffleEnabled = false;
let shuffledPlaylist = [];

// Инициализация Media Session API
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", () => {
    togglePlay();
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    togglePlay();
  });

  // Добавляем обработчики для кнопок управления треками
  navigator.mediaSession.setActionHandler("previoustrack", () => {
    prevTrack();
  });

  navigator.mediaSession.setActionHandler("nexttrack", () => {
    nextTrack();
  });

  // Заменяем перемотку на переключение треков
  navigator.mediaSession.setActionHandler("seekbackward", () => {
    prevTrack();
  });

  navigator.mediaSession.setActionHandler("seekforward", () => {
    nextTrack();
  });

  // Добавляем обработчик для установки позиции
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.fastSeek && "fastSeek" in audio) {
      audio.fastSeek(details.seekTime);
      return;
    }
    audio.currentTime = details.seekTime;
    updateProgress();
  });
}

// Функция для обновления метаданных Media Session
const updateMediaSession = (track) => {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.explicit ? `${track.name} ⓔ` : track.name,
      artist: track.artist,
      album: "InfluxMusic",
      artwork: [
        {
          src: track.song_photo,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });

    // Обновляем обработчики для кнопок управления
    navigator.mediaSession.setActionHandler("play", togglePlay);
    navigator.mediaSession.setActionHandler("pause", togglePlay);
    navigator.mediaSession.setActionHandler("previoustrack", prevTrack);
    navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
    navigator.mediaSession.setActionHandler("seekbackward", null);
    navigator.mediaSession.setActionHandler("seekforward", null);

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.fastSeek && "fastSeek" in audio) {
        audio.fastSeek(details.seekTime);
        return;
      }
      audio.currentTime = details.seekTime;
      updateProgress();
    });
  }
};

// Функция для извлечения доминирующего цвета из изображения
const getAverageColor = (imgElement) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = imgElement.width;
  const height = imgElement.height;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(imgElement, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height).data;
  let r = 0,
    g = 0,
    b = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
  }

  const pixels = imageData.length / 4;
  return {
    r: Math.round(r / pixels),
    g: Math.round(g / pixels),
    b: Math.round(b / pixels),
  };
};

// Функция для обновления градиента плеера
const updatePlayerGradient = (color) => {
  const miniPlayer = document.querySelector(".mini-player");
  const { r, g, b } = color;
  const gradient = `linear-gradient(135deg, 
    rgba(${r},${g},${b},0.9) 0%,
    rgba(${r},${g},${b},0.7) 50%,
    rgba(${r},${g},${b},0.4) 100%)`;
  miniPlayer.style.background = gradient;
  miniPlayer.style.backdropFilter = "blur(10px)";
};

// Функция для загрузки трека
const loadTrack = async (trackIndex) => {
  try {
    const track = tracks[trackIndex];
    audio.src = track.track;
    await audio.load();
    updatePlayerInfo(track);
    updateMediaSession(track); // Обновляем метаданные для Media Session
    highlightCurrentTrack(trackIndex);

    // Добавляем обработку цвета обложки

    coverImg.onload = () => {
      const color = getAverageColor(coverImg);
      updatePlayerGradient(color);
    };

    saveState();

    const trackElements = document.querySelectorAll(
      '[class^="musick-list-item-content-"]'
    );
    trackElements.forEach((element, i) => {
      const explicitIcon = element.querySelector("#explicit-icon");
      if (explicitIcon) {
        explicitIcon.style.display = tracks[i].explicit ? "inline" : "none";
      }
    });
  } catch (error) {
    console.error("Ошибка при загрузке трека:", error);
  }
};

// Обновление информации в плеере
const updatePlayerInfo = (track) => {
  document.getElementById("cover-track-player").src = track.song_photo;
  document.getElementById("track-name-player").textContent = track.name;
  document.getElementById("track-artist-player").textContent = track.artist;

  // Обновляем иконку explicit
  const explicitIconPlayer = document.getElementById("explicit-icon-player");
  if (track.explicit) {
    explicitIconPlayer.style.display = "inline";
  } else {
    explicitIconPlayer.style.display = "none";
  }
};

// Подсветка текущего трека в списке
const highlightCurrentTrack = (index) => {
  const trackElements = document.querySelectorAll(
    '[class^="musick-list-item-content-"]'
  );
  trackElements.forEach((element, i) => {
    if (i === index) {
      element.style.backgroundColor = "#5353539c";
    } else {
      element.style.backgroundColor = "";
    }
  });
};

// Функция воспроизведения/паузы
const togglePlay = async () => {
  if (isPlaying) {
    await audio.pause();
    playButton.innerHTML = '<i class="fa-solid fa-play"></i>';
    navigator.mediaSession.playbackState = "paused";
    coverImg.classList.toggle("playing");
  } else {
    await audio.play();
    playButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
    navigator.mediaSession.playbackState = "playing";
    coverImg.classList.toggle("playing");
  }
  isPlaying = !isPlaying;
  saveState();
};

// Обработка клавиатурных событий
document.addEventListener("keydown", (e) => {
  if (e.key === "p") {
    togglePlay();
    console.log("togglePlay");
  }
  if (e.key === "ArrowRight") {
    nextTrack();
    console.log("nextTrack");
  }
  if (e.key === "ArrowLeft") {
    prevTrack();
    console.log("prevTrack");
  }
  if (e.key === "m") {
    if (isMuted) {
      audio.volume = 1;
      volumeIcon.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    } else {
      audio.volume = 0;
      volumeIcon.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }
    isMuted = !isMuted;
    saveState();
  }
});

// Форматирование времени
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

// Обновление прогресс-бара и позиции воспроизведения для Media Session
const updateProgress = () => {
  const progress = (audio.currentTime / audio.duration) * 100;
  progressBarFill.style.width = `${progress}%`;
  currentTime.textContent = formatTime(audio.currentTime);
  totalTime.textContent = formatTime(audio.duration || 0);

  if ("mediaSession" in navigator && audio.duration && audio.duration > 0) {
    const position = Math.min(audio.currentTime || 0, audio.duration);
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      position: position,
      playbackRate: audio.playbackRate,
    });
  }

  saveState();
};

// Функция для перемешивания массива треков
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Обновляем функцию nextTrack
const nextTrack = async () => {
  if (isShuffleEnabled) {
    // Если мы дошли до конца перемешанного плейлиста, создаем новый
    if (currentTrackIndex >= shuffledPlaylist.length - 1) {
      const currentTrack = shuffledPlaylist[currentTrackIndex];
      shuffledPlaylist = shuffleArray(tracks);
      // Убедимся, что текущий трек не будет первым в новом перемешанном плейлисте
      if (shuffledPlaylist[0] === currentTrack) {
        // Если это так, поменяем его местами со случайным треком
        const randomIndex =
          Math.floor(Math.random() * (shuffledPlaylist.length - 1)) + 1;
        [shuffledPlaylist[0], shuffledPlaylist[randomIndex]] = [
          shuffledPlaylist[randomIndex],
          shuffledPlaylist[0],
        ];
      }
      currentTrackIndex = 0;
    } else {
      currentTrackIndex++;
    }
    await loadTrack(tracks.indexOf(shuffledPlaylist[currentTrackIndex]));
  } else {
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    await loadTrack(currentTrackIndex);
  }
  if (isPlaying) {
    await audio.play();
    navigator.mediaSession.playbackState = "playing";
  }
};

// Обновляем функцию prevTrack
const prevTrack = async () => {
  if (isShuffleEnabled) {
    if (currentTrackIndex <= 0) {
      const currentTrack = shuffledPlaylist[currentTrackIndex];
      shuffledPlaylist = shuffleArray(tracks);
      // Убедимся, что текущий трек не будет последним в новом перемешанном плейлисте
      if (shuffledPlaylist[shuffledPlaylist.length - 1] === currentTrack) {
        // Если это так, поменяем его местами со случайным треком
        const randomIndex = Math.floor(
          Math.random() * (shuffledPlaylist.length - 1)
        );
        [
          shuffledPlaylist[shuffledPlaylist.length - 1],
          shuffledPlaylist[randomIndex],
        ] = [
          shuffledPlaylist[randomIndex],
          shuffledPlaylist[shuffledPlaylist.length - 1],
        ];
      }
      currentTrackIndex = shuffledPlaylist.length - 1;
    } else {
      currentTrackIndex--;
    }
    await loadTrack(tracks.indexOf(shuffledPlaylist[currentTrackIndex]));
  } else {
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    await loadTrack(currentTrackIndex);
  }
  if (isPlaying) {
    await audio.play();
    navigator.mediaSession.playbackState = "playing";
  }
};

// Обработчики событий
playButton.addEventListener("click", togglePlay);
nextButton.addEventListener("click", nextTrack);
prevButton.addEventListener("click", prevTrack);

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("ended", () => {
  if (isReplayEnabled) {
    audio.currentTime = 0;
    audio.play();
  } else {
    nextTrack();
  }
});

// Обработка клика по прогресс-бару
progressBar.addEventListener("click", (e) => {
  const progressBarRect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - progressBarRect.left) / progressBarRect.width;
  audio.currentTime = percent * audio.duration;
  saveState(); // Сохраняем состояние при перемотке
});

// Обработка кликов по трекам в списке
musicList.addEventListener("click", async (e) => {
  const trackElement = e.target.closest('[class^="musick-list-item-content-"]');
  if (trackElement) {
    const trackIndex = Array.from(musicList.children).indexOf(trackElement);
    if (trackIndex !== currentTrackIndex) {
      currentTrackIndex = trackIndex;
      await loadTrack(currentTrackIndex);
      isPlaying = false;
      await togglePlay();
    } else {
      await togglePlay();
    }
  }
});

// Функция для обновления громкости
const updateVolume = (e) => {
  const volumeSliderRect = volumeSlider.getBoundingClientRect();
  let volume = (e.clientX - volumeSliderRect.left) / volumeSliderRect.width;

  // Ограничиваем значение от 0 до 1
  volume = Math.max(0, Math.min(1, volume));

  // Обновляем громкость аудио
  audio.volume = volume;

  // Обновляем визуальное отображение
  volumeProgress.style.width = `${volume * 100}%`;

  // Обновляем иконку громкости
  if (volume === 0) {
    volumeIcon.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    isMuted = true;
  } else {
    volumeIcon.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    isMuted = false;
  }

  saveState();
};

// Обработчик для перетаскивания ползунка громкости
const handleVolumeSlider = () => {
  const handleMouseMove = (e) => {
    updateVolume(e);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

// Добавляем обработчики событий для слайдера громкости
volumeSlider.addEventListener("mousedown", (e) => {
  updateVolume(e);
  handleVolumeSlider();
});

volumeSlider.addEventListener("click", updateVolume);

// Сохраняем состояние перед закрытием страницы
window.addEventListener("beforeunload", saveState);

// Инициализация
document.addEventListener("DOMContentLoaded", () => {
  loadState(); // Загружаем сохраненное состояние
  const trackElements = document.querySelectorAll(
    '[class^="musick-list-item-content-"]'
  );
  trackElements.forEach((element, i) => {
    const explicitIcon = element.querySelector("#explicit-icon");
    if (explicitIcon && tracks[i]) {
      explicitIcon.style.display = tracks[i].explicit ? "inline" : "none";
    }
  });
  loadTrack(currentTrackIndex);
});

replayButton.addEventListener("click", () => {
  isReplayEnabled = !isReplayEnabled;

  // Добавляем класс для запуска анимации вращения
  replayButton.classList.add("spinning");

  // Меняем цвет в зависимости от состояния
  if (isReplayEnabled) {
    replayButton.style.color = "var(--color-accent)";
  } else {
    replayButton.style.color = "var(--color-text-tertiary)";
  }

  // Удаляем класс spinning после завершения анимации
  setTimeout(() => {
    replayButton.classList.remove("spinning");
  }, 500);

  // Переключаем активное состояние
  replayButton.classList.toggle("active");

  saveState();
});

shuffleButton.addEventListener("click", () => {
  isShuffleEnabled = !isShuffleEnabled;
  if (isShuffleEnabled) {
    // Сохраняем текущий трек
    const currentTrack = tracks[currentTrackIndex];
    // Создаем перемешанный плейлист
    shuffledPlaylist = shuffleArray(tracks);
    // Находим индекс текущего трека в перемешанном плейлисте
    currentTrackIndex = shuffledPlaylist.indexOf(currentTrack);
    shuffleButton.classList.add("active");
    shuffleButton.style.color = "var(--color-accent)";
  } else {
    // При выключении находим текущий трек в оригинальном плейлисте
    const currentTrack = shuffledPlaylist[currentTrackIndex];
    // Очищаем перемешанный плейлист
    shuffledPlaylist = [];
    // Устанавливаем правильный индекс в оригинальном плейлисте
    currentTrackIndex = tracks.indexOf(currentTrack);
    shuffleButton.classList.remove("active");
    shuffleButton.style.color = "var(--color-text)";
  }
  saveState();
});

const modalWindow = document.querySelector(".modal-window");
const modalClose = document.querySelector(".modal-close");

const btnSidebarToggle = document.getElementById("btn-sidebar-toggle");

btnSidebarToggle.addEventListener("click", () => {
  modalWindow.classList.toggle("active");
});

// Модальное окно
document.addEventListener("DOMContentLoaded", () => {
  const modalWindow = document.querySelector(".modal-window");
  const modalClose = document.querySelector(".modal-close");

  if (!modalWindow || !modalClose) {
    console.error("Элементы модального окна не найдены:", {
      modalWindow: !!modalWindow,
      modalClose: !!modalClose,
    });
    return;
  }

  console.log("Модальное окно инициализировано");

  // Проверяем, было ли уже показано модальное окно в текущей сессии
  const hasModalBeenShown = sessionStorage.getItem("modalShown");

  if (!hasModalBeenShown) {
    // Открываем модальное окно через 2 секунды после загрузки
    setTimeout(() => {
      modalWindow.classList.add("active");
      // Отмечаем, что модальное окно было показано
      sessionStorage.setItem("modalShown", "true");
    }, 2000);
  }

  // Закрытие модального окна
  modalClose.addEventListener("click", () => {
    console.log("Закрытие по кнопке");
    modalWindow.classList.remove("active");
  });

  // Закрытие по клавише Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalWindow.classList.contains("active")) {
      console.log("Закрытие по Escape");
      modalWindow.classList.remove("active");
    }
  });
});

// --- Drag&Drop для прогресс-бара с handle ---
const progressBarHandle = document.querySelector(".progress-bar-handle");
let isDragging = false;

const updateProgressBarHandle = () => {
  if (!audio.duration) return;
  if (!progressBarHandle) return; // предотвращаем ошибку, если элемента нет
  const percent = (audio.currentTime / audio.duration) * 100;
  progressBarHandle.style.left = `${percent}%`;
};

progressBar.addEventListener("mousedown", (e) => {
  isDragging = true;
  document.body.style.userSelect = "none";
  moveProgress(e);
});
document.addEventListener("mousemove", (e) => {
  if (isDragging) moveProgress(e);
});
document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    document.body.style.userSelect = "";
    saveState();
  }
});
function moveProgress(e) {
  const rect = progressBar.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  audio.currentTime = percent * audio.duration;
  updateProgress();
  updateProgressBarHandle();
}
