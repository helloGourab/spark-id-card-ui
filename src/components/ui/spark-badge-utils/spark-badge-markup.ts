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
      background-color: #000000;
    }
  </style>
</head>
<body>
  <canvas id="scene-canvas"></canvas>
  <script>
    (function () {
      'use strict';

      var canvas = document.getElementById('scene-canvas');
      var ctx = canvas.getContext('2d', { alpha: false });

      // Half-resolution buffer used only for the bloom pass.
      var glowCanvas = document.createElement('canvas');
      var glowCtx = glowCanvas.getContext('2d');

      // Design space of the badge (all particle geometry is authored in these units)
      var DW = 380;
      var DH = 620;

      var width = 800;
      var height = 600;
      var dpr = 1;
      var cardW = 380;
      var cardH = 620;
      var upx = 1;        // css px per design unit
      var centerX = 400;
      var centerY = 420;
      var groundY = 540;

      // Particles are grouped by brightness tier so each tier can be stroked once.
      var groups = [[], [], []];
      var tierStart = [0, 0, 0];
      var tierEnd = [0, 0, 0];
      var segs = new Float32Array(0);

      var rain = [];
      var ground = [];

      var time = 0;
      var lastTime = 0;
      var pointerX = 0;
      var pointerY = 0;
      var easeX = 0;
      var easeY = 0;
      var quality = 1;
      var frameAvg = 16.7;
      var qualityTimer = 0;

      // ---------------------------------------------------------------- utils
      function h01(n) {
        n = n >>> 0;
        n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
        n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
        n = n ^ (n >>> 15);
        return (n >>> 0) / 4294967296;
      }

      function unitSeed() {
        return (Math.random() * 2147483647) | 0;
      }

      function rrPath(c, x, y, w, h, r) {
        var rad = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + rad, y);
        c.arcTo(x + w, y, x + w, y + h, rad);
        c.arcTo(x + w, y + h, x, y + h, rad);
        c.arcTo(x, y + h, x, y, rad);
        c.arcTo(x, y, x + w, y, rad);
        c.closePath();
      }

      // ------------------------------------------------------------ the mask
      // The badge is rasterised once into an offscreen mask. Particles are then
      // sampled from that mask, which gives us dense, correctly shaped bands
      // (instead of the thin "outline only" look of a pure line tracer).
      var MASK_M = 2;

      function buildMask() {
        var mw = DW * MASK_M;
        var mh = DH * MASK_M;
        var off = document.createElement('canvas');
        off.width = mw;
        off.height = mh;
        var c = off.getContext('2d', { willReadFrequently: true });
        c.setTransform(MASK_M, 0, 0, MASK_M, 0, 0);
        c.fillStyle = '#000000';
        c.fillRect(0, 0, DW, DH);
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = '#ffffff';
        c.fillStyle = '#ffffff';

        function strokeRR(x, y, w, h, r, lw, a) {
          c.globalAlpha = a;
          c.lineWidth = lw;
          rrPath(c, x, y, w, h, r);
          c.stroke();
        }

        function fillRR(x, y, w, h, r, a) {
          c.globalAlpha = a;
          rrPath(c, x, y, w, h, r);
          c.fill();
        }

        // Faint jittery metadata scribble bands
        function scribble(x, y, w, h, a, seed) {
          c.globalAlpha = a;
          c.lineWidth = 2.6;
          var n = Math.max(3, Math.floor(w / 17));
          for (var i = 0; i < n; i++) {
            var sw = 7 + h01(seed + i * 3) * 16;
            var sx = x + (w - sw) * h01(seed + i * 7 + 1);
            var sy = y + (h01(seed + i * 11 + 5) - 0.5) * h;
            c.beginPath();
            c.moveTo(sx, sy);
            c.lineTo(sx + sw, sy + (h01(seed + i * 13 + 9) - 0.5) * 2.2);
            c.stroke();
          }
        }

        // Card shell -------------------------------------------------------
        strokeRR(10.5, 10.5, 359, 599, 22, 9, 1);
        strokeRR(20, 20, 340, 580, 17, 1.6, 0.42);

        // Punch slot + clip bar
        strokeRR(151, 28, 78, 18, 9, 4.2, 1);
        fillRR(164, 15, 52, 13, 6, 0.95);

        // Header capsules
        strokeRR(33, 61, 176, 27, 8, 4.4, 0.95);
        strokeRR(234, 54, 112, 25, 7, 4.4, 0.9);
        scribble(40, 103, 138, 5, 0.8, 101);
        scribble(244, 96, 98, 5, 0.75, 211);

        // Main display box
        strokeRR(30, 124, 320, 240, 9, 8, 1);
        strokeRR(40, 134, 300, 220, 6, 1.6, 0.35);

        drawText(c, 'Gourab', 190, 244, 272, 126);

        // Metadata under the display box
        scribble(36, 378, 190, 5, 0.85, 307);
        scribble(240, 377, 100, 4, 0.7, 401);

        // Long pill bar
        strokeRR(33, 394, 254, 37, 11, 4.4, 0.95);

        // Two faint lines
        scribble(38, 447, 168, 4, 0.75, 503);
        scribble(38, 459, 106, 4, 0.6, 601);

        // Bottom capsule
        strokeRR(33, 473, 136, 33, 16, 4.4, 0.95);
        scribble(38, 516, 102, 4, 0.7, 701);

        // QR block, bottom right
        strokeRR(244, 458, 102, 124, 7, 4.4, 0.95);
        strokeRR(252, 466, 28, 28, 3, 4.4, 1);
        strokeRR(252, 547, 28, 28, 3, 4.4, 1);
        strokeRR(313, 466, 28, 28, 3, 4.4, 1);
        var mods = [
          [0, 1], [2, 0], [1, 2], [3, 1], [4, 0], [5, 2],
          [0, 3], [2, 4], [4, 3], [1, 5], [3, 5], [5, 4],
          [0, 5], [2, 6], [4, 6], [6, 2], [6, 4], [5, 6]
        ];
        var cell = 12.5;
        for (var q = 0; q < mods.length; q++) {
          fillRR(250 + mods[q][0] * cell, 464 + mods[q][1] * cell, 8.5, 8.5, 2, 0.9);
        }

        return off;
      }

      function drawText(c, text, cx, cy, maxW, maxH) {
        var size = 170;
        var font = '900 ' + size + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
        c.font = font;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        var w = c.measureText(text).width;
        // Squeeze horizontally so the word can be tall like the reference type.
        var squeeze = 0.78;
        if (w * squeeze > maxW * 0.94 || size > maxH) {
          size = Math.min((size * maxW * 0.94) / (w * squeeze), maxH * 0.98);
          c.font = '900 ' + size + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
        }
        c.save();
        c.translate(cx, cy);
        c.scale(squeeze, 1);
        c.globalAlpha = 1;
        c.fillText(text, 0, 0);
        c.restore();
      }

      // ------------------------------------------------------- particle build
      function pushParticle(lx, ly, angle, len, tier, w) {
        groups[tier].push({
          x: lx,
          y: ly,
          a: angle,
          l: len,
          w: w,
          s: unitSeed()
        });
      }

      function sampleMask(off) {
        groups = [[], [], []];
        var mw = off.width;
        var mh = off.height;
        var c = off.getContext('2d', { willReadFrequently: true });
        var data = c.getImageData(0, 0, mw, mh).data;
        var M = mw / DW;

        function A(px, py) {
          if (px < 0 || py < 0 || px >= mw || py >= mh) return 0;
          return data[((py * mw + px) << 2)];
        }

        var step = 1.85 * M;

        for (var gy = 0; gy < mh; gy += step) {
          for (var gx = 0; gx < mw; gx += step) {
            var sx = gx + Math.random() * step;
            var sy = gy + Math.random() * step;
            var ix = sx | 0;
            var iy = sy | 0;
            var a = A(ix, iy) / 255;
            if (a < 0.05) continue;

            // Slightly mottled sampling so flat areas breathe like chalk.
            if (Math.random() > 0.6 + a * 0.4) continue;

            var lx = sx / M - DW / 2;
            var ly = sy / M - DH / 2;

            var dx = A(ix + 2, iy) - A(ix - 2, iy);
            var dy = A(ix, iy + 2) - A(ix, iy - 2);
            var gm = Math.abs(dx) + Math.abs(dy);
            var tangent = Math.atan2(dx, -dy);
            var outward = Math.atan2(-dy, -dx);

            // Work out which way the local band runs so strokes hatch along it
            // (horizontal bars get horizontal dashes, side rails get vertical ones).
            var hWhite = 0;
            var vWhite = 0;
            for (var o = -12; o <= 12; o += 4) {
              if (A(ix + o, iy) > 110) hWhite++;
              if (A(ix, iy + o) > 110) vWhite++;
            }

            var angle;
            var isEdge = gm > 70;
            var roll = Math.random();
            if (roll < 0.46) {
              // dominant engraving direction of the reference
              angle = -0.68 + (Math.random() - 0.5) * 0.7;
            } else if (roll < 0.68) {
              angle = 0.68 + (Math.random() - 0.5) * 0.7;
            } else if (hWhite >= 5 && hWhite > vWhite) {
              angle = (roll < 0.82 ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.35;
            } else if (vWhite >= 5 && vWhite > hWhite) {
              angle = (roll < 0.82 ? 0 : Math.PI / 2) + (Math.random() - 0.5) * 0.35;
            } else if (isEdge) {
              angle = tangent + (Math.random() - 0.5) * 0.7;
            } else {
              angle = Math.random() * Math.PI * 2;
            }

            var r = Math.random();
            var tier = r < 0.22 ? 0 : (r < 0.62 ? 1 : 2);
            if (a > 0.9 && Math.random() < 0.4) tier = 2;

            var soft = 0;
            for (var so = -8; so <= 8; so += 4) {
              soft += A(ix + so, iy) + A(ix, iy + so) + A(ix + so, iy + so) + A(ix - so, iy + so);
            }
            soft /= 36 * 255;

            var deep = soft > 0.62;
            if (!deep && tier === 2 && Math.random() < 0.6) tier = 1;

            var len = deep
              ? 5.0 + Math.random() * 8.0
              : 2.4 + Math.random() * 4.2;
            var w = 0.8 + Math.random() * 0.4;
            pushParticle(lx, ly, angle, len, tier, w);

            // Fuzzy whiskers spilling out of the edges, like a dry brush.
            if (gm > 165 && Math.random() < 0.035) {
              var spikeLen = 2.5 + Math.random() * 3.5;
              pushParticle(
                lx + (Math.random() - 0.5) * 1.6,
                ly + (Math.random() - 0.5) * 1.6,
                outward + (Math.random() - 0.5) * 0.9,
                spikeLen,
                Math.random() < 0.3 ? 2 : (Math.random() < 0.6 ? 1 : 0),
                0.9 + Math.random() * 0.3
              );
            }
          }
        }
      }

      // Lanyard straps are outside the card, so they are built procedurally.
      function buildStraps(strapLen) {
        var angle = 1.13;             // from vertical
        var dirX = Math.sin(angle);
        var dirY = -Math.cos(angle);
        var halfWidth = 33;
        var bands = [-1, 1];

        for (var b = 0; b < 2; b++) {
          var side = bands[b];
          var ox = 190 + side * 15;
          var oy = -34;
          var phase = side * 1.7;

          for (var t = 0; t < strapLen; t += 1.8) {
            var wobble = Math.sin(t * 0.028 + phase) * 3.0 + Math.sin(t * 0.011 - phase) * 2.0;
            var grow = Math.min(1, 0.5 + t / 58);
            var widthNow = halfWidth * grow * (0.93 + 0.12 * Math.sin(t * 0.017 + phase));
            var bx = ox + side * dirX * t + Math.cos(angle) * wobble * side;
            var by = oy + dirY * t + Math.sin(angle) * wobble * side;

            for (var k = -1; k <= 1; k += 0.14) {
              var off = k * widthNow;
              var edge = Math.abs(k) > 0.7;
              var centerGap = Math.abs(k) < 0.09;
              if (centerGap) continue;
              var p = edge ? 0.85 : 0.22;
              if (Math.random() > p) continue;

              var px = bx + Math.cos(angle) * off;
              var py = by + Math.sin(angle) * off;
              var tier = Math.random() < 0.2 ? 0 : (Math.random() < 0.58 ? 1 : 2);
              var len = 2.8 + Math.random() * 4.4;
              var cross = Math.random() < 0.26;
              var strokeAngle = cross
                ? angle + Math.PI / 2 + (Math.random() - 0.5) * 0.7
                : angle + (Math.random() - 0.5) * 0.55;
              pushParticle(
                px - DW / 2,
                py - DH / 2,
                strokeAngle,
                len,
                tier,
                1.4 + Math.random() * 0.6
              );

              if (edge && Math.random() < 0.1) {
                pushParticle(
                  px - DW / 2,
                  py - DH / 2,
                  angle + (side < 0 ? -1.25 : 1.25) + (Math.random() - 0.5) * 0.6,
                  4 + Math.random() * 6,
                  Math.random() < 0.35 ? 2 : 0,
                  1.15
                );
              }
            }
          }
        }

        // Metal loop the straps thread through, sitting on the card's top edge
        var ringCX = 190;
        var ringCY = -11;
        var ringR = 14;
        for (var a = 0; a < Math.PI * 2; a += 0.035) {
          for (var rr = -0.6; rr <= 0.6; rr += 0.6) {
            if (Math.random() < 0.3) continue;
            var rrNow = ringR + rr * 3.2;
            var px2 = ringCX + Math.cos(a) * rrNow;
            var py2 = ringCY + Math.sin(a) * rrNow * 1.3;
            pushParticle(
              px2 - DW / 2 + (Math.random() - 0.5) * 1.4,
              py2 - DH / 2 + (Math.random() - 0.5) * 1.4,
              a + Math.PI / 2 + (Math.random() - 0.5) * 0.8,
              2.6 + Math.random() * 3.4,
              Math.random() < 0.55 ? 2 : 1,
              1.2 + Math.random() * 0.45
            );
          }
        }
      }

      function finalizeParticles() {
        var total = 0;
        for (var i = 0; i < 3; i++) {
          tierStart[i] = total;
          total += groups[i].length;
          tierEnd[i] = total;
        }
        segs = new Float32Array(total * 4);
      }

      // -------------------------------------------------------- environment
      function buildEnvironment() {
        rain = [];
        var area = width * height;
        var count = Math.round(area / 3400);
        count = Math.max(80, Math.min(620, count));
        var s = Math.max(0.7, Math.min(1.65, Math.min(width, height) / 770));

        for (var i = 0; i < count; i++) {
          var r = Math.random();
          rain.push({
            x: Math.random() * (width + 360) - 180,
            y: Math.random() * height,
            len: (58 + Math.random() * 170) * s,
            slant: 0.16 + Math.random() * 0.17,
            speed: (380 + Math.random() * 820) * s,
            alpha: 0.07 + Math.random() * 0.3,
            lineWidth: 0.5 + Math.random() * 0.55,
            style: r < 0.2 ? 1 : (r < 0.45 ? 2 : 0)
          });
        }

        ground = [];
        var gCount = Math.round(width * 1.15);
        for (var g = 0; g < gCount; g++) {
          var bias = Math.pow(Math.random(), 2.1);
          ground.push({
            x: Math.random() * (width + 120) - 60,
            y: groundY + bias * (height - groundY),
            len: 4 + Math.random() * (70 - bias * 46),
            alpha: (1 - bias * 0.7) * (0.06 + Math.random() * 0.32),
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 2.2
          });
        }
      }

      // ------------------------------------------------------------- sizing
      function resize() {
        width = window.innerWidth || document.documentElement.clientWidth || 800;
        height = window.innerHeight || document.documentElement.clientHeight || 600;
        width = Math.max(width, 320);
        height = Math.max(height, 480);
        dpr = Math.min(window.devicePixelRatio || 1, width * height > 1600 * 1000 ? 1.5 : 2);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        glowCanvas.width = Math.max(2, Math.floor(canvas.width / 2));
        glowCanvas.height = Math.max(2, Math.floor(canvas.height / 2));

        var wLimit = width < 700 ? width * 0.74 : width * 0.5;
        cardW = Math.min(wLimit, height * 0.455);
        cardW = Math.max(cardW, 170);
        cardH = cardW * (DH / DW);
        upx = cardW / DW;

        groundY = height * 0.94;
        centerX = width * 0.5;
        centerY = groundY - cardH * 0.5 - height * 0.028;

        var mask = buildMask();
        sampleMask(mask);
        buildStraps(Math.min(560, (centerY + 80) / upx + DH * 0.5));
        finalizeParticles();
        buildEnvironment();
      }

      // ---------------------------------------------------------- rendering
      var TIER_ALPHA = [0.52, 0.84, 1];
      var TIER_WIDTH = [0.9, 1.05, 1.25];

      function drawGround() {
        // soft light spill underneath the badge
        var gx = centerX;
        var gy = groundY;
        var radius = cardW * 0.62;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(1, 0.14);
        var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grd.addColorStop(0, 'rgba(255,255,255,0.07)');
        grd.addColorStop(0.45, 'rgba(255,255,255,0.03)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.lineCap = 'round';
        for (var i = 0; i < ground.length; i++) {
          var g = ground[i];
          var shimmer = 0.7 + 0.3 * Math.sin(time * g.speed + g.phase);
          var alpha = g.alpha * shimmer;
          if (alpha < 0.012) continue;
          ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(g.x, g.y);
          ctx.lineTo(g.x + g.len, g.y);
          ctx.stroke();
        }

        // horizon fringe
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.stroke();
      }

      function computeSegments() {
        var boil = Math.floor(time * 11);
        var n = 0;
        for (var ti = 0; ti < 3; ti++) {
          var arr = groups[ti];
          for (var i = 0; i < arr.length; i++) {
            var p = arr[i];
            var s = p.s;
            var r1 = h01(s + Math.imul(boil, 1013904223));
            var r2 = h01(Math.imul(s, 3) + Math.imul(boil, 1664525) + 17);
            var r3 = h01(Math.imul(s, 7) + Math.imul(boil, 22695477) + 31);
            var r4 = h01(Math.imul(s, 13) + Math.imul(boil, 2654435761) + 7);

            var o = n * 4;
            n++;

            if (r2 < 0.045 || (ti === 0 && quality < 1 && h01(s + 977) > quality)) {
              // let a few strokes rest each boil frame
              segs[o] = 0;
              segs[o + 1] = 0;
              segs[o + 2] = 0;
              segs[o + 3] = 0;
              continue;
            }

            var ang = p.a + (r1 - 0.5) * 0.38;
            var len = p.l * (0.55 + r2 * 0.95);
            var jx = p.x + (r3 - 0.5) * 0.6;
            var jy = p.y + (r4 - 0.5) * 0.6;
            var hx = Math.cos(ang) * len * 0.5;
            var hy = Math.sin(ang) * len * 0.5;

            segs[o] = jx - hx;
            segs[o + 1] = jy - hy;
            segs[o + 2] = jx + hx;
            segs[o + 3] = jy + hy;
          }
        }
      }

      function strokeTier(g, ti, lineWidth, style) {
        var start = tierStart[ti] * 4;
        var end = tierEnd[ti] * 4;
        g.beginPath();
        for (var o = start; o < end; o += 4) {
          var x1 = segs[o];
          var y1 = segs[o + 1];
          if (x1 === 0 && y1 === 0 && segs[o + 2] === 0 && segs[o + 3] === 0) continue;
          g.moveTo(x1, y1);
          g.lineTo(segs[o + 2], segs[o + 3]);
        }
        g.lineWidth = lineWidth;
        g.strokeStyle = style;
        g.stroke();
      }

      function drawBadge(scale) {
        var tilt = -0.05 + Math.sin(time * 0.33) * 0.007 + easeY * 0.05;
        var floatY = Math.sin(time * 0.72) * 2.4;
        var cx = centerX + easeX * 10;
        var cy = centerY + floatY + (centerY - height * 0.5) * 0;

        var shiftX = -Math.sin(easeX) * 20;
        var shiftY = Math.sin(easeY) * 12;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.scale(scale, scale);
        ctx.translate(shiftX, shiftY);

        ctx.lineCap = 'round';
        for (var ti = 0; ti < 3; ti++) {
          strokeTier(
            ctx,
            ti,
            TIER_WIDTH[ti],
            'rgba(255,255,255,' + TIER_ALPHA[ti] + ')'
          );
        }
        ctx.restore();
      }

      function drawGlow() {
        var scale = upx;
        var tilt = -0.05 + Math.sin(time * 0.33) * 0.007 + easeY * 0.05;
        var floatY = Math.sin(time * 0.72) * 2.4;
        var cx = centerX + easeX * 10;
        var cy = centerY + floatY;
        var shiftX = -Math.sin(easeX) * 20;
        var shiftY = Math.sin(easeY) * 12;

        glowCtx.setTransform(1, 0, 0, 1, 0, 0);
        glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
        glowCtx.save();
        glowCtx.scale(0.5, 0.5);
        glowCtx.translate(cx, cy);
        glowCtx.rotate(tilt);
        glowCtx.scale(scale, scale);
        glowCtx.translate(shiftX, shiftY);
        glowCtx.lineCap = 'round';

        for (var ti = 1; ti < 3; ti++) {
          strokeTier(
            glowCtx,
            ti,
            2.2,
            'rgba(255,255,255,' + (ti === 2 ? 0.3 : 0.16) + ')'
          );
        }
        glowCtx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.2;
        ctx.filter = 'blur(1.6px)';
        ctx.drawImage(glowCanvas, 0, 0, width, height);
        ctx.restore();
      }

      function drawRain(dt) {
        ctx.lineCap = 'round';
        for (var i = 0; i < rain.length; i++) {
          var r = rain[i];
          var dx = r.slant * r.len;

          ctx.strokeStyle = 'rgba(255,255,255,' + r.alpha.toFixed(3) + ')';
          ctx.lineWidth = r.lineWidth;
          ctx.beginPath();

          if (r.style === 1) {
            var dashes = 3;
            for (var d = 0; d < dashes; d++) {
              var t0 = d / dashes;
              var t1 = (d + 0.52) / dashes;
              ctx.moveTo(r.x - dx * (1 - t0), r.y - r.len * (1 - t0));
              ctx.lineTo(r.x - dx * (1 - t1), r.y - r.len * (1 - t1));
            }
          } else if (r.style === 2) {
            var dots = Math.max(3, Math.floor(r.len / 7));
            for (var p = 0; p < dots; p++) {
              var t = p / dots;
              var x = r.x - dx * (1 - t);
              var y = r.y - r.len * (1 - t);
              ctx.moveTo(x, y);
              ctx.lineTo(x + dx / r.len * 1.6, y + 1.6);
            }
          } else {
            ctx.moveTo(r.x - dx, r.y - r.len);
            ctx.lineTo(r.x, r.y);
          }
          ctx.stroke();

          var step = r.speed * dt;
          r.y += step;
          r.x += step * r.slant;

          if (r.y - r.len > groundY) {
            r.y = -Math.random() * 120;
            r.x = Math.random() * (width + 360) - 180;
          }
        }
      }

      function render(now) {
        var dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
        lastTime = now;
        time += dt;

        frameAvg = frameAvg * 0.94 + dt * 1000 * 0.06;
        qualityTimer += dt;
        if (qualityTimer > 1.5) {
          qualityTimer = 0;
          if (frameAvg > 27 && quality > 0.65) {
            quality = Math.max(0.65, quality - 0.08);
          } else if (frameAvg < 17.5 && quality < 1) {
            quality = Math.min(1, quality + 0.05);
          }
        }

        easeX += (pointerX - easeX) * 0.05;
        easeY += (pointerY - easeY) * 0.05;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        drawGround();

        computeSegments();
        drawBadge(upx);
        if (quality > 0.5) drawGlow();

        drawRain(dt);

        requestAnimationFrame(render);
      }

      // ------------------------------------------------------------- events
      function setPointer(clientX, clientY) {
        pointerX = (clientX / width - 0.5) * 2;
        pointerY = (clientY / height - 0.5) * 2;
      }

      window.addEventListener('mousemove', function (e) {
        setPointer(e.clientX, e.clientY);
      }, { passive: true });

      window.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });

      window.addEventListener('mouseleave', function () {
        pointerX = 0;
        pointerY = 0;
      });

      var resizeTimer = 0;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
      });

      resize();
      requestAnimationFrame(render);
    })();
  </script>
</body>
</html>
`;
