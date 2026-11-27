(() => {
  const initializedTracks = new WeakSet();
  const mobileViewport = window.matchMedia("(max-width: 760px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const carouselLabels = {
    "program-weeks": "Semaines du programme",
  };

  function initializeCarousel(track) {
    if (initializedTracks.has(track)) return;

    const items = Array.from(track.children).filter(
      (child) => child instanceof HTMLElement,
    );
    if (items.length < 2) return;

    initializedTracks.add(track);
    const label =
      track.getAttribute("aria-label") ||
      carouselLabels[track.dataset.mobileCarousel] ||
      "Éléments du site";
    track.classList.add("mobile-carousel-track");
    track.setAttribute("role", "region");
    track.setAttribute("aria-roledescription", "carrousel");
    track.setAttribute("aria-label", label);
    if (!track.hasAttribute("tabindex")) track.tabIndex = 0;

    const controls = document.createElement("div");
    controls.className = "mobile-carousel-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", `Navigation : ${label}`);

    const previous = document.createElement("button");
    previous.className = "mobile-carousel-arrow";
    previous.type = "button";
    previous.setAttribute("aria-label", `Élément précédent : ${label}`);
    previous.textContent = "←";

    const dots = document.createElement("div");
    dots.className = "mobile-carousel-dots";
    dots.setAttribute("role", "group");
    dots.setAttribute("aria-label", "Choisir un élément");

    const next = document.createElement("button");
    next.className = "mobile-carousel-arrow";
    next.type = "button";
    next.setAttribute("aria-label", `Élément suivant : ${label}`);
    next.textContent = "→";

    const dotButtons = items.map((_, index) => {
      const dot = document.createElement("button");
      dot.className = "mobile-carousel-dot";
      dot.type = "button";
      dot.setAttribute(
        "aria-label",
        `Afficher l'élément ${index + 1} sur ${items.length} : ${label}`,
      );
      dot.addEventListener("click", () => scrollTo(index));
      dots.append(dot);
      return dot;
    });

    controls.append(previous, dots, next);
    track.insertAdjacentElement("afterend", controls);

    function currentIndex() {
      const center = track.getBoundingClientRect().left + track.clientWidth / 2;
      return items.reduce(
        (closestIndex, item, index) => {
          const itemCenter =
            item.getBoundingClientRect().left +
            item.getBoundingClientRect().width / 2;
          const distance = Math.abs(center - itemCenter);
          return distance < closestIndex.distance
            ? { index, distance }
            : closestIndex;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY },
      ).index;
    }

    function centerMiddleItem() {
      if (!mobileViewport.matches) return;
      const item = items[Math.floor(items.length / 2)];
      const trackCenter =
        track.getBoundingClientRect().left + track.clientWidth / 2;
      const itemCenter =
        item.getBoundingClientRect().left + item.getBoundingClientRect().width / 2;
      track.scrollLeft += itemCenter - trackCenter;
      updateControls();
    }

    function updateControls() {
      const activeIndex = currentIndex();
      dotButtons.forEach((dot, index) => {
        if (index === activeIndex) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === items.length - 1;
    }

    function scrollTo(index) {
      items[index].scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
      updateControls();
    }

    let updateScheduled = false;
    track.addEventListener(
      "scroll",
      () => {
        if (updateScheduled) return;
        updateScheduled = true;
        window.requestAnimationFrame(() => {
          updateControls();
          updateScheduled = false;
        });
      },
      { passive: true },
    );
    track.addEventListener("keydown", (event) => {
      if (!mobileViewport.matches) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollTo(Math.min(currentIndex() + 1, items.length - 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollTo(Math.max(currentIndex() - 1, 0));
      }
    });
    previous.addEventListener("click", () =>
      scrollTo(Math.max(currentIndex() - 1, 0)),
    );
    next.addEventListener("click", () =>
      scrollTo(Math.min(currentIndex() + 1, items.length - 1)),
    );
    window.addEventListener("resize", updateControls);
    mobileViewport.addEventListener("change", () =>
      window.requestAnimationFrame(centerMiddleItem),
    );
    window.requestAnimationFrame(centerMiddleItem);
    updateControls();
  }

  function initializeWithin(root) {
    if (root instanceof Element && root.matches("[data-mobile-carousel]")) {
      initializeCarousel(root);
    }
    if (root.querySelectorAll) {
      root
        .querySelectorAll("[data-mobile-carousel]")
        .forEach(initializeCarousel);
    }
  }

  initializeWithin(document);

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) initializeWithin(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
