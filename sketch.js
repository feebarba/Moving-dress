/*
 * Fitas Flexíveis — estudo 01
 * p5.js calcula o vento e desenha somente as superfícies preenchidas.
 */

const state = {
  wind: 0.58,
  speed: 1,
  softness: 0.68,
  count: 18,
  topWidth: 1,
  randomEnds: false,
  endWidth: 1,
  startSide: 'top',
  endSide: 'bottom',
  randomMotion: true,
  background: '#ffffff',
  ribbonColors: [[255, 255, 255], [134, 44, 14], [248, 63, 119], [231, 193, 206]],
  colorCount: 4,
  randomColors: false,
  paused: false,
  time: 0,
  marqueeTime: 0,
  textSpeed: 1,
  textColor: '#000000',
  textChunks: [],
  textCache: null,
};

const pathStops = [-0.12, 0.14, 0.39, 0.64, 0.91, 1.15];
const oppositeSide = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const binomial = [1, 5, 10, 10, 5, 1];
const sampleCount = 52;
const marqueeChunkSize = 4;
const marqueeSpeed = 48;
const textTextureScale = 2;
const textTextureHeight = 20;
const maxTextTextureWidth = 4096;
const sampleWeights = Array.from({ length: sampleCount + 1 }, (_, sample) => {
  const t = sample / sampleCount;
  return binomial.map((coefficient, i) => coefficient * Math.pow(1 - t, 5 - i) * Math.pow(t, i));
});
let ribbons = [];
let stage;
let layout;
const endVariations = [];
const randomGust = { value: 0, target: 0, nextAt: 0 };

function endVariation(index) {
  if (endVariations[index] === undefined) endVariations[index] = Math.random();
  return endVariations[index];
}

function setup() {
  stage = document.getElementById('canvas-wrap');
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
  frameRate(60);
  noiseSeed(83);
  createRibbons();
}

function edgeFrame(side) {
  if (side === 'top') return { x: width / 2, y: 0, tx: 1, ty: 0, span: width * 0.92 };
  if (side === 'bottom') return { x: width / 2, y: height, tx: 1, ty: 0, span: width * 0.92 };
  if (side === 'left') return { x: 0, y: height / 2, tx: 0, ty: 1, span: height * 0.92 };
  return { x: width, y: height / 2, tx: 0, ty: 1, span: height * 0.92 };
}

function createRibbons() {
  const start = edgeFrame(state.startSide);
  const end = edgeFrame(state.endSide);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const startProjection = start.tx * dx + start.ty * dy;
  const endProjection = end.tx * dx + end.ty * dy;
  if (startProjection * endProjection > 0) {
    end.tx *= -1;
    end.ty *= -1;
  }
  const length = Math.hypot(dx, dy);
  layout = {
    start, end, dx, dy,
    directionX: dx / length,
    directionY: dy / length,
    normalX: dy / length,
    normalY: -dx / length,
    startWidth: Math.min(75, start.span / (state.count - 1) * 0.76),
    endWidth: Math.min(75, end.span / (state.count - 1) * 0.76),
  };
  ribbons = Array.from({ length: state.count }, (_, index) => ({
    index,
    colorIndex: index % state.colorCount,
    position: index / (state.count - 1) - 0.5,
    endVariation: endVariation(index),
    offset: pathStops.map(() => 0),
    velocity: pathStops.map(() => 0),
    tipSkew: Math.min(36, 8 + layout.endWidth * 1.4) * 0.22 * Math.sin(index * 2.31),
    tipVelocity: 0,
    tipCurl: Math.min(14, 5 + layout.endWidth * 0.25) * 0.2 * Math.sin(index * 1.93),
    edgeLeft: pathStops.map(() => [0, 0]),
    edgeRight: pathStops.map(() => [0, 0]),
  }));
  assignRibbonColors();
}

function assignRibbonColors() {
  const order = ribbons.map((_, index) => index % state.colorCount);
  if (state.randomColors) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  ribbons.forEach((ribbon, index) => { ribbon.colorIndex = order[index]; });
}

