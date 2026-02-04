const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const toggle = document.querySelector("[data-nav-toggle]");

const setHeaderScrolled = () => {
  if (!header) return;
  header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
};

const closeNav = () => {
  if (!nav || !toggle) return;
  nav.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
};

const toggleNav = () => {
  if (!nav || !toggle) return;
  const isOpen = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(isOpen));
};

setHeaderScrolled();
window.addEventListener("scroll", setHeaderScrolled, { passive: true });

toggle?.addEventListener("click", toggleNav);

nav?.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLAnchorElement)) return;
  if (!target.getAttribute("href")?.startsWith("#")) return;
  closeNav();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeNav();
});

