(() => {
  const articles = [...document.querySelectorAll("[data-question-article]")];
  const links = [...document.querySelectorAll("[data-question-link]")];
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
})();