function draw() {
  const dt = Math.min(deltaTime / 16.667, 3);
  const elapsed = Math.min(deltaTime, 50) / 1000 * state.speed;
  state.marqueeTime += Math.min(deltaTime, 50) / 1000 * state.textSpeed;
  state.time += elapsed;
  updateRandomGust(elapsed);
  background(state.background);
  for (const ribbon of ribbons) {
    updateRibbon(ribbon, dt);
    drawRibbon(ribbon);
  }
}

function updateRandomGust(elapsed) {
  if (!state.randomMotion) return;
  if (state.time >= randomGust.nextAt) {
    randomGust.target = random(-1.2, 1.2);
    randomGust.nextAt = state.time + random(0.7, 2.5);
  }
  randomGust.value += (randomGust.target - randomGust.value) * (1 - Math.exp(-elapsed * 1.7));
}

function updateRibbon(ribbon, dt) {
  const t = state.time;
  const ribbonEnd = state.randomEnds ? lerp(0.5, 1.15, ribbon.endVariation) : 1.15;
  const endScale = ribbonEnd / 1.15;
  const endWidthScale = state.randomEnds ? state.endWidth : 1;
  // Os valores atuais permanecem iguais; o trecho final de cada range ganha mais força.
  const windPeak = Math.pow(Math.max(0, (state.wind - 0.58) / 0.42), 2);
  const flexPeak = Math.pow(Math.max(0, (state.softness - 0.68) / 0.32), 2);
  const stiffness = lerp(0.17, 0.038, state.softness) - 0.014 * flexPeak;
  const drag = lerp(0.59, 0.82, state.softness) + 0.07 * flexPeak;
  const crossSpan = (layout.start.span + layout.end.span) * 0.5;
  const amplitude = Math.min(crossSpan * 0.093, 112) * (state.wind + 0.7 * windPeak) * (1 + 0.45 * flexPeak);
  const tipWind = state.wind + 0.35 * windPeak;
  const tipWave = state.randomMotion
    ? 0.65 * randomGust.value
      + 1.3 * (2 * noise(ribbon.index * 0.61 + 21.7, t * 0.48 + 8.4) - 1)
      + 0.6 * (2 * noise(ribbon.index * 0.37 + 59.2, t * 0.91 + 30.1) - 1)
    : Math.sin(t * 1.18 + ribbon.index * 1.73)
      + 0.32 * Math.sin(t * 0.53 - ribbon.index * 0.82);
  const tipRange = Math.min(36, 8 + layout.endWidth * 1.4);
  const tipTarget = Math.max(-tipRange * 1.5, Math.min(tipRange * 1.5,
    tipRange * (0.22 * Math.sin(ribbon.index * 2.31) + tipWind * tipWave)));
  ribbon.tipVelocity = (ribbon.tipVelocity + (tipTarget - ribbon.tipSkew) * (0.07 + 0.04 * state.softness) * dt) * Math.pow(0.78, dt);
  ribbon.tipSkew += ribbon.tipVelocity * dt;
  const curlWave = state.randomMotion
    ? 2 * noise(ribbon.index * 0.73 + 103.5, t * 0.64 + 12.8) - 1
    : Math.sin(t * 0.91 + ribbon.index * 1.47);
  const curlTarget = Math.min(14, 5 + layout.endWidth * 0.25)
    * (0.2 * Math.sin(ribbon.index * 1.93) + tipWind * curlWave);
  ribbon.tipCurl += (curlTarget - ribbon.tipCurl) * (1 - Math.pow(0.84, dt));

  for (let j = 0; j < pathStops.length; j++) {
    const baseStop = pathStops[j];
    const stop = baseStop * endScale;
    const u = Math.max(0, baseStop);
    let wave;
    let flutter;
    let twistMotion;
    if (state.randomMotion) {
      // Rajadas sem ciclo fixo, com variação comum e turbulência local suave.
      const broad = 2 * (noise(ribbon.index * 0.14 + 8.3, u * 0.9 + 20.7, t * 0.23) - 0.5);
      const detail = 2 * (noise(ribbon.index * 0.43 + 67.2, u * 2.4 + 4.5, t * 0.67) - 0.5);
      wave = 0.9 * randomGust.value + 1.7 * broad + 0.7 * detail;
      flutter = 0.32 * flexPeak * detail;
      twistMotion = detail;
    } else {
      wave =
        0.72 * Math.sin(t * 0.83 - u * 4.3 + ribbon.index * 0.39) +
        0.27 * Math.sin(t * 0.37 + u * 6.5 - ribbon.index * 0.18) +
        0.50 * (noise(ribbon.index * 0.23, u * 1.7, t * 0.19) - 0.5);
      flutter = 0.18 * flexPeak * Math.sin(t * 1.4 - u * 7.3 + ribbon.index * 0.31);
      twistMotion = Math.cos(t * 0.56 - u * 3.2 + ribbon.index * 0.51);
    }
    if (j === 0) {
      ribbon.offset[j] = 0;
      ribbon.velocity[j] = 0;
    } else {
      const looseness = Math.pow(Math.min(u, 1.12), 0.95 + 0.36 * flexPeak);
      const target = amplitude * looseness * (wave + flutter);
      ribbon.velocity[j] = (ribbon.velocity[j] + (target - ribbon.offset[j]) * stiffness * dt) * Math.pow(drag, dt);
      ribbon.offset[j] += ribbon.velocity[j] * dt;
    }

    const twist = 0.86 + 0.14 * twistMotion;
    // Start pode afunilar; End mantém toda a abertura na borda escolhida.
    const progress = Math.min(u / 0.85, 1);
    const open = progress * progress * (3 - 2 * progress);
    const startSpan = layout.start.span * state.topWidth * (1 - open);
    const endSpan = layout.end.span * open;
    const x = layout.start.x + layout.dx * stop + ribbon.position * (layout.start.tx * startSpan + layout.end.tx * endSpan) + layout.normalX * ribbon.offset[j];
    const y = layout.start.y + layout.dy * stop + ribbon.position * (layout.start.ty * startSpan + layout.end.ty * endSpan) + layout.normalY * ribbon.offset[j];
    const tangentX = layout.start.tx * (1 - open) + layout.end.tx * open;
    const tangentY = layout.start.ty * (1 - open) + layout.end.ty * open;
    const tangentLength = Math.hypot(tangentX, tangentY);
    const baseWidth = layout.startWidth * state.topWidth * (1 - open) + layout.endWidth * open;
    const taperProgress = Math.min(1, Math.max(0, baseStop / pathStops[pathStops.length - 1]));
    const stripWidth = baseWidth * (1 - (1 - endWidthScale) * taperProgress * taperProgress);
    const halfWidth = stripWidth * twist * 0.5 / tangentLength;
    ribbon.edgeLeft[j][0] = x - tangentX * halfWidth;
    ribbon.edgeLeft[j][1] = y - tangentY * halfWidth;
    ribbon.edgeRight[j][0] = x + tangentX * halfWidth;
    ribbon.edgeRight[j][1] = y + tangentY * halfWidth;
    const tipInfluence = j === pathStops.length - 1 ? 0.5 : j === pathStops.length - 2 ? 0.13 : 0;
    if (tipInfluence) {
      const shift = ribbon.tipSkew * endWidthScale * tipInfluence;
      ribbon.edgeLeft[j][0] -= layout.directionX * shift;
      ribbon.edgeLeft[j][1] -= layout.directionY * shift;
      ribbon.edgeRight[j][0] += layout.directionX * shift;
      ribbon.edgeRight[j][1] += layout.directionY * shift;
    }
  }
}

