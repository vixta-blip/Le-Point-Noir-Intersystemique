(() => {
  document.documentElement.classList.add("js-ready");

  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-reading-progress]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navLabel = document.querySelector("[data-nav-label]");
  const nav = document.querySelector("[data-nav]");
  let scrollFrame = null;

  const updateScrollState = () => {
    const scrollTop = window.scrollY;
    const scrollable = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1,
    );

    header?.classList.toggle("is-scrolled", scrollTop > 24);
    if (progress) {
      progress.style.transform = `scaleX(${Math.min(scrollTop / scrollable, 1)})`;
    }
    scrollFrame = null;
  };

  const requestScrollUpdate = () => {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(updateScrollState);
  };

  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });

  const setMenuOpen = (open) => {
    if (!header || !navToggle) return;
    header.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    if (navLabel) navLabel.textContent = open ? "Fermer le menu" : "Ouvrir le menu";
  };

  navToggle?.addEventListener("click", () => {
    setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!header?.classList.contains("nav-open")) return;
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !header?.classList.contains("nav-open")) return;
    setMenuOpen(false);
    navToggle?.focus();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 940) setMenuOpen(false);
  });

  const navLinks = [...document.querySelectorAll(".main-nav a[href^='#']")];
  const navTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${visible.target.id}`;
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.01, 0.2] },
    );
    navTargets.forEach((section) => sectionObserver.observe(section));
  }

  const revealItems = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  document.querySelectorAll("[data-accordion]").forEach((accordion) => {
    const items = [...accordion.querySelectorAll(":scope > details")];
    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        items.forEach((other) => {
          if (other !== details) other.open = false;
        });
      });
    });
  });

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  /* Optional book motif: opt-in, short and deliberately quiet. */

  const soundToggle = document.querySelector("[data-sound-toggle]");
  const soundLabel = document.querySelector("[data-sound-label]");
  const soundStorageKey = "point-noir-book-sound";
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  let soundEnabled = false;
  let audioContext = null;
  let masterGain = null;
  let lastBookSoundAt = 0;

  try {
    soundEnabled = window.localStorage.getItem(soundStorageKey) === "on";
  } catch {
    soundEnabled = false;
  }

  if (!AudioEngine) {
    soundEnabled = false;
    if (soundToggle) soundToggle.hidden = true;
  }

  const updateSoundControl = () => {
    if (!soundToggle) return;
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundToggle.setAttribute(
      "aria-label",
      soundEnabled
        ? "Désactiver le son discret associé au livre"
        : "Activer le son discret associé au livre",
    );
    if (soundLabel) soundLabel.textContent = soundEnabled ? "Son du livre actif" : "Son du livre";
  };

  const ensureAudioContext = async () => {
    if (!AudioEngine) return false;

    if (!audioContext) {
      audioContext = new AudioEngine();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.032;
      masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext.state === "running";
  };

  const scheduleTone = (frequency, offset, duration, level = 0.17, type = "sine") => {
    if (!audioContext || !masterGain || audioContext.state !== "running") return;
    const startsAt = audioContext.currentTime + 0.012 + offset;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    envelope.gain.setValueAtTime(0.0001, startsAt);
    envelope.gain.exponentialRampToValueAtTime(level, startsAt + Math.min(0.018, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.025);
  };

  const playInterfaceSound = (kind, options = {}) => {
    if (!soundEnabled || !audioContext || audioContext.state !== "running") return;

    if (kind === "book") {
      const now = Date.now();
      if (now - lastBookSoundAt < 460) return;
      lastBookSoundAt = now;
      const notes = Array.isArray(options.notes) && options.notes.length
        ? options.notes
        : [392, 493.88, 587.33];
      notes.slice(0, 3).forEach((note, index) => {
        scheduleTone(Number(note), index * 0.085, 0.17, 0.15 - index * 0.018, "sine");
      });
      return;
    }

    if (kind === "confirm") {
      scheduleTone(440, 0, 0.09, 0.12, "sine");
      scheduleTone(659.25, 0.07, 0.14, 0.09, "sine");
    }
  };

  const setSoundEnabled = async (enabled) => {
    soundEnabled = Boolean(enabled);
    if (soundEnabled) {
      try {
        const ready = await ensureAudioContext();
        if (!ready) soundEnabled = false;
      } catch {
        soundEnabled = false;
      }
    }

    try {
      window.localStorage.setItem(soundStorageKey, soundEnabled ? "on" : "off");
    } catch {
      // The control remains usable when local storage is unavailable.
    }

    updateSoundControl();
    if (soundEnabled) playInterfaceSound("confirm");
  };

  soundToggle?.addEventListener("click", () => {
    void setSoundEnabled(!soundEnabled);
  });

  const primeSavedSound = () => {
    if (soundEnabled) void ensureAudioContext();
  };
  document.addEventListener("pointerdown", primeSavedSound, { capture: true, once: true });
  document.addEventListener("keydown", primeSavedSound, { capture: true, once: true });
  updateSoundControl();

  /* Collection shelf: one source of truth for this volume and those to come. */

  const collection = window.VIXTA_COLLECTION || {};
  const shelfRow = document.querySelector("[data-book-row]");
  const shelfCaption = document.querySelector("[data-shelf-caption]");
  const bookStatus = document.querySelector("[data-book-status]");
  const publishedBooks = Array.isArray(collection.books)
    ? collection.books.filter((item) => item && item.published !== false)
    : [];

  const createImageSurface = (className, source, width, height) => {
    const surface = document.createElement("span");
    surface.className = `volume-surface ${className}`;
    const image = document.createElement("img");
    image.src = source;
    image.width = width;
    image.height = height;
    image.alt = "";
    image.decoding = "async";
    image.draggable = false;
    surface.append(image);
    return surface;
  };

  const createVolume = (item) => {
    const volume = document.createElement("li");
    volume.className = "shelf-volume";
    if (item.id === collection.featuredBook) volume.classList.add("is-featured");
    volume.dataset.bookId = item.id;
    volume.dataset.bookTitle = item.title;
    volume.dataset.bookNotes = (item.soundProfile || []).join(",");

    const wallShadow = document.createElement("span");
    wallShadow.className = "volume-wall-shadow";
    wallShadow.setAttribute("aria-hidden", "true");
    const contactShadow = document.createElement("span");
    contactShadow.className = "volume-contact-shadow";
    contactShadow.setAttribute("aria-hidden", "true");

    const link = document.createElement("a");
    link.className = "volume-select";
    link.href = item.href || "#edition";
    link.dataset.bookSelect = "";
    link.setAttribute("aria-label", `Voir l’édition du livre ${item.title}`);

    const object = document.createElement("span");
    object.className = "volume-object";
    object.dataset.bookObject = "";
    const front = createImageSurface(
      "volume-front",
      item.front,
      item.frontWidth || 1624,
      item.frontHeight || 2500,
    );
    if (item.id === collection.featuredBook) {
      front.querySelector("img")?.setAttribute("fetchpriority", "high");
    }
    object.append(
      front,
      createImageSurface(
        "volume-back",
        item.back,
        item.frontWidth || 1624,
        item.frontHeight || 2500,
      ),
      createImageSurface(
        "volume-spine",
        item.spine,
        item.spineWidth || 120,
        item.frontHeight || 2500,
      ),
    );
    ["volume-fore-edge", "volume-top-edge", "volume-bottom-edge"].forEach((className) => {
      const edge = document.createElement("span");
      edge.className = `volume-surface ${className}`;
      edge.setAttribute("aria-hidden", "true");
      object.append(edge);
    });
    link.append(object);
    volume.append(wallShadow, contactShadow, link);
    return volume;
  };

  if (shelfRow && publishedBooks.length) {
    const fragment = document.createDocumentFragment();
    publishedBooks.forEach((item) => fragment.append(createVolume(item)));
    shelfRow.replaceChildren(fragment);
  }

  const shelfVolumes = shelfRow ? [...shelfRow.querySelectorAll("[data-book-id]")] : [];
  if (shelfRow) shelfRow.dataset.bookCount = String(Math.max(shelfVolumes.length, 1));

  const featuredVolume = shelfVolumes.find(
    (volume) => volume.dataset.bookId === collection.featuredBook,
  ) || shelfVolumes[0];
  const featuredTitle = featuredVolume?.dataset.bookTitle || "Le Point Noir Intersystémique";

  const clearVolumePreview = () => {
    shelfVolumes.forEach((volume) => {
      volume.classList.remove("is-previewed", "is-neighbor-left", "is-neighbor-right");
    });
    if (shelfCaption) shelfCaption.textContent = featuredTitle;
  };

  const previewVolume = (volume, { announce = false, withSound = false } = {}) => {
    const index = shelfVolumes.indexOf(volume);
    if (index < 0) return;
    clearVolumePreview();
    volume.classList.add("is-previewed");
    shelfVolumes[index - 1]?.classList.add("is-neighbor-left");
    shelfVolumes[index + 1]?.classList.add("is-neighbor-right");
    const title = volume.dataset.bookTitle || featuredTitle;
    if (shelfCaption) shelfCaption.textContent = title;
    if (announce && bookStatus) bookStatus.textContent = `${title}, volume sélectionné.`;
    if (withSound) {
      const notes = (volume.dataset.bookNotes || "")
        .split(",")
        .map(Number)
        .filter(Number.isFinite);
      playInterfaceSound("book", { notes });
    }
  };

  shelfVolumes.forEach((volume) => {
    volume.addEventListener("pointerenter", (event) => {
      previewVolume(volume, { withSound: event.pointerType !== "touch" });
    });
    volume.addEventListener("pointerleave", () => {
      if (!volume.contains(document.activeElement)) clearVolumePreview();
    });
    volume.addEventListener("focusin", () => {
      previewVolume(volume, { announce: true, withSound: true });
    });
    volume.addEventListener("focusout", (event) => {
      if (!volume.contains(event.relatedTarget)) clearVolumePreview();
    });
    volume.querySelector("[data-book-select]")?.addEventListener("click", () => {
      previewVolume(volume, { announce: true, withSound: true });
    });
  });

  const viewer = document.querySelector("[data-excerpt-viewer]");
  const excerptImage = document.querySelector("[data-excerpt-image]");
  const excerptLabel = document.querySelector("[data-excerpt-label]");
  const excerptCurrent = document.querySelector("[data-excerpt-current]");
  const excerptPosition = document.querySelector("[data-excerpt-position]");
  const previousButton = document.querySelector("[data-excerpt-prev]");
  const nextButton = document.querySelector("[data-excerpt-next]");
  const pageButtons = [...document.querySelectorAll("[data-excerpt-page]")];
  const excerptPages = Array.from({ length: 7 }, (_, index) => index + 13);
  let currentPageIndex = 0;

  const readSavedExcerptPage = () => {
    try {
      return Number(window.sessionStorage.getItem("point-noir-excerpt-page"));
    } catch {
      return 0;
    }
  };

  const preloadExcerptPage = (page) => {
    if (!excerptPages.includes(page)) return;
    const image = new Image();
    image.src = `assets/extrait-page-${page}.webp`;
  };

  const showExcerptPage = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, excerptPages.length - 1));
    const page = excerptPages[boundedIndex];
    currentPageIndex = boundedIndex;

    if (excerptImage) {
      excerptImage.src = `assets/extrait-page-${page}.webp`;
      excerptImage.alt = `Page ${page} du livre Le Point Noir Intersystémique`;
    }
    if (excerptLabel) excerptLabel.textContent = `EXTRAIT · P. ${page}`;
    if (excerptCurrent) excerptCurrent.textContent = String(page);
    if (excerptPosition) excerptPosition.textContent = `${boundedIndex + 1} / ${excerptPages.length}`;
    if (previousButton) previousButton.disabled = boundedIndex === 0;
    if (nextButton) nextButton.disabled = boundedIndex === excerptPages.length - 1;

    pageButtons.forEach((button) => {
      const active = Number(button.dataset.excerptPage) === page;
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    try {
      window.sessionStorage.setItem("point-noir-excerpt-page", String(page));
    } catch {
      // The excerpt remains usable when session storage is unavailable.
    }

    preloadExcerptPage(excerptPages[boundedIndex - 1]);
    preloadExcerptPage(excerptPages[boundedIndex + 1]);
  };

  previousButton?.addEventListener("click", () => showExcerptPage(currentPageIndex - 1));
  nextButton?.addEventListener("click", () => showExcerptPage(currentPageIndex + 1));
  pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showExcerptPage(excerptPages.indexOf(Number(button.dataset.excerptPage)));
    });
  });

  viewer?.addEventListener("keydown", (event) => {
    if (event.target !== viewer) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showExcerptPage(currentPageIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showExcerptPage(currentPageIndex + 1);
    }
  });

  if (viewer) {
    viewer.tabIndex = 0;
    viewer.setAttribute("aria-describedby", "excerpt-help");
    const savedPage = readSavedExcerptPage();
    const savedIndex = excerptPages.indexOf(savedPage);
    showExcerptPage(savedIndex >= 0 ? savedIndex : 0);
  }

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  };

  const status = document.querySelector("[data-action-status]");
  let statusTimer = null;
  const setStatus = (message) => {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 4500);
  };

  const shareButton = document.querySelector("[data-share-page]");
  if (shareButton) {
    shareButton.hidden = false;
    shareButton.addEventListener("click", async () => {
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href;
      const shareData = {
        title: "Le Point Noir Intersystémique — Vixta",
        text: "Le dialogue doit-il nécessairement produire un accord ?",
        url: canonicalUrl || window.location.href.split("#")[0],
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
          setStatus("Page partagée.");
        } else {
          await copyText(shareData.url);
          setStatus("Lien de la page copié.");
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        try {
          await copyText(shareData.url);
          setStatus("Le partage n’a pas pu s’ouvrir ; le lien a été copié.");
        } catch {
          setStatus("Le partage n’a pas pu être ouvert.");
        }
      }
    });
  }

  const analysisDisclosure = document.querySelector("[data-analysis-disclosure]");
  const analysisSummary = analysisDisclosure?.querySelector(":scope > summary");
  const analysisClose = document.querySelector("[data-analysis-close]");

  if (analysisClose) {
    analysisClose.hidden = false;
    analysisClose.addEventListener("click", () => {
      if (!analysisDisclosure) return;
      analysisDisclosure.open = false;
      analysisSummary?.focus({ preventScroll: true });
      analysisDisclosure.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    });
  }
})();
