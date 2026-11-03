    (() => {
      const cube = document.getElementById('home-rubik');
      const tilt = document.getElementById('home-rubik-tilt');
      const interaction = document.getElementById('home-rubik-interaction');
      if (!cube || !tilt || !interaction) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let targetX = 0, targetY = 0, currentX = 0, currentY = 0, frame = null, lastTime = null;
      let drag = null;
      function animateTilt(time) {
        const delta = lastTime === null ? 16.7 : Math.max(0, Math.min(time - lastTime, 50));
        lastTime = time;
        const easing = 1 - Math.exp(-delta / 240);
        const desiredX = (targetX - currentX) * easing;
        const desiredY = (targetY - currentY) * easing;
        const distance = Math.hypot(desiredX, desiredY);
        const maxStep = 100 * delta / 1000;
        const speedScale = distance > maxStep ? maxStep / distance : 1;
        currentX += desiredX * speedScale;
        currentY += desiredY * speedScale;
        if (Math.abs(targetX - currentX) < 0.02 && Math.abs(targetY - currentY) < 0.02) {
          currentX = targetX; currentY = targetY;
          tilt.style.setProperty('--pointer-x', `${currentX}deg`);
          tilt.style.setProperty('--pointer-y', `${currentY}deg`);
          frame = null; lastTime = null;
          return;
        }
        tilt.style.setProperty('--pointer-x', `${currentX.toFixed(2)}deg`);
        tilt.style.setProperty('--pointer-y', `${currentY.toFixed(2)}deg`);
        frame = requestAnimationFrame(animateTilt);
      }
      function scheduleTilt() { if (frame === null) frame = requestAnimationFrame(animateTilt); }
      interaction.addEventListener('pointerdown', event => {
        if (reducedMotion.matches || (event.pointerType === 'mouse' && event.button !== 0)) return;
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angleX: targetX, angleY: targetY };
        interaction.setPointerCapture(event.pointerId);
        interaction.classList.add('is-dragging');
      });
      interaction.addEventListener('pointermove', event => {
        if (reducedMotion.matches) return;
        if (drag && event.pointerId === drag.id) {
          targetX = drag.angleX - (event.clientY - drag.y) * 0.8;
          targetY = drag.angleY + (event.clientX - drag.x) * 0.8;
          scheduleTilt(); return;
        }
        if (event.pointerType === 'touch') return;
        const bounds = interaction.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
        const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
        targetX = -y * 180; targetY = x * 180;
        scheduleTilt();
      });
      function endDrag(event) {
        if (!drag || event.pointerId !== drag.id) return;
        drag = null; interaction.classList.remove('is-dragging');
        if (interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
      }
      interaction.addEventListener('pointerup', endDrag);
      interaction.addEventListener('pointercancel', endDrag);
      interaction.addEventListener('lostpointercapture', endDrag);
      interaction.addEventListener('pointerleave', () => {
        if (drag) return;
        targetX = 0; targetY = 0;
        scheduleTilt();
      });
      reducedMotion.addEventListener('change', event => {
        if (!event.matches) return;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; lastTime = null; targetX = 0; targetY = 0; currentX = 0; currentY = 0; drag = null; interaction.classList.remove('is-dragging');
        tilt.style.removeProperty('--pointer-x'); tilt.style.removeProperty('--pointer-y');
      });
      const cubies = [];
      const faces = [
        ['front', 'z', 1], ['back', 'z', -1], ['right', 'x', 1],
        ['left', 'x', -1], ['top', 'y', -1], ['bottom', 'y', 1]
      ];
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        const element = document.createElement('div'); element.className = 'cubie';
        const cubie = { element, x, y, z, orientation: new DOMMatrix(), stickers: [], activeLayer: null };
        for (const [face, axis, side] of faces) {
          const tile = document.createElement('div');
          tile.className = `cubie-face c-${face}`;
          if (cubie[axis] === side) {
            tile.classList.add('sticker');
            cubie.stickers.push({ tile, x: axis === 'x' ? side : 0, y: axis === 'y' ? side : 0, z: axis === 'z' ? side : 0, last: null });
          }
          const isCentre = axis === 'x' ? y === 0 && z === 0 : axis === 'y' ? x === 0 && z === 0 : x === 0 && y === 0;
          if (cubie[axis] === side && isCentre) tile.classList.add('logo');
          element.appendChild(tile);
        }
        cube.appendChild(element); cubies.push(cubie);
      }
      function position(cubie) {
        const offset = coordinate => coordinate === 0 ? '0px' : coordinate < 0 ? 'calc(0px - var(--unit))' : 'var(--unit)';
        cubie.element.style.transform = `translate3d(${offset(cubie.x)}, ${offset(cubie.y)}, ${offset(cubie.z)}) ${cubie.orientation.toString()}`;
      }
      cubies.forEach(position);
      function cssMatrix(element) {
        const transform = getComputedStyle(element).transform;
        return transform && transform !== 'none' ? new DOMMatrix(transform) : new DOMMatrix();
      }
      function updateLighting() {
        if (!document.hidden && interaction.getClientRects().length) {
          const world = cssMatrix(tilt).multiply(cssMatrix(cube));
          const layerMatrices = new Map();
          cubies.forEach(cubie => {
            if (!cubie.stickers.length) return;
            let parent = world;
            if (cubie.activeLayer) {
              if (!layerMatrices.has(cubie.activeLayer)) layerMatrices.set(cubie.activeLayer, world.multiply(cssMatrix(cubie.activeLayer)));
              parent = layerMatrices.get(cubie.activeLayer);
            }
            const matrix = parent.multiply(cubie.orientation);
            cubie.stickers.forEach(sticker => {
              const level = RubikLighting.brightness(matrix, sticker.x, sticker.y, sticker.z);
              if (sticker.last !== level) { sticker.tile.style.filter = `brightness(${level})`; sticker.last = level; }
            });
          });
        }
        requestAnimationFrame(updateLighting);
      }
      requestAnimationFrame(updateLighting);
      function turn(axis, slice, direction) {
        return new Promise(resolve => {
          const layer = document.createElement('div'); layer.className = 'rubik-layer';
          const selected = cubies.filter(cubie => cubie[axis] === slice);
          cube.appendChild(layer); selected.forEach(cubie => { cubie.activeLayer = layer; layer.appendChild(cubie.element); });
          const angle = 90 * direction;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            layer.style.transition = 'transform 650ms cubic-bezier(.4,0,.2,1)';
            layer.style.transform = `rotate${axis.toUpperCase()}(${angle}deg)`;
            setTimeout(() => {
              const rotation = new DOMMatrix().rotateAxisAngle(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0, angle);
              selected.forEach(cubie => {
                const point = new DOMPoint(cubie.x, cubie.y, cubie.z).matrixTransform(rotation);
                cubie.x = Math.round(point.x); cubie.y = Math.round(point.y); cubie.z = Math.round(point.z);
                cubie.orientation = rotation.multiply(cubie.orientation);
                cubie.activeLayer = null;
                position(cubie); cube.appendChild(cubie.element);
              });
              layer.remove(); resolve();
            }, 700);
          }));
        });
      }
      const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
      async function cycle() {
        while (true) {
          await pause(5500);
          if (reducedMotion.matches) continue;
          for (let move = 0; move < 4 && !reducedMotion.matches; move++) {
            const axis = Math.random() < 0.5 ? 'x' : 'y';
            const slice = Math.floor(Math.random() * 3) - 1;
            await turn(axis, slice, Math.random() < 0.5 ? -1 : 1);
            await pause(400);
          }
        }
      }
      cycle();
    })();