function pointOnBezier(points, sample) {
  const weights = sampleWeights[sample];
  let x = 0;
  let y = 0;
  for (let i = 0; i < weights.length; i++) {
    x += points[i][0] * weights[i];
    y += points[i][1] * weights[i];
  }
  return [x, y];
}

function drawRibbon(ribbon) {
  const color = state.ribbonColors[ribbon.colorIndex];
  const ctx = drawingContext;
  const left = ribbon.edgeLeft;
  const right = ribbon.edgeRight;
  const leftSamples = state.textCache ? [] : null;
  const rightSamples = state.textCache ? [] : null;

  ctx.beginPath();
  for (let i = 0; i <= sampleCount; i++) {
    const point = pointOnBezier(left, i);
    if (leftSamples) leftSamples.push(point);
    const [x, y] = point;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const tipLeft = left[left.length - 1];
  const tipRight = right[right.length - 1];
  if (rightSamples) rightSamples[sampleCount] = tipRight;
  const capX = tipRight[0] - tipLeft[0];
  const capY = tipRight[1] - tipLeft[1];
  const endWidthScale = state.randomEnds ? state.endWidth : 1;
  const curlX = layout.directionX * ribbon.tipCurl * endWidthScale;
  const curlY = layout.directionY * ribbon.tipCurl * endWidthScale;
  ctx.bezierCurveTo(
    tipLeft[0] + capX * 0.25 + curlX,
    tipLeft[1] + capY * 0.25 + curlY,
    tipLeft[0] + capX * 0.75 + curlX,
    tipLeft[1] + capY * 0.75 + curlY,
    tipRight[0], tipRight[1],
  );
  for (let i = sampleCount - 1; i >= 0; i--) {
    const point = pointOnBezier(right, i);
    if (rightSamples) rightSamples[i] = point;
    const [x, y] = point;
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  const middle = 2;
  const centerX = (left[middle][0] + right[middle][0]) * 0.5;
  const centerY = (left[middle][1] + right[middle][1]) * 0.5;
  const widthX = right[middle][0] - left[middle][0];
  const widthY = right[middle][1] - left[middle][1];
  const gradient = ctx.createLinearGradient(centerX - widthX, centerY - widthY, centerX + widthX, centerY + widthY);
  gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.60)`);
  gradient.addColorStop(0.38, `rgba(${color[0]},${color[1]},${color[2]},0.72)`);
  gradient.addColorStop(0.74, `rgba(${color[0]},${color[1]},${color[2]},0.82)`);
  gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0.67)`);
  ctx.fillStyle = gradient;
  ctx.fill();
  if (leftSamples) drawTextOnRibbon(ctx, leftSamples, rightSamples, ribbon.index);
}

