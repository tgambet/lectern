// Applies the theme before first paint. Kept outside the bundle because it must
// run synchronously in <head>; the CSP allows it as a same-origin script.
(function () {
  var pref = "auto";
  try {
    pref = localStorage.getItem("lectern.theme") || "auto";
  } catch {
    // Storage blocked: follow the system.
  }
  var dark =
    pref === "dark" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
