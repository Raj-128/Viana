document.addEventListener("DOMContentLoaded", () => {
  const heroSub = document.querySelector(".hero-sub");

  if (!window.gsap) {
    if (heroSub) heroSub.style.opacity = "1";
    return;
  }

  document.querySelectorAll('.hero-title .line').forEach(line => {
    line.innerHTML = `<span>${line.innerText}</span>`;
  });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.from(".hero", {
    opacity: 0,
    duration: 0.8
  })
  .from(".hero-title .line span", {
    yPercent: 120,
    duration: 1,
    stagger: 0.15
  }, "-=0.4")
  .to(".hero-sub", {
    opacity: 1,
    y: -5,
    duration: 0.6
  }, "-=0.4");

});