function pointOnArc(points, distances, distance) {
  let segment;
  if (distance <= 0) segment = 1;
  else if (distance >= distances[distances.length - 1]) segment = distances.length - 1;
  else {
    let low = 1;
    let high = distances.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (distances[middle] < distance) low = middle + 1;
      else high = middle;
    }
    segment = low;
  }
  const before = points[segment - 1];
  const after = points[segment];
  const length = distances[segment] - distances[segment - 1];
  const mix = (distance - distances[segment - 1]) / (length || 1);
  return {
    x: before[0] + (after[0] - before[0]) * mix,
    y: before[1] + (after[1] - before[1]) * mix,
    angle: Math.atan2(after[1] - before[1], after[0] - before[0]),
  };
}

function rebuildTextCache() {
  if (!state.textChunks.length) {
    state.textCache = null;
    return;
  }
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  measureContext.font = '400 12px "IBM Plex Mono", monospace';
  const stride = marqueeChunkSize * measureContext.measureText('M').width;
  const chunksPerTile = Math.max(1, Math.floor(maxTextTextureWidth / (stride * textTextureScale)));
  const tiles = [];
  for (let start = 0; start < state.textChunks.length; start += chunksPerTile) {
    const chunks = state.textChunks.slice(start, start + chunksPerTile);
    const tile = document.createElement('canvas');
    tile.width = Math.ceil(chunks.length * stride * textTextureScale);
    tile.height = textTextureHeight * textTextureScale;
    const texture = tile.getContext('2d');
    texture.setTransform(textTextureScale, 0, 0, textTextureScale, 0, 0);
    texture.font = measureContext.font;
    texture.textAlign = 'left';
    texture.textBaseline = 'middle';
    texture.fillStyle = state.textColor;
    texture.fillText(chunks.join(''), 0, textTextureHeight / 2);
    tiles.push(tile);
  }
  state.textCache = { tiles, stride, chunksPerTile, height: textTextureHeight };
  if (state.paused) redraw();
}

