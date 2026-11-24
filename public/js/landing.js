(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const art = document.querySelector('.world-art');
  if (!art || reduced) return;
  let frame = 0;
  window.addEventListener('pointermove', (event) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - 0.5) * 5;
      const y = (event.clientY / window.innerHeight - 0.5) * 4;
      art.style.translate = x + 'px ' + y + 'px';
    });
  }, { passive: true });
})();