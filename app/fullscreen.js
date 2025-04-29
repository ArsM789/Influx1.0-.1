document.addEventListener("DOMContentLoaded", () => {
  // Функция для определения мобильного устройства
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  // Функция для включения полноэкранного режима
  const enableFullScreen = () => {
    const element = document.documentElement;

    // Проверяем, поддерживается ли полноэкранный режим
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      // Safari
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      // IE11
      element.msRequestFullscreen();
    }

    // Для iOS устройств
    if (navigator.standalone) {
      document.addEventListener("touchend", () => {
        window.scrollTo(0, 0);
      });
    }

    // Скрываем адресную строку
    window.scrollTo(0, 1);
  };

  // Обработчик для включения полноэкранного режима
  const handleFullScreen = () => {
    if (isMobile()) {
      // Небольшая задержка для iOS
      setTimeout(() => {
        enableFullScreen();

        // Предотвращаем скролл страницы
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.height = "100%";

        // Скрываем адресную строку при скролле
        window.addEventListener("scroll", () => {
          window.scrollTo(0, 0);
        });
      }, 100);
    }
  };

  // Обработчики событий для различных сценариев
  window.addEventListener("load", handleFullScreen);
  window.addEventListener("resize", handleFullScreen);
  window.addEventListener("orientationchange", handleFullScreen);

  // Обработчик для жестов
  document.addEventListener(
    "touchstart",
    () => {
      handleFullScreen();
    },
    { once: true }
  );

  // Для iOS устройств: повторная попытка при взаимодействии
  if (isMobile()) {
    document.addEventListener("click", handleFullScreen, { once: true });
  }
});
