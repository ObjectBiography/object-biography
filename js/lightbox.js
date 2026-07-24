// Lightweight, dependency-free lightbox for object detail-image galleries.
// Click any image inside .detail-images to open it full-size, with
// keyboard (Esc / Left / Right) and on-screen prev/next/close controls.
(function () {
  function init() {
    var galleries = document.querySelectorAll(".detail-images");
    if (!galleries.length) return;

    galleries.forEach(function (gallery) {
      var images = Array.prototype.slice.call(gallery.querySelectorAll("img"));
      if (!images.length) return;

      images.forEach(function (img, index) {
        img.setAttribute("tabindex", "0");
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "Open larger image" + (img.alt ? ": " + img.alt : ""));

        function open() {
          openLightbox(images, index);
        }

        img.addEventListener("click", open);
        img.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });
      });
    });
  }

  var overlay, figure, imgEl, caption, counter, lastFocused;
  var currentImages = [];
  var currentIndex = 0;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var closeBtn = document.createElement("button");
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", closeLightbox);

    var prevBtn = document.createElement("button");
    prevBtn.className = "lightbox-prev";
    prevBtn.setAttribute("aria-label", "Previous image");
    prevBtn.innerHTML = "&larr;";
    prevBtn.addEventListener("click", function () { step(-1); });

    var nextBtn = document.createElement("button");
    nextBtn.className = "lightbox-next";
    nextBtn.setAttribute("aria-label", "Next image");
    nextBtn.innerHTML = "&rarr;";
    nextBtn.addEventListener("click", function () { step(1); });

    figure = document.createElement("figure");
    figure.className = "lightbox-figure";

    imgEl = document.createElement("img");
    imgEl.className = "lightbox-img";

    caption = document.createElement("figcaption");
    caption.className = "lightbox-caption";

    counter = document.createElement("div");
    counter.className = "lightbox-counter";

    figure.appendChild(imgEl);
    figure.appendChild(caption);
    figure.appendChild(counter);

    overlay.appendChild(closeBtn);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(figure);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (overlay.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    var touchStartX = null;
    var touchStartY = null;

    overlay.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    overlay.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - touchStartX;
      var dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      var SWIPE_THRESHOLD = 40;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) step(1);
        else step(-1);
      }
    }, { passive: true });
  }

  function render() {
    var img = currentImages[currentIndex];
    imgEl.src = img.src;
    imgEl.alt = img.alt || "";
    caption.textContent = img.dataset.caption || img.alt || "";
    counter.textContent = (currentIndex + 1) + " / " + currentImages.length;
  }

  function step(delta) {
    currentIndex = (currentIndex + delta + currentImages.length) % currentImages.length;
    render();
  }

  function openLightbox(images, index) {
    if (!overlay) buildOverlay();
    currentImages = images;
    currentIndex = index;
    lastFocused = document.activeElement;
    render();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    overlay.querySelector(".lightbox-close").focus();
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
