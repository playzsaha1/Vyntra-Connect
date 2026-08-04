(function () {
  var reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  if (!("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("reveal-in");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  reveals.forEach(function (el) {
    observer.observe(el);
  });
})();

// Navbar background on scroll
(function () {
  var nav = document.getElementById("navbar");
  if (!nav) return;
  function onScroll() {
    if (window.scrollY > 24) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