function drawTextOnRibbon(ctx, leftSamples, rightSamples, ribbonIndex) {
  const cache = state.textCache;
  const centerline = [];
  const distances = [0];
  for (let i = 0; i <= sampleCount; i++) {
    const point = [
      (leftSamples[i][0] + rightSamples[i][0]) * 0.5,
      (leftSamples[i][1] + rightSamples[i][1]) * 0.5,
    ];
    if (i > 0) distances[i] = distances[i - 1] + Math.hypot(point[0] - centerline[i - 1][0], point[1] - centerline[i - 1][1]);
    centerline.push(point);
  }
  const pathLength = distances[sampleCount];
  const stride = cache.stride;
  if (pathLength < stride || stride <= 0) return;
  const loopLength = state.textChunks.length;
  const phase = (state.marqueeTime * marqueeSpeed + ribbonIndex * 83) % (loopLength * stride);

  ctx.save();
  ctx.clip();
  for (let index = Math.floor((-stride - phase) / stride); index <= Math.ceil((pathLength + stride - phase) / stride); index++) {
    const chunkIndex = ((index % loopLength) + loopLength) % loopLength;
    if (!state.textChunks[chunkIndex].trim()) continue;
    const tile = cache.tiles[Math.floor(chunkIndex / cache.chunksPerTile)];
    const localIndex = chunkIndex % cache.chunksPerTile;
    const sourceX = localIndex * stride * textTextureScale;
    const point = pointOnArc(centerline, distances, phase + (index + 0.5) * stride);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.angle);
    ctx.drawImage(tile, sourceX, 0, stride * textTextureScale, tile.height,
      -stride / 2, -cache.height / 2, stride, cache.height);
    ctx.restore();
  }
  ctx.restore();
}

function gust() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  const dx = constrain(mouseX - pmouseX, -45, 45);
  const dy = constrain(mouseY - pmouseY, -45, 45);
  if (Math.hypot(dx, dy) < 1) return;
  const sideways = dx * layout.normalX + dy * layout.normalY;
  for (const ribbon of ribbons) {
    for (let j = 1; j < pathStops.length; j++) {
      const centerX = (ribbon.edgeLeft[j][0] + ribbon.edgeRight[j][0]) * 0.5;
      const centerY = (ribbon.edgeLeft[j][1] + ribbon.edgeRight[j][1]) * 0.5;
      const distanceX = centerX - mouseX;
      const distanceY = centerY - mouseY;
      const across = distanceX * layout.normalX + distanceY * layout.normalY;
      const along = distanceX * layout.directionX + distanceY * layout.directionY;
      const reachAcross = Math.exp(-Math.abs(across) / 200);
      const reachAlong = Math.exp(-Math.abs(along) / 225);
      ribbon.velocity[j] += sideways * 0.38 * reachAcross * reachAlong;
    }
  }
}

function mouseMoved() { gust(); }
function mouseDragged() { gust(); return false; }
function touchMoved() { gust(); return false; }

function windowResized() {
  pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  createRibbons();
  if (state.paused) redraw();
}

