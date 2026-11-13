(() => {
  "use strict";

  const config = window.ORION_CONFIG || {};
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-nav");
  const dialog = document.querySelector("#media-dialog");
  const mediaContent = document.querySelector("#media-content");
  const mediaTitle = document.querySelector("#media-title");
  const galleryControls = dialog.querySelector(".gallery-controls");
  const galleryItems = [...document.querySelectorAll("[data-gallery]")];
  const galleryTrack = document.querySelector(".gallery");
  const galleryPaging = document.querySelector(".gallery-paging");
  let galleryIndex = 0;
  let returnFocus = null;

  function galleryPosition() {
    const gap = parseFloat(getComputedStyle(galleryTrack).columnGap) || 0;
    const step = galleryItems[0].getBoundingClientRect().width + gap;
    const visible = Math.max(
      1,
      Math.round((galleryTrack.clientWidth + gap) / step),
    );
    const first = Math.max(
      0,
      Math.min(
        galleryItems.length - visible,
        Math.round(galleryTrack.scrollLeft / step),
      ),
    );
    return { step, visible, first };
  }

  function updateGalleryPaging() {
    const { visible, first } = galleryPosition();
    const count = Math.max(1, galleryItems.length - visible + 1);
    if (galleryPaging.children.length !== count) {
      const dots = Array.from({ length: count }, (_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "gallery-dot";
        dot.dataset.position = index;
        dot.setAttribute(
          "aria-label",
          visible === 1
            ? `Show screenshot ${index + 1}`
            : `Show screenshots ${index + 1} to ${index + visible}`,
        );
        return dot;
      });
      galleryPaging.replaceChildren(...dots);
    }
    [...galleryPaging.children].forEach((dot, index) => {
      dot.setAttribute("aria-current", String(index === first));
    });
    galleryPaging.hidden = count <= 1;
  }

  galleryPaging.addEventListener("click", (event) => {
    const dot = event.target.closest(".gallery-dot");
    if (!dot) return;
    const { step } = galleryPosition();
    galleryTrack.scrollTo({
      left: Number(dot.dataset.position) * step,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
  galleryTrack.addEventListener("scroll", updateGalleryPaging, {
    passive: true,
  });
  new ResizeObserver(updateGalleryPaging).observe(galleryTrack);
  updateGalleryPaging();

  // Reject executable protocols. Relative URLs are supported for local media.
  function safeUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, document.baseURI);
      return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch {
      return null;
    }
  }

  document.querySelectorAll("[data-link]").forEach((link) => {
    const key = link.dataset.link;
    const url = safeUrl(config[key]);
    if (!url) return;
    link.href = url.href;
    link.removeAttribute("aria-disabled");
    const label = link.querySelector("[data-label]");
    if (label) {
      label.textContent =
        key === "steam"
          ? link.closest(".press-actions")
            ? "View Steam Page"
            : "Wishlist on Steam"
          : "Download Press Kit";
    }
    if (url.origin !== location.origin) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else if (key === "pressKit") {
      link.download = "";
    }
  });

  function closeMenu() {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
  }

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation",
    );
    navigation.classList.toggle("is-open", isOpen);
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-shell")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuButton.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menuButton.focus();
    }
  });
  window.matchMedia("(min-width: 821px)").addEventListener("change", closeMenu);

  function openDialog(opener) {
    returnFocus = opener;
    dialog.showModal();
    dialog.querySelector("[data-close]").focus();
  }

  function renderImage() {
    const source = galleryItems[galleryIndex].querySelector("img");
    const image = document.createElement("img");
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    image.width = 1280;
    image.height = 720;
    mediaTitle.textContent = source.alt;
    mediaContent.replaceChildren(image);
    document.querySelector("#gallery-counter").textContent =
      `${galleryIndex + 1} / ${galleryItems.length}`;
  }

  function moveImage(direction) {
    galleryIndex =
      (galleryIndex + direction + galleryItems.length) % galleryItems.length;
    renderImage();
  }

  galleryItems.forEach((button, index) => {
    button.addEventListener("click", () => {
      galleryIndex = index;
      galleryControls.hidden = false;
      renderImage();
      openDialog(button);
    });
  });
  dialog
    .querySelector("[data-previous]")
    .addEventListener("click", () => moveImage(-1));
  dialog
    .querySelector("[data-next]")
    .addEventListener("click", () => moveImage(1));
  dialog.addEventListener("keydown", (event) => {
    if (galleryControls.hidden) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      moveImage(event.key === "ArrowLeft" ? -1 : 1);
    }
  });

  function youtubeId(url) {
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (
      ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"].includes(
        url.hostname,
      )
    ) {
      return (
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
      );
    }
    return null;
  }

  function showTrailerMessage() {
    const message = document.createElement("div");
    message.className = "media-message";
    const heading = document.createElement("h3");
    heading.textContent = "A first look is coming soon.";
    const text = document.createElement("p");
    text.textContent =
      "There’s a whole new universe to discover. Check back for the official ORION 2 SANDBOX trailer.";
    message.append(heading, text);
    mediaContent.replaceChildren(message);
  }

  document.querySelectorAll("[data-trailer]").forEach((button) => {
    button.addEventListener("click", () => {
      mediaTitle.textContent = "ORION 2 SANDBOX — Official Trailer";
      galleryControls.hidden = true;
      const url = safeUrl(config.trailer);
      const id = url && youtubeId(url);
      if (id && /^[\w-]{11}$/.test(id)) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
        iframe.title = "ORION 2 SANDBOX official trailer";
        iframe.allow =
          "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        mediaContent.replaceChildren(iframe);
      } else if (url && /\.(mp4|webm)$/i.test(url.pathname)) {
        const video = document.createElement("video");
        video.src = url.href;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.setAttribute("aria-label", "ORION 2 SANDBOX official trailer");
        mediaContent.replaceChildren(video);
      } else {
        showTrailerMessage();
      }
      openDialog(button);
    });
  });

  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (event.target === dialog && outside) dialog.close();
  });
  dialog.addEventListener("close", () => {
    // Removing the player stops video and audio, including YouTube embeds.
    mediaContent.replaceChildren();
    galleryControls.hidden = true;
    returnFocus?.focus();
  });
})();
