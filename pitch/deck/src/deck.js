// Full4Less deck engine: navigation, beats, view transitions, stage scaling.
(() => {
  const stage = document.getElementById("stage");
  const slides = [...document.querySelectorAll(".slide")];
  const plate = document.getElementById("plate");
  const label = document.querySelector("#progress .count");
  const notes = document.getElementById("notes");
  let index = 0, step = 0;

  const fit = () => stage.style.setProperty("--scale", Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener("resize", fit);
  fit();

  // Split [data-split] text into words for the reveal
  document.querySelectorAll("[data-split]").forEach(el => {
    let w = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const f = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t.trim()) return f.append(t);
          const s = document.createElement("span");
          s.className = "w"; s.style.setProperty("--w", w++); s.textContent = t;
          f.append(s);
        });
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  });

  // Fallback stagger where sibling-index() is missing
  if (!CSS.supports("width", "calc(sibling-index() * 1px)"))
    document.querySelectorAll("[data-stagger]").forEach(p => [...p.children].forEach((c, i) => c.style.setProperty("--i", i + 1)));

  const beats = s => {
    const all = [...s.querySelectorAll("[data-beat]")].map(e => +e.dataset.beat);
    return all.length ? Math.max(...all) : 0;
  };

  const applyBeats = () => {
    const s = slides[index];
    s.dataset.step = step;
    s.querySelectorAll("[data-beat]").forEach(e => e.classList.toggle("on", +e.dataset.beat <= step));
    s.dispatchEvent(new CustomEvent("beat", { detail: { step } }));
  };

  const applySlide = () => {
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
    const s = slides[index];
    stage.dataset.tone = s.dataset.tone || (s.classList.contains("light") ? "light" : "dark");
    const [x, y, size, o] = (s.dataset.plate || "1500 540 800 .5").split(" ");
    plate.style.setProperty("--px", x + "px");
    plate.style.setProperty("--py", y + "px");
    plate.style.setProperty("--ps", size / 100);
    plate.style.setProperty("--po", o ?? .5);
    stage.style.setProperty("--prog", (index + 1) / slides.length);
    label.textContent = `${String(index + 1).padStart(2, "0")} / ${slides.length}`;
    notes.textContent = s.querySelector(".notes")?.textContent.trim() ?? "";
    location.hash = index + 1;
  };

  const go = (to, atStep = 0) => {
    if (to < 0 || to >= slides.length) return;
    if (to === index) { step = atStep; return applyBeats(); }
    const dir = to > index ? "forward" : "back";
    slides[index].dispatchEvent(new CustomEvent("leave"));
    const update = () => {
      index = to; step = atStep;
      applySlide();
      // Beats paint after the slide exists, so transitions run on arrival
      requestAnimationFrame(() => { applyBeats(); slides[index].dispatchEvent(new CustomEvent("enter")); });
    };
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try { document.startViewTransition({ update, types: [dir] }); }
      catch { document.startViewTransition(update); }
    } else update();
  };

  const next = () => step < beats(slides[index]) ? (step++, applyBeats()) : go(index + 1);
  const prev = () => step > 0 ? (step--, applyBeats()) : go(index - 1, beats(slides[index - 1] ?? slides[0]));

  addEventListener("keydown", e => {
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(slides.length - 1);
    else if (e.key === "n" || e.key === "N") notes.classList.toggle("open");
    else if (e.key === "f" || e.key === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  });
  stage.addEventListener("click", e => (e.clientX < innerWidth * .25 ? prev() : next()));

  index = Math.min(Math.max((parseInt(location.hash.slice(1)) || 1) - 1, 0), slides.length - 1);
  applySlide();
  requestAnimationFrame(() => { applyBeats(); slides[index].dispatchEvent(new CustomEvent("enter")); });

  // Test and print hook: show a slide with all beats, no transition
  window.deck = { show(i) { index = i; step = beats(slides[i]); applySlide(); applyBeats(); slides[i].dispatchEvent(new CustomEvent("enter")); }, count: slides.length };
})();
