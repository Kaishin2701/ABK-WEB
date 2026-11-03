(() => {
    const sphere = document.getElementById('home-sphere');
    const tilt = document.getElementById('home-sphere-tilt');
    if (!sphere || !tilt) return;
    for (let angle = 0; angle < 180; angle += 20) {
        const ring = document.createElement('div');
        ring.className = 'home-sphere-ring';
        ring.style.transform = `rotateY(${angle}deg)`;
        sphere.appendChild(ring);
    }
    for (const offset of [-120, -80, -40, 0, 40, 80, 120]) {
        const diameter = 2 * Math.sqrt(155 * 155 - offset * offset);
        const ring = document.createElement('div');
        ring.className = 'home-sphere-ring home-sphere-latitude';
        ring.style.width = `${diameter}px`;
        ring.style.height = `${diameter}px`;
        ring.style.margin = `${-diameter / 2}px`;
        ring.style.transform = `rotateX(90deg) translateZ(${offset}px)`;
        sphere.appendChild(ring);
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    tilt.addEventListener('pointermove', event => {
        if (reducedMotion.matches || event.pointerType === 'touch') return;
        const bounds = tilt.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
        tilt.style.setProperty('--home-tilt-x', `${(-y * 14).toFixed(1)}deg`);
        tilt.style.setProperty('--home-tilt-y', `${(x * 18).toFixed(1)}deg`);
    });
    tilt.addEventListener('pointerleave', () => {
        tilt.style.removeProperty('--home-tilt-x');
        tilt.style.removeProperty('--home-tilt-y');
    });
})();