function updateRange(input, output, value, suffix = '%') {
  output.value = `${value}${suffix}`;
  const pct = ((Number(value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty('--pct', `${pct}%`);
}

function hexToRgb(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

function makePanelDraggable(panel, togglePanel) {
  const handle = panel.querySelector('.panel-top');
  let drag = null;
  let suppressToggleClick = false;

  function clampPosition(left, top) {
    const parent = panel.parentElement.getBoundingClientRect();
    return {
      left: Math.max(0, Math.min(left, parent.width - panel.offsetWidth)),
      top: Math.max(0, Math.min(top, parent.height - panel.offsetHeight)),
    };
  }

  function keepInsideViewport() {
    if (!panel.style.left) return;
    const position = clampPosition(parseFloat(panel.style.left), parseFloat(panel.style.top));
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
  }

  handle.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!panel.classList.contains('collapsed') && event.target.closest('button')) return;
    const bounds = panel.getBoundingClientRect();
    const parent = panel.parentElement.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: bounds.left - parent.left,
      top: bounds.top - parent.top,
      moved: false,
    };
    (panel.classList.contains('collapsed') ? togglePanel : handle).setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.transform = 'none';
      panel.classList.add('dragging');
    }
    const position = clampPosition(drag.left + dx, drag.top + dy);
    panel.style.left = `${position.left}px`;
    panel.style.top = `${position.top}px`;
  });

  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved && panel.classList.contains('collapsed')) {
      suppressToggleClick = true;
      setTimeout(() => { suppressToggleClick = false; }, 0);
    }
    panel.classList.remove('dragging');
    drag = null;
  }
  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', finishDrag);
  togglePanel.addEventListener('click', (event) => {
    if (!suppressToggleClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressToggleClick = false;
  }, true);
  window.addEventListener('resize', keepInsideViewport);
  return keepInsideViewport;
}

