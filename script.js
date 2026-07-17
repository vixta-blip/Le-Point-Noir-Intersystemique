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
    if (event.key === "Escape") setMenuOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) setMenuOpen(false);
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
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
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

  const mockup = document.querySelector("[data-book-mockup]");
  const mockupButtons = [...document.querySelectorAll("[data-mockup-view]")];
  const mockupStatus = document.querySelector("[data-mockup-status]");
  const mockupLabels = {
    front: "Première de couverture",
    spine: "Vue de la tranche du relié",
    back: "Quatrième de couverture",
  };
  const mockupAssets = {
    front: {
      src: "assets/couverture-le-point-noir-intersystemique.png",
      width: 1624,
      height: 2500,
      alt: "Première de couverture du livre Le Point Noir Intersystémique",
    },
    spine: {
      src: "assets/couverture-tranche.webp",
      width: 120,
      height: 2500,
      alt: "Tranche du livre relié Le Point Noir Intersystémique",
    },
    back: {
      src: "assets/couverture-dos.webp",
      width: 1624,
      height: 2500,
      alt: "Quatrième de couverture du livre Le Point Noir Intersystémique",
    },
  };

  const setMockupView = (view, moveFocus = false) => {
    if (!mockup || !mockupLabels[view]) return;
    mockup.dataset.view = view;
    mockupButtons.forEach((button) => {
      const active = button.dataset.mockupView === view;
      button.setAttribute("aria-pressed", String(active));
      if (active && moveFocus) button.focus();
    });
    if (mockupStatus) mockupStatus.textContent = mockupLabels[view];
  };

  mockupButtons.forEach((button, index) => {
    button.addEventListener("click", () => setMockupView(button.dataset.mockupView));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + mockupButtons.length) % mockupButtons.length;
      setMockupView(mockupButtons[nextIndex].dataset.mockupView, true);
    });
  });

  const coverDialog = document.querySelector("[data-cover-dialog]");
  const coverDialogImage = document.querySelector("[data-cover-dialog-image]");
  const coverDialogCaption = document.querySelector("[data-cover-dialog-caption]");
  const openCoverDialog = document.querySelector("[data-open-cover-dialog]");
  const closeCoverDialog = document.querySelector("[data-close-cover-dialog]");

  const closeExpandedCover = () => {
    if (!coverDialog) return;
    if (typeof coverDialog.close === "function") coverDialog.close();
    else coverDialog.removeAttribute("open");
  };

  if (openCoverDialog) {
    openCoverDialog.hidden = false;
    openCoverDialog.addEventListener("click", () => {
      if (!coverDialog || !mockup) return;
      const view = mockup.dataset.view || "front";
      const asset = mockupAssets[view];
      if (coverDialogImage && asset) {
        coverDialogImage.src = asset.src;
        coverDialogImage.width = asset.width;
        coverDialogImage.height = asset.height;
        coverDialogImage.alt = asset.alt;
      }
      if (coverDialogCaption) coverDialogCaption.textContent = mockupLabels[view];
      if (typeof coverDialog.showModal === "function") coverDialog.showModal();
      else coverDialog.setAttribute("open", "");
    });
  }

  closeCoverDialog?.addEventListener("click", closeExpandedCover);
  coverDialog?.addEventListener("click", (event) => {
    if (event.target === coverDialog) closeExpandedCover();
  });

  const viewer = document.querySelector("[data-excerpt-viewer]");
  const excerptImage = document.querySelector("[data-excerpt-image]");
  const excerptLabel = document.querySelector("[data-excerpt-label]");
  const excerptCurrent = document.querySelector("[data-excerpt-current]");
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
      // Le feuilleteur reste utilisable si le stockage de session est indisponible.
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

  const copyIsbnButton = document.querySelector("[data-copy-isbn]");
  if (copyIsbnButton) {
    copyIsbnButton.hidden = false;
    copyIsbnButton.addEventListener("click", async () => {
      try {
        await copyText("9791098270109");
        setStatus("ISBN copié : 9791098270109");
      } catch {
        setStatus("Impossible de copier automatiquement l’ISBN.");
      }
    });
  }

  const shareButton = document.querySelector("[data-share-page]");
  if (shareButton) {
    shareButton.hidden = false;
    shareButton.addEventListener("click", async () => {
      const shareData = {
        title: "Le Point Noir Intersystémique — Vixta",
        text: "Le dialogue doit-il nécessairement produire un accord ?",
        url: window.location.href.split("#")[0],
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
  const analysisStatus = document.querySelector("[data-analysis-status]");
  const copyReferenceButton = document.querySelector("[data-copy-reference]");
  let analysisStatusTimer = null;

  const setAnalysisStatus = (message) => {
    if (!analysisStatus) return;
    analysisStatus.textContent = message;
    window.clearTimeout(analysisStatusTimer);
    analysisStatusTimer = window.setTimeout(() => {
      analysisStatus.textContent = "";
    }, 4500);
  };

  if (analysisClose) {
    analysisClose.hidden = false;
    analysisClose.addEventListener("click", () => {
      if (!analysisDisclosure) return;
      analysisDisclosure.open = false;
      analysisSummary?.focus({ preventScroll: true });
      analysisDisclosure.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }

  if (copyReferenceButton) {
    copyReferenceButton.hidden = false;
    copyReferenceButton.addEventListener("click", async () => {
      const reference =
        "Vixta, Le Point Noir Intersystémique — Les configurations du dialogue, 2026, 88 p., ISBN 979-10-982701-0-9.";
      try {
        await copyText(reference);
        setAnalysisStatus("Référence bibliographique copiée.");
      } catch {
        setAnalysisStatus("Impossible de copier automatiquement la référence.");
      }
    });
  }

  const shelf = document.querySelector("[data-library-shelf]");
  const shelfStatus = document.querySelector("[data-library-status]");
  const catalogue = window.VIXTA_CATALOGUE;

  const selectShelfBook = (bookElement, book) => {
    if (!shelf) return;
    shelf.querySelectorAll(".shelf-book").forEach((item) => {
      item.classList.toggle("is-selected", item === bookElement);
    });
    if (shelfStatus) shelfStatus.textContent = `${book.title} est sélectionné.`;
  };

  if (shelf && catalogue?.books?.length) {
    const visibleBooks = catalogue.books
      .filter((book) => book.published || book.slug === catalogue.activeBook)
      .sort((a, b) => Number(b.slug === catalogue.activeBook) - Number(a.slug === catalogue.activeBook));

    shelf.replaceChildren();
    visibleBooks.forEach((book, index) => {
      const link = document.createElement("a");
      const active = book.slug === catalogue.activeBook;
      const lean = visibleBooks.length === 1 ? 0 : (index - (visibleBooks.length - 1) / 2) * 15;
      link.className = `shelf-book${active ? " is-current is-selected" : ""}`;
      link.href = book.pageUrl;
      link.style.setProperty("--shelf-lean", `${lean}deg`);
      link.setAttribute("aria-label", `${book.title}${active ? ", campagne actuelle" : ""}`);
      if (active) link.setAttribute("aria-current", "page");

      const object = document.createElement("span");
      object.className = "shelf-book-object";
      const image = document.createElement("img");
      image.src = book.cover;
      image.width = book.coverWidth;
      image.height = book.coverHeight;
      image.loading = "lazy";
      image.alt = `Couverture de ${book.title}`;
      const spine = document.createElement("i");
      spine.setAttribute("aria-hidden", "true");
      object.append(image, spine);

      const label = document.createElement("span");
      label.className = "shelf-book-label";
      label.textContent = book.campaignLabel || book.shortTitle;
      link.append(object, label);

      link.addEventListener("click", (event) => {
        event.preventDefault();
        selectShelfBook(link, book);
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => {
          if (book.pageUrl.startsWith("#")) {
            document.querySelector(book.pageUrl)?.scrollIntoView({ behavior: "smooth" });
          } else {
            window.location.assign(book.pageUrl);
          }
        }, reducedMotion ? 0 : 480);
      });

      shelf.append(link);
    });
  }
})();
