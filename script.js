(() => {
  "use strict";

  /* ============================================================
     0. AMBIENT PARTICLE BACKGROUND (opening scene canvas)
     ============================================================ */
  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function sizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = [];
    const count = Math.round((rect.width * rect.height) / 16000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.25 + 0.05),
        vx: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.5 + 0.15,
      });
    }
  }

  function drawParticles() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4) p.y = rect.height + 4;
      if (p.x < -4) p.x = rect.width + 4;
      if (p.x > rect.width + 4) p.x = -4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 220, ${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }

  if (canvas) {
    sizeCanvas();
    requestAnimationFrame(drawParticles);
    window.addEventListener("resize", sizeCanvas);
  }

  /* ============================================================
     1. PULL & RELEASE OPENING MECHANISM
     ============================================================ */
  const stage = document.querySelector(".gift-stage");
  const handle = document.getElementById("handle");
  const stringPath = document.getElementById("stringPath");
  const giftCard = document.getElementById("giftCard");
  const giftHint = document.getElementById("giftHint");
  const openingSection = document.getElementById("opening");
  const burstLayer = document.getElementById("burstLayer");
  const site = document.getElementById("site");

  const MAX_PULL = 130;      // px of travel before "release" opens the gift
  const READY_PULL = 95;     // px at which it's "ready" to release
  let pulling = false;
  let startY = 0;
  let currentPull = 0;
  let opened = false;
  let lastTrailAt = 0;

  function setStringLength(len) {
    // string goes from top of handle area (y=0) down to the pulled point
    const clamped = Math.max(0, Math.min(len, 220));
    stringPath.setAttribute("d", `M100,0 L100,${80 + clamped}`);
  }

  function updateHandlePosition(pull) {
    handle.style.transform = `translateY(${pull}px)`;
    setStringLength(pull);

    // Card reacts physically: slight tilt + scale based on pull amount
    const ratio = Math.min(pull / MAX_PULL, 1);
    const tilt = ratio * 4;
    const scale = 1 - ratio * 0.04;
    giftCard.style.transform = `rotateX(${tilt}deg) scale(${scale})`;

    stage.classList.toggle("is-pulling", pull > 6);
    stage.classList.toggle("is-ready", pull >= READY_PULL);

    if (giftHint) {
      giftHint.textContent = pull >= READY_PULL ? "release!" : "pull & release";
    }
  }

  function spawnTrailHeart(clientX, clientY) {
    const now = performance.now();
    if (now - lastTrailAt < 60) return;
    lastTrailAt = now;
    const el = document.createElement("span");
    el.className = "trail-heart";
    el.textContent = "❤";
    const rect = openingSection.getBoundingClientRect();
    el.style.left = clientX - rect.left + "px";
    el.style.top = clientY - rect.top + "px";
    burstLayer.appendChild(el);
    const dx = (Math.random() - 0.5) * 40;
    el.animate(
      [
        { transform: "translate(0,0) scale(0.8)", opacity: 0.9 },
        { transform: `translate(${dx}px, -50px) scale(1.1)`, opacity: 0 },
      ],
      { duration: 900, easing: "cubic-bezier(0.22,1,0.36,1)" }
    ).onfinish = () => el.remove();
  }

  function onPointerDown(e) {
    if (opened) return;
    pulling = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    handle.setPointerCapture && e.pointerId != null && handle.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!pulling || opened) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const delta = Math.max(0, y - startY);
    // Rubber-band resistance past MAX_PULL for a "physical" feel
    currentPull = delta <= MAX_PULL ? delta : MAX_PULL + (delta - MAX_PULL) * 0.15;
    updateHandlePosition(currentPull);
    if (currentPull > 20) spawnTrailHeart(e.touches ? e.touches[0].clientX : e.clientX, y);
    e.preventDefault && e.preventDefault();
  }

  function springBack() {
    const start = currentPull;
    const duration = 500;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      // spring-ish ease out with slight overshoot
      const eased = 1 - Math.pow(1 - t, 3) * Math.cos(t * 4);
      const val = start * (1 - eased);
      updateHandlePosition(Math.max(0, val));
      if (t < 1) requestAnimationFrame(step);
      else updateHandlePosition(0);
    }
    requestAnimationFrame(step);
  }

  function onPointerUp() {
    if (!pulling || opened) return;
    pulling = false;
    if (currentPull >= READY_PULL) {
      openGift();
    } else {
      springBack();
    }
    currentPull = 0;
  }

  handle.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);

  handle.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("touchend", onPointerUp);
  window.addEventListener("touchcancel", onPointerUp);

  handle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!opened) openGift();
    }
  });

  function burstHearts() {
    const emojis = ["❤", "💗", "✨", "💫"];
    const rect = openingSection.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const count = 26;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "burst-particle";
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      el.style.fontSize = 12 + Math.random() * 16 + "px";
      burstLayer.appendChild(el);
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 120 + Math.random() * 220;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      el.animate(
        [
          { transform: "translate(-50%,-50%) scale(0.3)", opacity: 1 },
          { transform: `translate(${dx - 50}%, ${dy - 50}%) scale(1)`, opacity: 0 },
        ],
        { duration: 1000 + Math.random() * 500, easing: "cubic-bezier(0.16,1,0.3,1)" }
      );
    }
  }

  function openGift() {
    if (opened) return;
    opened = true;
    updateHandlePosition(currentPull || READY_PULL);
    stage.classList.add("is-opening");
    burstHearts();

    setTimeout(() => {
      openingSection.classList.add("is-hidden");
      site.hidden = false;
      document.body.style.overflow = "";
      initRevealObservers();
      requestAnimationFrame(() => {
        document.querySelectorAll(".hero [data-reveal]").forEach((el, i) => {
          setTimeout(() => el.classList.add("is-visible"), i * 160);
        });
      });
    }, 750);
  }

  // Lock scroll until opened
  document.body.style.overflow = "hidden";

  /* ============================================================
     2. HERO FLOATING HEARTS
     ============================================================ */
  const heroParticles = document.getElementById("heroParticles");
  if (heroParticles) {
    const symbols = ["❤", "✨", "♡"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      s.style.left = Math.random() * 100 + "%";
      s.style.setProperty("--dx", (Math.random() - 0.5) * 80 + "px");
      s.style.animationDuration = 10 + Math.random() * 10 + "s";
      s.style.animationDelay = Math.random() * 10 + "s";
      s.style.fontSize = 10 + Math.random() * 12 + "px";
      heroParticles.appendChild(s);
    }
  }

  /* ============================================================
     3. LOVE CARDS
     ============================================================ */
  const loveItems = [
    { icon: "😊", title: "Your Smile", text: "It has a way of fixing my entire day without even trying." },
    { icon: "🥹", title: "Your Cute Little Habits", text: "The small things you do without noticing are somehow my favorite things." },
    { icon: "🌙", title: "The Way You Make Me Happy", text: "Effortlessly, constantly, and exactly when I need it most." },
    { icon: "💬", title: "Our Endless Conversations", text: "Hours feel like minutes when I'm talking to you." },
    { icon: "📸", title: "Our Beautiful Memories", text: "Every one of them, I keep somewhere safe in my head." },
    { icon: "🌸", title: "Your Presence", text: "Just knowing you're there makes everything feel okay." },
    { icon: "⭐", title: "How Special You Became", text: "Slowly, then suddenly — you became the most important part of my life." },
    { icon: "❤️", title: "Simply... YOU", text: "No explanation needed. It's just you." },
  ];

  const loveGrid = document.getElementById("loveGrid");
  if (loveGrid) {
    loveItems.forEach((item, i) => {
      const card = document.createElement("article");
      card.className = "love-card";
      card.style.transitionDelay = (i % 3) * 0.08 + "s";
      card.innerHTML = `
        <span class="love-card__icon">${item.icon}</span>
        <h3 class="love-card__title">${item.title}</h3>
        <p class="love-card__text">${item.text}</p>
      `;
      addTiltInteraction(card);
      loveGrid.appendChild(card);
    });
  }

  function addTiltInteraction(card) {
    const maxTilt = 8;
    function tilt(clientX, clientY) {
      const rect = card.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width - 0.5;
      const py = (clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(0) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) scale(1.03)`;
    }
    function reset() {
      card.style.transform = "";
      card.classList.remove("is-touched");
    }
    card.addEventListener("mousemove", (e) => tilt(e.clientX, e.clientY));
    card.addEventListener("mouseleave", reset);
    card.addEventListener("touchstart", (e) => {
      card.classList.add("is-touched");
      const t = e.touches[0];
      tilt(t.clientX, t.clientY);
    }, { passive: true });
    card.addEventListener("touchend", reset);
  }

  /* ============================================================
     4. TIMELINE
     ============================================================ */
  const storyItems = [
    { title: "The First Hello", text: "One simple conversation, and somehow it never really stopped." },
    { title: "When We Started Getting Close", text: "Every day talking to you started feeling like a favorite part of my routine." },
    { title: "The Moments That Made Me Smile", text: "So many little things, all adding up to something big." },
    { title: "The Silly Fights", text: "Even those, somehow, made us understand each other better." },
    { title: "The Beautiful Memories", text: "Some conversations I still go back and read again." },
    { title: "Everything We Became", text: "From strangers to the most important person in my life." },
  ];

  const timeline = document.getElementById("timeline");
  if (timeline) {
    storyItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "timeline-card";
      card.innerHTML = `
        <h3 class="timeline-card__title">${item.title}</h3>
        <p class="timeline-card__text">${item.text}</p>
      `;
      timeline.appendChild(card);
    });
  }

  /* ============================================================
     5. LOVE LETTER
     ============================================================ */
  const envelope = document.getElementById("envelope");
  const letterText = document.getElementById("letterText");
  const LETTER = `Nida,
I don't think words will ever be enough to explain how special you are to me.
You became a beautiful part of my life, my memories and my heart.
No matter how simple a moment is, somehow it becomes special when it's with you.
I just want you to know that you mean more to me than I can explain. ❤️`;

  let letterOpened = false;
  function openLetter() {
    if (letterOpened) return;
    letterOpened = true;
    envelope.classList.add("is-open");
    typeText(letterText, LETTER, 18);
    spawnFloatingHearts(envelope, 10);
  }
  if (envelope) {
    envelope.addEventListener("click", openLetter);
    envelope.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLetter(); }
    });
  }

  function typeText(el, text, speed) {
    el.textContent = "";
    let i = 0;
    function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      }
    }
    step();
  }

  function spawnFloatingHearts(container, count) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement("span");
        el.className = "trail-heart";
        el.textContent = "❤";
        el.style.position = "absolute";
        el.style.left = 40 + Math.random() * 20 + "%";
        el.style.top = "60%";
        el.style.fontSize = 12 + Math.random() * 10 + "px";
        container.style.position = "relative";
        container.appendChild(el);
        el.animate(
          [
            { transform: "translateY(0)", opacity: 0.9 },
            { transform: `translateY(-120px) translateX(${(Math.random() - 0.5) * 60}px)`, opacity: 0 },
          ],
          { duration: 1600, easing: "ease-out" }
        ).onfinish = () => el.remove();
      }, i * 180);
    }
  }

  /* ============================================================
     6. TIME COUNTER
     ============================================================ */
  const START_DATE = new Date("2025-02-23T00:00:00");
  const cDays = document.getElementById("cDays");
  const cHours = document.getElementById("cHours");
  const cMinutes = document.getElementById("cMinutes");
  const cSeconds = document.getElementById("cSeconds");

  function tickNum(el, value) {
    if (el.textContent !== String(value)) {
      el.textContent = value;
      el.classList.add("is-ticking");
      setTimeout(() => el.classList.remove("is-ticking"), 250);
    }
  }

  function updateCounter() {
    const now = new Date();
    let diff = Math.max(0, now - START_DATE) / 1000; // seconds
    const days = Math.floor(diff / 86400);
    diff -= days * 86400;
    const hours = Math.floor(diff / 3600);
    diff -= hours * 3600;
    const minutes = Math.floor(diff / 60);
    diff -= minutes * 60;
    const seconds = Math.floor(diff);

    if (cDays) tickNum(cDays, days);
    if (cHours) tickNum(cHours, hours);
    if (cMinutes) tickNum(cMinutes, minutes);
    if (cSeconds) tickNum(cSeconds, seconds);
  }
  if (cDays) {
    updateCounter();
    setInterval(updateCounter, 1000);
  }

  /* ============================================================
     7. MEMORY WALL
     ============================================================ */
  const memories = [
    { title: "That conversation I'll never forget…", full: "The one where we talked for hours and neither of us wanted to say goodnight." },
    { title: "That moment you made me smile…", full: "Out of nowhere, in the middle of a completely normal day." },
    { title: "That silly little argument…", full: "The one that ended in laughter within ten minutes, like it always does." },
    { title: "That moment I realized how important you are…", full: "It hit me quietly, not all at once — and it never really left since." },
    { title: "All those little moments that became memories…", full: "None of them planned, all of them unforgettable." },
  ];

  const memoryWall = document.getElementById("memoryWall");
  if (memoryWall) {
    memories.forEach((m, i) => {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.setAttribute("tabindex", "0");
      card.innerHTML = `
        <h3 class="memory-card__title">${m.title}</h3>
        <p class="memory-card__full">${m.full}</p>
      `;
      function toggle() { card.classList.toggle("is-open"); }
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      memoryWall.appendChild(card);
    });
  }

  /* ============================================================
     8. FINAL SECTION PARTICLES
     ============================================================ */
  const finalParticles = document.getElementById("finalParticles");
  if (finalParticles) {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("span");
      s.textContent = "❤";
      s.style.left = Math.random() * 100 + "%";
      s.style.animationDuration = 9 + Math.random() * 8 + "s";
      s.style.animationDelay = Math.random() * 9 + "s";
      s.style.fontSize = 10 + Math.random() * 14 + "px";
      finalParticles.appendChild(s);
    }
  }

  /* ============================================================
     9. SCROLL REVEAL OBSERVERS
     ============================================================ */
  function initRevealObservers() {
    const revealTargets = document.querySelectorAll(
      "[data-reveal], .love-card, .timeline-card, .memory-card"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));

    // Final section: reveal lines one by one when section enters view
    const finalLines = document.querySelectorAll("#finalLines [data-line]");
    const finalIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            finalLines.forEach((line, i) => {
              setTimeout(() => line.classList.add("is-visible"), i * 650);
            });
            finalIo.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    const finalSection = document.getElementById("finalSection");
    if (finalSection) finalIo.observe(finalSection);
  }
})();