function connectControls() {
  const wind = document.getElementById('wind');
  const speed = document.getElementById('speed');
  const softness = document.getElementById('softness');
  const count = document.getElementById('count');
  const topWidth = document.getElementById('top-width');
  const randomEnds = document.getElementById('random-ends');
  const endWidth = document.getElementById('end-width');
  const endWidthControl = document.getElementById('end-width-control');
  const startSide = document.getElementById('start-side');
  const endSide = document.getElementById('end-side');
  const randomMotion = document.getElementById('random-motion');
  const backgroundColor = document.getElementById('background-color');
  const backgroundValue = document.getElementById('background-value');
  const ribbonText = document.getElementById('ribbon-text');
  const textCount = document.getElementById('text-count');
  const textFeedback = document.getElementById('text-feedback');
  const textColor = document.getElementById('text-color');
  const textColorValue = document.getElementById('text-color-value');
  const textSpeed = document.getElementById('text-speed');
  const colorCount = document.getElementById('color-count');
  const randomColors = document.getElementById('random-colors');
  const ribbonColorInputs = [1, 2, 3, 4].map((index) => document.getElementById(`ribbon-color-${index}`));
  // As cores do HTML são o padrão do projeto, mesmo se o navegador restaurar valores antigos.
  for (const input of [backgroundColor, textColor, ...ribbonColorInputs]) input.value = input.defaultValue;
  try {
    const savedText = localStorage.getItem('fitas-flexiveis-ribbon-text');
    const savedPalette = JSON.parse(localStorage.getItem('fitas-flexiveis-ribbon-colors') || 'null');
    if (savedText !== null) ribbonText.value = savedText;
    if (savedPalette && typeof savedPalette === 'object') {
      if (Number.isInteger(savedPalette.count) && savedPalette.count >= 1 && savedPalette.count <= 4) colorCount.value = String(savedPalette.count);
      if (typeof savedPalette.random === 'boolean') randomColors.checked = savedPalette.random;
    }
  } catch (_) {
    // O desenho segue funcionando quando o iframe bloqueia armazenamento local.
  }
  function updateRibbonText() {
    const words = ribbonText.value.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
    const valid = words.length >= 20;
    const normalized = ribbonText.value.trim().replace(/\s+/gu, ' ');
    const glyphs = valid ? Array.from(`${normalized}  `) : [];
    while (glyphs.length % marqueeChunkSize) glyphs.push(' ');
    state.textChunks = [];
    for (let i = 0; i < glyphs.length; i += marqueeChunkSize) {
      state.textChunks.push(glyphs.slice(i, i + marqueeChunkSize).join(''));
    }
    rebuildTextCache();
    textCount.value = `${words.length} ${words.length === 1 ? 'palavra' : 'palavras'}`;
    textFeedback.textContent = valid
      ? 'Texto em movimento de Start para End.'
      : 20 - words.length === 1
        ? 'Falta 1 palavra para aparecer nas fitas.'
        : `Faltam ${20 - words.length} palavras para aparecer nas fitas.`;
    textFeedback.classList.toggle('invalid', !valid);
    ribbonText.setAttribute('aria-invalid', String(!valid));
    if (state.paused) redraw();
  }
  state.textColor = textColor.value;
  state.textSpeed = Number(textSpeed.value) / 100;
  state.ribbonColors = ribbonColorInputs.map((input) => hexToRgb(input.value));
  state.colorCount = Number(colorCount.value);
  state.randomColors = randomColors.checked;
  function updateColorSlots() {
    ribbonColorInputs.forEach((input, index) => {
      const inactive = index >= state.colorCount;
      input.disabled = inactive;
      input.classList.toggle('inactive', inactive);
    });
    document.getElementById('ribbon-colors').setAttribute('aria-label', state.randomColors ? 'Cores das fitas em ordem aleatória' : 'Cores das fitas em ordem');
  }
  function savePaletteOptions() {
    try {
      localStorage.setItem('fitas-flexiveis-ribbon-colors', JSON.stringify({
        count: state.colorCount,
        random: state.randomColors,
      }));
    } catch (_) { /* iframe sem armazenamento */ }
  }
  updateColorSlots();
  textColorValue.value = state.textColor.toUpperCase();
  updateRibbonText();
  // Alguns navegadores restauram os sliders após recarregar a página.
  state.wind = Number(wind.value) / 100;
  state.speed = Number(speed.value) / 100;
  state.softness = Number(softness.value) / 100;
  state.count = Number(count.value);
  state.topWidth = Number(topWidth.value) / 100;
  state.randomEnds = randomEnds.checked;
  state.endWidth = Number(endWidth.value) / 100;
  endWidthControl.hidden = !state.randomEnds;
  if (startSide.value === endSide.value) endSide.value = oppositeSide[startSide.value];
  state.startSide = startSide.value;
  state.endSide = endSide.value;
  state.randomMotion = randomMotion.checked;
  state.background = backgroundColor.value;
  document.documentElement.style.setProperty('--background-color', state.background);
  document.querySelector('meta[name="theme-color"]').content = state.background;
  backgroundValue.value = state.background.toUpperCase();
  if (stage) createRibbons();
  const pairs = [
    [wind, document.getElementById('wind-value'), '%'],
    [speed, document.getElementById('speed-value'), '%'],
    [softness, document.getElementById('softness-value'), '%'],
    [count, document.getElementById('count-value'), ''],
    [topWidth, document.getElementById('top-width-value'), '%'],
    [textSpeed, document.getElementById('text-speed-value'), '%'],
    [endWidth, document.getElementById('end-width-value'), '%'],
  ];
  for (const [input, output, suffix] of pairs) updateRange(input, output, input.value, suffix);

  wind.addEventListener('input', () => {
    state.wind = Number(wind.value) / 100;
    updateRange(wind, pairs[0][1], wind.value);
    if (state.paused) redraw();
  });
  speed.addEventListener('input', () => {
    state.speed = Number(speed.value) / 100;
    updateRange(speed, pairs[1][1], speed.value);
  });
  textSpeed.addEventListener('input', () => {
    state.textSpeed = Number(textSpeed.value) / 100;
    updateRange(textSpeed, pairs[5][1], textSpeed.value);
  });
  softness.addEventListener('input', () => {
    state.softness = Number(softness.value) / 100;
    updateRange(softness, pairs[2][1], softness.value);
  });
  count.addEventListener('input', () => {
    state.count = Number(count.value);
    updateRange(count, pairs[3][1], count.value, '');
    if (stage) createRibbons();
    if (state.paused) redraw();
  });
  topWidth.addEventListener('input', () => {
    state.topWidth = Number(topWidth.value) / 100;
    updateRange(topWidth, pairs[4][1], topWidth.value);
    if (state.paused) redraw();
  });
  endWidth.addEventListener('input', () => {
    state.endWidth = Number(endWidth.value) / 100;
    updateRange(endWidth, pairs[6][1], endWidth.value);
    if (state.paused) redraw();
  });
  randomEnds.addEventListener('change', () => {
    state.randomEnds = randomEnds.checked;
    endWidthControl.hidden = !state.randomEnds;
    if (state.randomEnds) {
      endVariations.length = 0;
      ribbons.forEach((ribbon) => { ribbon.endVariation = endVariation(ribbon.index); });
    }
    if (state.paused) redraw();
  });
  function changeDirection(changedSide) {
    if (startSide.value === endSide.value) {
      if (changedSide === 'start') endSide.value = oppositeSide[startSide.value];
      else startSide.value = oppositeSide[endSide.value];
    }
    state.startSide = startSide.value;
    state.endSide = endSide.value;
    if (stage) createRibbons();
    if (state.paused) redraw();
  }
  startSide.addEventListener('change', () => changeDirection('start'));
  endSide.addEventListener('change', () => changeDirection('end'));
  randomMotion.addEventListener('change', () => {
    state.randomMotion = randomMotion.checked;
    if (state.randomMotion) {
      randomGust.value = 0;
      randomGust.nextAt = state.time;
    }
    if (state.paused) redraw();
  });
  backgroundColor.addEventListener('input', () => {
    state.background = backgroundColor.value;
    backgroundValue.value = state.background.toUpperCase();
    document.documentElement.style.setProperty('--background-color', state.background);
    document.querySelector('meta[name="theme-color"]').content = state.background;
    if (state.paused) redraw();
  });
  ribbonText.addEventListener('input', () => {
    updateRibbonText();
    try { localStorage.setItem('fitas-flexiveis-ribbon-text', ribbonText.value); } catch (_) { /* iframe sem armazenamento */ }
  });
  textColor.addEventListener('input', () => {
    state.textColor = textColor.value;
    textColorValue.value = state.textColor.toUpperCase();
    rebuildTextCache();
    if (state.paused) redraw();
  });
  ribbonColorInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      state.ribbonColors[index] = hexToRgb(input.value);
      if (state.paused) redraw();
    });
  });
  colorCount.addEventListener('change', () => {
    state.colorCount = Number(colorCount.value);
    updateColorSlots();
    assignRibbonColors();
    savePaletteOptions();
    if (state.paused) redraw();
  });
  randomColors.addEventListener('change', () => {
    state.randomColors = randomColors.checked;
    updateColorSlots();
    assignRibbonColors();
    savePaletteOptions();
    if (state.paused) redraw();
  });

  const pause = document.getElementById('pause');
  pause.addEventListener('click', () => {
    state.paused = !state.paused;
    pause.innerHTML = state.paused ? 'Continuar <span>▷</span>' : 'Pausar <span>Ⅱ</span>';
    pause.setAttribute('aria-label', state.paused ? 'Continuar animação' : 'Pausar animação');
    if (state.paused) noLoop();
    else loop();
  });

  document.getElementById('save').addEventListener('click', () => saveCanvas('fitas-flexiveis', 'png'));

  const panel = document.querySelector('.panel');
  const togglePanel = document.getElementById('toggle-panel');
  const keepPanelInsideViewport = makePanelDraggable(panel, togglePanel);
  togglePanel.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    togglePanel.textContent = collapsed ? '+' : '−';
    togglePanel.setAttribute('aria-expanded', String(!collapsed));
    togglePanel.setAttribute('aria-label', collapsed ? 'Expandir painel' : 'Minimizar painel');
    keepPanelInsideViewport();
  });
}

connectControls();
window.addEventListener('load', () => {
  if (!window.p5) document.getElementById('error').hidden = false;
  if (document.fonts) document.fonts.load('400 12px "IBM Plex Mono"').then(rebuildTextCache).catch(() => {});
});
