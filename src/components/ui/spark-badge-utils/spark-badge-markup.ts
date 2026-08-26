export const SPARK_BADGE_MARKUP = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gourab Spark Badge</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #000000 !important;
      position: fixed;
      inset: 0;
      margin: 0;
      padding: 0;
    }

    #scene-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
      background-color: #000000;
    }

    #scene-canvas:active {
      cursor: grabbing;
    }
  </style>
</head>
<body>
  <canvas id="scene-canvas"></canvas>

  <script>
    (function() {
      const canvas = document.getElementById('scene-canvas');
      const ctx = canvas.getContext('2d');

      let dpr = 1;
      let width = 800;
      let height = 600;

      function getDimensions() {
        const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 800;
        const h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 600;
        return { w: Math.max(w, 320), h: Math.max(h, 480) };
      }

      function resize() {
        const dims = getDimensions();
        width = dims.w;
        height = dims.h;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }

      window.addEventListener('resize', resize);
      resize();

      // --- Slanted Spark Rain ---
      const rainCount = 260;
      const rain = [];
      for (let i = 0; i < rainCount; i++) {
        rain.push({
          x: Math.random() * (width + 600) - 300,
          y: Math.random() * height,
          len: Math.random() * 26 + 14,
          speed: Math.random() * 10 + 16,
          slant: -0.45,
          alpha: Math.random() * 0.6 + 0.35,
          width: Math.random() * 1.1 + 0.6
        });
      }

      // --- Splash Sparks ---
      const sparks = [];
      function addSplash(x, y, count = 3) {
        for (let i = 0; i < count; i++) {
          sparks.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4.5,
            vy: -Math.random() * 3.5 - 1,
            life: 1.0,
            decay: Math.random() * 0.05 + 0.03,
            size: Math.random() * 1.5 + 0.8
          });
        }
      }

      // --- Interactive Cursor Physics ---
      let mouse = { x: width / 2, y: height / 2 };
      let targetRotX = 0;
      let targetRotY = 0;
      let rotX = 0;
      let rotY = 0;
      let time = 0;

      function onMove(clientX, clientY) {
        mouse.x = clientX;
        mouse.y = clientY;
        const normX = (mouse.x - width / 2) / (width / 2 || 1);
        const normY = (mouse.y - height / 2) / (height / 2 || 1);
        targetRotY = normX * 0.30;
        targetRotX = -normY * 0.24;
      }

      window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
      window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      window.addEventListener('mouseleave', () => {
        targetRotX = 0;
        targetRotY = 0;
      });

      // --- Extract Vector Edge Contours of "Gourab" Font ---
      const textBufferW = 320;
      const textBufferH = 100;
      const textCanvas = document.createElement('canvas');
      textCanvas.width = textBufferW;
      textCanvas.height = textBufferH;
      const tCtx = textCanvas.getContext('2d');

      tCtx.fillStyle = '#000000';
      tCtx.fillRect(0, 0, textBufferW, textBufferH);
      tCtx.fillStyle = '#ffffff';
      tCtx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      tCtx.textAlign = 'center';
      tCtx.textBaseline = 'middle';
      tCtx.fillText('Gourab', textBufferW / 2, textBufferH / 2);

      const tImg = tCtx.getImageData(0, 0, textBufferW, textBufferH);
      const tData = tImg.data;
      const textContours = [];

      // Extract outline perimeter points of each letter
      for (let y = 1; y < textBufferH - 1; y += 2) {
        for (let x = 1; x < textBufferW - 1; x += 2) {
          const idx = (y * textBufferW + x) * 4;
          const val = tData[idx];

          if (val > 80) {
            // Check if boundary pixel
            const up = tData[((y - 1) * textBufferW + x) * 4];
            const down = tData[((y + 1) * textBufferW + x) * 4];
            const left = tData[(y * textBufferW + (x - 1)) * 4];
            const right = tData[(y * textBufferW + (x + 1)) * 4];

            if (up < 80 || down < 80 || left < 80 || right < 80) {
              textContours.push({
                x: x - textBufferW / 2,
                y: y - textBufferH / 2,
                seed: Math.random() * Math.PI * 2,
                rate: Math.random() * 0.4 + 0.2
              });
            }
          }
        }
      }

      // --- Core Procedural Animated Sketch & Spark Line Routine ---
      function drawAnimatedSketchLine(x1, y1, x2, y2, passes = 3, jitter = 1.4, alpha = 0.9) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return;

        const segments = Math.max(3, Math.floor(dist / 12));
        const normalX = -dy / dist;
        const normalY = dx / dist;

        for (let p = 0; p < passes; p++) {
          ctx.beginPath();
          const pAlpha = alpha * (0.6 + Math.random() * 0.4);
          ctx.strokeStyle = \`rgba(255, 255, 255, \${pAlpha.toFixed(2)})\`;
          ctx.lineWidth = (Math.random() * 0.85 + 0.65) * dpr;

          const pSeed = p * 1.7 + time * 14;
          let curX = (x1 + Math.sin(pSeed) * jitter) * dpr;
          let curY = (y1 + Math.cos(pSeed) * jitter) * dpr;
          ctx.moveTo(curX, curY);

          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const wave = Math.sin(pSeed + s * 1.8) * jitter;
            const targetX = (x1 + dx * t + normalX * wave) * dpr;
            const targetY = (y1 + dy * t + normalY * wave) * dpr;
            ctx.lineTo(targetX, targetY);
          }
          ctx.stroke();

          // Tangent spark needles along the stroke
          if (Math.random() < 0.45) {
            const st = Math.random();
            const sx = (x1 + dx * st) * dpr;
            const sy = (y1 + dy * st) * dpr;
            const nLen = (Math.random() * 6 + 3) * dpr;
            const nAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 0.7 * dpr;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(nAngle) * nLen, sy + Math.sin(nAngle) * nLen);
            ctx.stroke();
          }
        }
      }

      function drawAnimatedSketchRect(x, y, w, h, passes = 3, jitter = 1.3, alpha = 0.85) {
        drawAnimatedSketchLine(x, y, x + w, y, passes, jitter, alpha);
        drawAnimatedSketchLine(x + w, y, x + w, y + h, passes, jitter, alpha);
        drawAnimatedSketchLine(x + w, y + h, x, y + h, passes, jitter, alpha);
        drawAnimatedSketchLine(x, y + h, x, y, passes, jitter, alpha);
      }

      function drawAnimatedSketchRoundedRect(x, y, w, h, r = 16, passes = 3, jitter = 1.3, alpha = 0.9) {
        drawAnimatedSketchLine(x + r, y, x + w - r, y, passes, jitter, alpha);
        drawAnimatedSketchLine(x + w, y + r, x + w, y + h - r, passes, jitter, alpha);
        drawAnimatedSketchLine(x + w - r, y + h, x + r, y + h, passes, jitter, alpha);
        drawAnimatedSketchLine(x, y + h - r, x, y + r, passes, jitter, alpha);

        // Rounded corners
        drawAnimatedSketchLine(x + w - r, y, x + w, y + r, passes, jitter, alpha);
        drawAnimatedSketchLine(x + w, y + h - r, x + w - r, y + h, passes, jitter, alpha);
        drawAnimatedSketchLine(x + r, y + h, x, y + h - r, passes, jitter, alpha);
        drawAnimatedSketchLine(x, y + r, x + r, y, passes, jitter, alpha);
      }

      function drawAnimatedHatchBox(x, y, w, h, density = 7, jitter = 1.2, alpha = 0.45) {
        for (let ox = 0; ox < w + h; ox += density) {
          const x1 = Math.max(x, x + ox - h);
          const y1 = Math.min(y + h, y + ox);
          const x2 = Math.min(x + w, x + ox);
          const y2 = Math.max(y, y + ox - w);
          if (x1 < x2 && y1 > y2) {
            drawAnimatedSketchLine(x1, y1, x2, y2, 1, jitter, alpha);
          }
        }
      }

      // --- Fully Animated Living "Gourab" Sketch Text ---
      function drawLivingGourabText(scale = 1) {
        const numPts = textContours.length;

        for (let i = 0; i < numPts; i++) {
          const p = textContours[i];

          // Dynamic vibrational jitter along letter perimeter
          const jx = Math.sin(time * 16 + p.seed) * 1.6;
          const jy = Math.cos(time * 16 + p.seed) * 1.6;

          const px = (p.x * scale + jx) * dpr;
          const py = (p.y * scale + jy) * dpr;

          // Tangent spinning needle along the letter contour
          const angle = p.seed + time * p.rate * 8;
          const len = (Math.random() * 6 + 4) * scale * dpr;

          const x1 = px - Math.cos(angle) * (len / 2);
          const y1 = py - Math.sin(angle) * (len / 2);
          const x2 = px + Math.cos(angle) * (len / 2);
          const y2 = py + Math.sin(angle) * (len / 2);

          const alpha = 0.5 + 0.5 * Math.sin(time * 12 + p.seed);

          ctx.beginPath();
          ctx.strokeStyle = \`rgba(255, 255, 255, \${alpha.toFixed(2)})\`;
          ctx.lineWidth = 0.9 * dpr;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Occasional spark dot on text
          if (Math.random() < 0.003) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 1.0 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // --- Outer Edge Electric Corona (Vibrating Radial Bristles) ---
      function drawOuterCorona(halfW, halfH, cardW, cardH) {
        const numPoints = 240;
        for (let i = 0; i < numPoints; i++) {
          const t = (i / numPoints) * Math.PI * 2;
          
          let px = 0, py = 0, nx = 0, ny = 0;
          const cosT = Math.cos(t);
          const sinT = Math.sin(t);
          
          if (Math.abs(cosT) * cardH > Math.abs(sinT) * cardW) {
            px = Math.sign(cosT) * halfW;
            py = Math.sign(sinT) * Math.min(halfH, Math.abs(sinT / cosT) * halfW);
            nx = Math.sign(cosT);
            ny = 0;
          } else {
            px = Math.sign(cosT) * Math.min(halfW, Math.abs(cosT / sinT) * halfH);
            py = Math.sign(sinT) * halfH;
            nx = 0;
            ny = Math.sign(sinT);
          }

          const bristleLen = (Math.random() * 10 + 5) + Math.sin(time * 18 + i * 0.5) * 3.5;
          const normalAngle = Math.atan2(ny || sinT, nx || cosT);
          const bristleAngle = normalAngle + (Math.random() - 0.5) * 1.1;

          const bx1 = px * dpr;
          const by1 = py * dpr;
          const bx2 = (px + Math.cos(bristleAngle) * bristleLen) * dpr;
          const by2 = (py + Math.sin(bristleAngle) * bristleLen) * dpr;

          ctx.beginPath();
          ctx.strokeStyle = \`rgba(255, 255, 255, \${(0.4 + Math.random() * 0.55).toFixed(2)})\`;
          ctx.lineWidth = (Math.random() * 0.85 + 0.6) * dpr;
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.stroke();

          if (Math.random() < 0.025) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx2, by2, 1.1 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // --- Main 60fps Render Loop ---
      function render() {
        time += 0.02;

        if (width === 0 || height === 0) resize();

        // 3D Tilt Inertia & Floating Hover
        const floatY = Math.sin(time * 0.8) * 8;
        const idleSwayX = Math.sin(time * 0.9) * 0.03;
        const idleSwayY = Math.cos(time * 0.7) * 0.035;

        rotX += (targetRotX + idleSwayX - rotX) * 0.07;
        rotY += (targetRotY + idleSwayY - rotY) * 0.07;

        // Clear Canvas to Pure Black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1. Ground Reflection Floor
        const groundY = height * 0.84;
        const groundHeight = height - groundY;

        for (let gy = groundY; gy < height; gy += 4) {
          const streakAlpha = (1 - (gy - groundY) / groundHeight) * 0.45;
          for (let sx = 0; sx < width; sx += Math.random() * 65 + 30) {
            const streakLen = Math.random() * 55 + 15;
            ctx.beginPath();
            ctx.strokeStyle = \`rgba(255, 255, 255, \${streakAlpha.toFixed(2)})\`;
            ctx.lineWidth = 0.8 * dpr;
            ctx.moveTo(sx * dpr, gy * dpr);
            ctx.lineTo((sx + streakLen) * dpr, gy * dpr);
            ctx.stroke();
          }
        }

        // 2. Slanted Needle Rain
        for (let i = 0; i < rain.length; i++) {
          const r = rain[i];
          ctx.beginPath();
          ctx.strokeStyle = \`rgba(255, 255, 255, \${r.alpha})\`;
          ctx.lineWidth = r.width * dpr;
          ctx.moveTo(r.x * dpr, r.y * dpr);
          ctx.lineTo((r.x + r.slant * r.len) * dpr, (r.y + r.len) * dpr);
          ctx.stroke();

          r.x += r.slant * r.speed;
          r.y += r.speed;

          if (r.y >= groundY + Math.random() * 30) {
            if (Math.random() < 0.18) addSplash(r.x, groundY, 2);
            r.y = -r.len - Math.random() * 40;
            r.x = Math.random() * (width + 600) - 300;
          }
        }

        // 3. Splash Spark Embers
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.15;
          s.life -= s.decay;

          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.fillStyle = \`rgba(255, 255, 255, \${s.life.toFixed(2)})\`;
          ctx.beginPath();
          ctx.arc(s.x * dpr, s.y * dpr, s.size * s.life * dpr, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Hanging Badge with 3D Transform
        ctx.save();

        const centerX = width / 2;
        const centerY = height * 0.44 + floatY;

        ctx.translate(centerX * dpr, centerY * dpr);

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        ctx.transform(cosY, sinY * sinX * 0.3, 0, cosX, -sinY * 35 * dpr, sinX * 25 * dpr);
        ctx.scale(1 / dpr, 1 / dpr);

        const cardW = Math.min(310, width * 0.82);
        const cardH = cardW * 1.52;
        const halfW = cardW / 2;
        const halfH = cardH / 2;
        const r = 20;

        // 4a. Wide Lanyard Straps (extending to top corners with cross-hatches)
        const strapTopY = -centerY - 80;
        const strapLeftTopX = -halfW * 0.95;
        const strapRightTopX = halfW * 0.95;
        const clipX = 0;
        const clipY = -halfH - 24;

        // Left Strap
        drawAnimatedSketchLine(strapLeftTopX - 22, strapTopY, clipX - 18, clipY, 3, 2, 0.85);
        drawAnimatedSketchLine(strapLeftTopX + 16, strapTopY, clipX - 2, clipY, 3, 2, 0.85);
        drawAnimatedHatchBox(clipX - 22, clipY, 24, Math.abs(strapTopY - clipY), 6, 2.5, 0.5);

        // Right Strap
        drawAnimatedSketchLine(strapRightTopX + 22, strapTopY, clipX + 18, clipY, 3, 2, 0.85);
        drawAnimatedSketchLine(strapRightTopX - 16, strapTopY, clipX + 2, clipY, 3, 2, 0.85);
        drawAnimatedHatchBox(clipX - 2, clipY, 24, Math.abs(strapTopY - clipY), 6, 2.5, 0.5);

        // Top Metallic Clip & Slot
        drawAnimatedSketchRect(clipX - 18, clipY, 36, 22, 3, 1.2, 0.9);
        drawAnimatedHatchBox(clipX - 16, clipY + 2, 32, 18, 4, 1.0, 0.6);
        drawAnimatedSketchRoundedRect(clipX - 24, -halfH + 8, 48, 12, 6, 3, 1.2, 0.85);

        // 4b. Outer Edge Electric Corona (The signature furry halo)
        drawOuterCorona(halfW, halfH, cardW, cardH);

        // 4c. Card Outer Border (Multi-pass layered sketch)
        drawAnimatedSketchRoundedRect(-halfW, -halfH, cardW, cardH, r, 4, 1.8, 0.95);
        drawAnimatedSketchRoundedRect(-halfW + 4, -halfH + 4, cardW - 8, cardH - 8, r - 4, 2, 1.3, 0.65);

        // 4d. Top Header Slots
        const innerW = cardW - 36;
        const leftX = -innerW / 2;

        drawAnimatedSketchRoundedRect(leftX, -halfH + 34, innerW * 0.52, 24, 6, 3, 1.2, 0.85);
        drawAnimatedHatchBox(leftX + 4, -halfH + 38, innerW * 0.52 - 8, 16, 5, 1.0, 0.45);

        drawAnimatedSketchRoundedRect(leftX + innerW * 0.56, -halfH + 34, innerW * 0.44, 24, 6, 3, 1.2, 0.85);
        drawAnimatedHatchBox(leftX + innerW * 0.56 + 4, -halfH + 38, innerW * 0.44 - 8, 16, 5, 1.0, 0.45);

        // 4e. Main Center Box & Fully Animated "Gourab" Typography
        const centerBoxY = -halfH + 74;
        const centerBoxH = cardH * 0.38;

        drawAnimatedSketchRoundedRect(leftX, centerBoxY, innerW, centerBoxH, 14, 4, 1.6, 0.95);

        // Render Living "Gourab" Contour Field
        ctx.save();
        ctx.translate(0, (centerBoxY + centerBoxH / 2) * dpr);
        drawLivingGourabText(cardW / 310);
        ctx.restore();

        // 4f. Sub-Divider Lines & Horizontal Capsule
        const lineY1 = centerBoxY + centerBoxH + 18;
        drawAnimatedSketchLine(leftX, lineY1, leftX + innerW * 0.92, lineY1, 2, 1.2, 0.75);
        drawAnimatedSketchLine(leftX, lineY1 + 9, leftX + innerW * 0.75, lineY1 + 9, 2, 1.2, 0.65);

        const pillY = lineY1 + 22;
        drawAnimatedSketchRoundedRect(leftX, pillY, innerW * 0.94, 28, 8, 3, 1.3, 0.85);
        drawAnimatedHatchBox(leftX + 6, pillY + 4, innerW * 0.94 - 12, 20, 6, 1.0, 0.4);

        // 4g. Bottom Section: Left Capsule & Right QR Matrix
        const bottomY = pillY + 42;
        const bottomH = cardH - (bottomY + halfH) - 16;

        drawAnimatedSketchRoundedRect(leftX, bottomY + 10, innerW * 0.46, 26, 10, 3, 1.2, 0.8);
        drawAnimatedHatchBox(leftX + 4, bottomY + 14, innerW * 0.46 - 8, 18, 5, 1.0, 0.4);

        // QR Matrix
        const qrSize = Math.min(84, bottomH + 28);
        const qrX = leftX + innerW - qrSize;
        const qrY = bottomY - 6;

        drawAnimatedSketchRect(qrX, qrY, qrSize, qrSize, 3, 1.3, 0.9);
        const anchorSize = 18;

        // Top-left anchor
        drawAnimatedSketchRect(qrX + 3, qrY + 3, anchorSize, anchorSize, 2, 1.0, 0.9);
        drawAnimatedHatchBox(qrX + 6, qrY + 6, anchorSize - 6, anchorSize - 6, 3, 0.8, 0.75);

        // Top-right anchor
        drawAnimatedSketchRect(qrX + qrSize - anchorSize - 3, qrY + 3, anchorSize, anchorSize, 2, 1.0, 0.9);
        drawAnimatedHatchBox(qrX + qrSize - anchorSize, qrY + 6, anchorSize - 6, anchorSize - 6, 3, 0.8, 0.75);

        // Bottom-left anchor
        drawAnimatedSketchRect(qrX + 3, qrY + qrSize - anchorSize - 3, anchorSize, anchorSize, 2, 1.0, 0.9);
        drawAnimatedHatchBox(qrX + 6, qrY + qrSize - anchorSize, anchorSize - 6, anchorSize - 6, 3, 0.8, 0.75);

        // Internal QR grid dots
        for (let qy = qrY + 26; qy < qrY + qrSize - 4; qy += 7) {
          for (let qx = qrX + 26; qx < qrX + qrSize - 4; qx += 7) {
            if ((qx + qy) % 3 === 0 || Math.random() < 0.35) {
              drawAnimatedSketchRect(qx, qy, 5, 5, 1, 0.8, 0.75);
            }
          }
        }

        ctx.restore();

        requestAnimationFrame(render);
      }

      render();
    })();
  </script>
</body>
</html>
`;


