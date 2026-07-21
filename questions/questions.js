(() => {
  const articles = [...document.querySelectorAll("[data-question-article]")];
  const links = [...document.querySelectorAll("[data-question-link]")];
  const progress = document.querySelector("[data-question-progress]");
  if (!articles.length) return;

  const known = new Set(articles.map((article) => article.id));

  const scrollToActiveQuestion = () => {
    document.querySelector("[data-question-article].is-active")?.scrollIntoView({ block: "start" });
  };

  const showQuestion = () => {
    const requested = window.location.hash.slice(1);
    const id = known.has(requested) ? requested : articles[0].id;
    articles.forEach((article) => article.classList.toggle("is-active", article.id === id));
    links.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    const active = document.getElementById(id);
    if (active) document.title = `${active.dataset.questionTitle} | Le Point Noir Intersystémique`;
  };

  window.addEventListener("hashchange", () => {
    showQuestion();
    scrollToActiveQuestion();
  });
  showQuestion();
  if (window.location.hash) {
    window.setTimeout(scrollToActiveQuestion, 80);
  }

  const updateReadingProgress = () => {
    if (!progress) return;
    const active = document.querySelector("[data-question-article].is-active");
    if (!active) return;
    const start = active.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(1, active.offsetHeight - window.innerHeight * 0.62);
    const ratio = Math.max(0, Math.min(1, (window.scrollY - start + window.innerHeight * 0.28) / distance));
    progress.style.transform = `scaleX(${ratio})`;
  };

  let progressFrame = null;
  const requestProgressUpdate = () => {
    if (progressFrame !== null) return;
    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = null;
      updateReadingProgress();
    });
  };

  window.addEventListener("scroll", requestProgressUpdate, { passive: true });
  window.addEventListener("resize", requestProgressUpdate);
  window.addEventListener("hashchange", () => window.setTimeout(updateReadingProgress, 30));
  updateReadingProgress();
})();
