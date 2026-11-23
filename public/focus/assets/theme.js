// Runs before paint: same "theme" key as utshavpaudel.com.np, so the board follows the site's choice.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if ((t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
