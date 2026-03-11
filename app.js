(function () {
  const refImageInput = document.getElementById('refImageInput');
  const refImageEl = document.getElementById('refImage');
  const refPlaceholder = document.getElementById('refPlaceholder');
  const imageInput = document.getElementById('imageInput');
  const imageEl = document.getElementById('image');
  const overlay = document.getElementById('overlay');
  const canvasWrap = document.getElementById('canvasWrap');
  const placeholder = document.getElementById('placeholder');
  const imageInputB = document.getElementById('imageInputB');
  const imageElB = document.getElementById('imageB');
  const overlayB = document.getElementById('overlayB');
  const canvasWrapB = document.getElementById('canvasWrapB');
  const placeholderB = document.getElementById('placeholderB');
  const cellList = document.getElementById('cellList');
  const rowsInput = document.getElementById('rowsInput');
  const colsInput = document.getElementById('colsInput');
  const cellWidthInput = document.getElementById('cellWidthInput');
  const cellHeightInput = document.getElementById('cellHeightInput');
  const groundTruthFileInput = document.getElementById('groundTruthFileInput');
  const groundTruthFileName = document.getElementById('groundTruthFileName');
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnB = document.getElementById('saveBtnB');
  const saveLabelBtn = document.getElementById('saveLabelBtn');
  const clearAllBtn = document.getElementById('clearAll');
  const similarBtn = document.getElementById('similarBtn');
  const modeSelectBtn = document.getElementById('modeSelect');
  const modeDragGridBtn = document.getElementById('modeDragGrid');
  const modeDragImageBtn = document.getElementById('modeDragImage');
  const resetAlignBtn = document.getElementById('resetAlign');
  const calcAccuracyBtn = document.getElementById('calcAccuracyBtn');
  const accuracyEl = document.getElementById('accuracy');
  const totalFalseEl = document.getElementById('totalFalse');
  const userSelectedCountEl = document.getElementById('userSelectedCount');
  const correctCountEl = document.getElementById('correctCount');
  const accuracyValueEl = document.getElementById('accuracyValue');

  let rows = 4, cols = 5;
  let userSelectedA = new Set();
  let userSelectedB = new Set();
  let groundTruthFalseA = [];
  let groundTruthFalseB = [];
  let highlightCell = { row: 0, col: 0 };
  let gridOffsetX = 0, gridOffsetY = 0;
  let imageOffsetX = 0, imageOffsetY = 0;
  let imageOffsetBX = 0, imageOffsetBY = 0;
  let mode = 'dragGrid';
  let dragTarget = null;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragStartGridX = 0, dragStartGridY = 0;
  let dragStartImageX = 0, dragStartImageY = 0;
  let ctx = overlay.getContext('2d');
  let ctxB = overlayB.getContext('2d');

  function getImageRect(wrap, img, offsetX, offsetY) {
    const naturalW = img.naturalWidth || 1;
    const naturalH = img.naturalHeight || 1;
    let maxW = wrap.width;
    let maxH = wrap.height;
    if (maxW <= 0) maxW = naturalW;
    if (maxH <= 0) maxH = naturalH;
    let w = naturalW, h = naturalH;
    if (w > maxW || h > maxH) {
      const r = Math.min(maxW / w, maxH / h);
      w = w * r;
      h = h * r;
    }
    const baseX = (wrap.width - w) / 2;
    const baseY = (wrap.height - h) / 2;
    return {
      x: baseX + offsetX,
      y: baseY + offsetY,
      width: w,
      height: h
    };
  }

  function getImageRectA() {
    return getImageRect(canvasWrap, imageEl, imageOffsetX, imageOffsetY);
  }

  function getImageRectB() {
    return getImageRect(canvasWrapB, imageElB, imageOffsetBX, imageOffsetBY);
  }

  function getDisplaySize() {
    if (imageEl.src && imageEl.complete) {
      const r = getImageRectA();
      return { width: r.width, height: r.height };
    }
    if (imageElB.src && imageElB.complete) {
      const r = getImageRectB();
      return { width: r.width, height: r.height };
    }
    return { width: 1, height: 1 };
  }

  function getCellSize() {
    const { width, height } = getDisplaySize();
    const cw = parseInt(cellWidthInput.value, 10);
    const ch = parseInt(cellHeightInput.value, 10);
    const w = cw > 0 ? cw : width / cols;
    const h = ch > 0 ? ch : height / rows;
    return { w, h };
  }

  function getCellFromPoint(px, py) {
    const { width, height } = getDisplaySize();
    const { w: cellW, h: cellH } = getCellSize();
    const qx = px - gridOffsetX;
    const qy = py - gridOffsetY;
    if (qx < 0 || qy < 0 || qx >= width || qy >= height) return null;
    const col = Math.floor(qx / cellW);
    const row = Math.floor(qy / cellH);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
    return { row, col };
  }

  function getGridSizePx() {
    const { w, h } = getCellSize();
    return { width: cols * w, height: rows * h };
  }

  function getCellRect(row, col) {
    const { w: cellW, h: cellH } = getCellSize();
    return {
      x: gridOffsetX + col * cellW,
      y: gridOffsetY + row * cellH,
      w: cellW,
      h: cellH
    };
  }

  function syncOverlaySize() {
    const hasA = imageEl.src && imageEl.complete;
    const hasB = imageElB.src && imageElB.complete;
    if (hasA) {
      const rect = getImageRectA();
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.left = rect.x + 'px';
      overlay.style.top = rect.y + 'px';
      overlay.width = rect.width;
      overlay.height = rect.height;
      imageEl.style.position = 'absolute';
      imageEl.style.left = rect.x + 'px';
      imageEl.style.top = rect.y + 'px';
      imageEl.style.width = rect.width + 'px';
      imageEl.style.height = rect.height + 'px';
    }
    if (hasB) {
      const rectB = getImageRectB();
      overlayB.style.width = rectB.width + 'px';
      overlayB.style.height = rectB.height + 'px';
      overlayB.style.left = rectB.x + 'px';
      overlayB.style.top = rectB.y + 'px';
      overlayB.width = rectB.width;
      overlayB.height = rectB.height;
      imageElB.style.position = 'absolute';
      imageElB.style.left = rectB.x + 'px';
      imageElB.style.top = rectB.y + 'px';
      imageElB.style.width = rectB.width + 'px';
      imageElB.style.height = rectB.height + 'px';
    }
    redrawOverlay();
  }

  function drawOverlayToCanvas(canvas, context, selectedSet, groundTruthSet) {
    if (canvas.width <= 0 || canvas.height <= 0) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const { w: cellW, h: cellH } = getCellSize();

    if (highlightCell.row >= 0 && highlightCell.row < rows && highlightCell.col >= 0 && highlightCell.col < cols) {
      const hCell = getCellRect(highlightCell.row, highlightCell.col);
      context.fillStyle = 'rgba(123, 162, 247, 0.35)';
      context.fillRect(hCell.x, hCell.y, hCell.w, hCell.h);
    }

    context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    context.lineWidth = 1;
    context.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = gridOffsetX + c * cellW;
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
    }
    for (let r = 0; r <= rows; r++) {
      const y = gridOffsetY + r * cellH;
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
    }
    context.stroke();

    context.font = '11px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#3b82f6';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = getCellRect(r, c);
        const cx = cell.x + cell.w / 2;
        const cy = cell.y + cell.h / 2;
        context.fillText(`${r},${c}`, cx, cy);
      }
    }
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.font = '12px sans-serif';

    selectedSet.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const cell = getCellRect(r, c);
      context.strokeStyle = '#f7768e';
      context.lineWidth = 3;
      context.strokeRect(cell.x, cell.y, cell.w, cell.h);
    });

    if (groundTruthSet && groundTruthSet.length > 0) {
      groundTruthSet.forEach(([r, c]) => {
        const cell = getCellRect(r, c);
        context.fillStyle = 'rgba(158, 206, 106, 0.5)';
        context.fillRect(cell.x, cell.y, cell.w, cell.h);
      });
    }
  }

  function redrawOverlay() {
    const hasA = imageEl.src && imageEl.complete;
    const hasB = imageElB.src && imageElB.complete;
    if (hasA) {
      const rect = getImageRectA();
      if (overlay.width !== rect.width || overlay.height !== rect.height) {
        overlay.width = rect.width;
        overlay.height = rect.height;
      }
      drawOverlayToCanvas(overlay, ctx, userSelectedA, groundTruthFalseA);
    }
    if (hasB) {
      const rectB = getImageRectB();
      if (overlayB.width !== rectB.width || overlayB.height !== rectB.height) {
        overlayB.width = rectB.width;
        overlayB.height = rectB.height;
      }
      drawOverlayToCanvas(overlayB, ctxB, userSelectedB, groundTruthFalseB);
    }
  }

  function getLabelMatrixText(selectedSet) {
    const lines = [];
    for (let r = 0; r < rows; r++) {
      const vals = [];
      for (let c = 0; c < cols; c++) {
        vals.push(selectedSet.has(`${r},${c}`) ? '0' : '1');
      }
      lines.push(vals.join(' '));
    }
    return lines.join('\n');
  }

  function parseGroundTruthFromText(raw) {
    const list = [];
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines.forEach((line, row) => {
      const parts = line.split(/[\s,]+/).filter(Boolean);
      parts.forEach((val, col) => {
        const v = val.toLowerCase();
        if (v === '0' || v === 'false' || v === 'f') list.push([row, col]);
      });
    });
    return list;
  }
  function computeFalseAccuracy() {
    const totalA = groundTruthFalseA && groundTruthFalseA.length > 0 ? groundTruthFalseA.length : 0;
    const totalB = groundTruthFalseB && groundTruthFalseB.length > 0 ? groundTruthFalseB.length : 0;
    const totalFalse = totalA + totalB;
    if (totalFalse === 0) return null;
    let correctFalse = 0;
    if (groundTruthFalseA) {
      groundTruthFalseA.forEach(([r, c]) => {
        if (userSelectedA.has(`${r},${c}`)) correctFalse += 1;
      });
    }
    if (groundTruthFalseB) {
      groundTruthFalseB.forEach(([r, c]) => {
        if (userSelectedB.has(`${r},${c}`)) correctFalse += 1;
      });
    }
    return { correct: correctFalse, total: totalFalse, accuracy: correctFalse / totalFalse };
  }

  function renderCellList() {
    const entriesA = Array.from(userSelectedA).map(k => ({ key: k, src: 'A' }));
    const entriesB = Array.from(userSelectedB).map(k => ({ key: k, src: 'B' }));
    const entries = [...entriesA, ...entriesB].sort((a, b) => {
      const [r1, c1] = a.key.split(',').map(Number);
      const [r2, c2] = b.key.split(',').map(Number);
      return r1 !== r2 ? r1 - r2 : c1 - c2;
    });
    cellList.innerHTML = '';
    entries.forEach(({ key, src }) => {
      const [r, c] = key.split(',').map(Number);
      const li = document.createElement('li');
      li.innerHTML = `<span>(${r}, ${c}) <small>${src}</small></span> <button type="button" class="remove-cell" aria-label="取消">×</button>`;
      li.querySelector('.remove-cell').addEventListener('click', function (e) {
        e.stopPropagation();
        userSelectedA.delete(key);
        userSelectedB.delete(key);
        renderCellList();
        redrawOverlay();
        updateAccuracyDisplay();
      });
      cellList.appendChild(li);
    });
  }

  function updateAccuracyDisplay() {
    const userCount = userSelectedA.size + userSelectedB.size;
    if (userSelectedCountEl) userSelectedCountEl.textContent = userCount;
    const result = computeFalseAccuracy();
    if (totalFalseEl) {
      totalFalseEl.textContent = result ? result.total : '--';
    }
    if (correctCountEl) {
      correctCountEl.textContent = result ? result.correct : '--';
    }
    if (accuracyValueEl) {
      accuracyValueEl.textContent = result ? (result.accuracy * 100).toFixed(2) + '%' : '--';
    }
  }

  function advanceHighlight() {
    highlightCell.col += 1;
    if (highlightCell.col >= cols) {
      highlightCell.col = 0;
      highlightCell.row += 1;
    }
    if (highlightCell.row >= rows) {
      highlightCell.row = 0;
    }
  }

  function setMode(m) {
    mode = m;
    modeDragGridBtn.classList.toggle('active', m === 'dragGrid');
    modeDragImageBtn.classList.toggle('active', m === 'dragImage');
    modeSelectBtn.classList.toggle('active', m === 'select');
    canvasWrap.classList.toggle('align-drag', m === 'dragGrid' || m === 'dragImage');
    canvasWrapB.classList.toggle('align-drag', m === 'dragGrid' || m === 'dragImage');
  }

  function getOverlayCoords(clientX, clientY, targetOverlay) {
    const ov = targetOverlay || overlay;
    const rect = ov.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  refImageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    refImageEl.onload = function () {
      URL.revokeObjectURL(url);
      refImageEl.classList.remove('hidden');
      refPlaceholder.classList.add('hidden');
    };
    refImageEl.src = url;
  });

  function onMarkerImageLoaded() {
    rows = parseInt(rowsInput.value, 10) || 4;
    cols = parseInt(colsInput.value, 10) || 5;
    userSelectedA.clear();
    userSelectedB.clear();
    highlightCell = { row: 0, col: 0 };
    gridOffsetX = 0;
    gridOffsetY = 0;
    imageOffsetX = 0;
    imageOffsetY = 0;
    imageOffsetBX = 0;
    imageOffsetBY = 0;
    renderCellList();
    syncOverlaySize();
    updateAccuracyDisplay();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        syncOverlaySize();
      });
    });
  }

  imageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    imageEl.onload = function () {
      URL.revokeObjectURL(url);
      imageEl.classList.remove('hidden');
      placeholder.classList.add('hidden');
      canvasWrap.classList.add('has-image');
      onMarkerImageLoaded();
    };
    imageEl.src = url;
  });

  imageInputB.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    imageElB.onload = function () {
      URL.revokeObjectURL(url);
      imageElB.classList.remove('hidden');
      placeholderB.classList.add('hidden');
      canvasWrapB.classList.add('has-image');
      if (!imageEl.src || !imageEl.complete) {
        onMarkerImageLoaded();
      } else {
        syncOverlaySize();
      }
    };
    imageElB.src = url;
  });

  function hasAnyMarkerImage() {
    return (imageEl.src && imageEl.complete) || (imageElB.src && imageElB.complete);
  }

  rowsInput.addEventListener('change', function () {
    rows = parseInt(rowsInput.value, 10) || 4;
    highlightCell = { row: 0, col: 0 };
    if (hasAnyMarkerImage()) syncOverlaySize();
  });
  colsInput.addEventListener('change', function () {
    cols = parseInt(colsInput.value, 10) || 5;
    highlightCell = { row: 0, col: 0 };
    if (hasAnyMarkerImage()) syncOverlaySize();
  });

  cellWidthInput.addEventListener('input', function () {
    if (hasAnyMarkerImage()) redrawOverlay();
  });
  cellWidthInput.addEventListener('change', function () {
    if (hasAnyMarkerImage()) redrawOverlay();
  });
  cellHeightInput.addEventListener('input', function () {
    if (hasAnyMarkerImage()) redrawOverlay();
  });
  cellHeightInput.addEventListener('change', function () {
    if (hasAnyMarkerImage()) redrawOverlay();
  });

  window.addEventListener('resize', function () {
    if (hasAnyMarkerImage()) syncOverlaySize();
  });

  function onOverlayMouseDown(e, targetOverlay, targetId) {
    const hasA = imageEl.src && imageEl.complete;
    const hasB = imageElB.src && imageElB.complete;
    if (!hasA && !hasB) return;
    if (targetId === 'A' && !hasA) return;
    if (targetId === 'B' && !hasB) return;
    const pos = getOverlayCoords(e.clientX, e.clientY, targetOverlay);
    if (mode === 'dragGrid') {
      isDragging = true;
      canvasWrap.classList.add('dragging');
      canvasWrapB.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartGridX = gridOffsetX;
      dragStartGridY = gridOffsetY;
      return;
    }
    if (mode === 'dragImage') {
      isDragging = true;
      dragTarget = targetId;
      canvasWrap.classList.add('dragging');
      canvasWrapB.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartImageX = targetId === 'A' ? imageOffsetX : imageOffsetBX;
      dragStartImageY = targetId === 'A' ? imageOffsetY : imageOffsetBY;
      return;
    }
    const cell = getCellFromPoint(pos.x, pos.y);
    if (!cell) return;
    const key = `${cell.row},${cell.col}`;
    if (targetId === 'A') {
      userSelectedB.delete(key);
      if (userSelectedA.has(key)) userSelectedA.delete(key);
      else userSelectedA.add(key);
    } else {
      userSelectedA.delete(key);
      if (userSelectedB.has(key)) userSelectedB.delete(key);
      else userSelectedB.add(key);
    }
    advanceHighlight();
    renderCellList();
    redrawOverlay();
    updateAccuracyDisplay();
  }

  overlay.addEventListener('mousedown', function (e) {
    onOverlayMouseDown(e, overlay, 'A');
  });
  overlayB.addEventListener('mousedown', function (e) {
    onOverlayMouseDown(e, overlayB, 'B');
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    if (mode === 'dragGrid') {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      gridOffsetX = dragStartGridX + dx;
      gridOffsetY = dragStartGridY + dy;
      redrawOverlay();
    } else if (mode === 'dragImage' && dragTarget) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (dragTarget === 'A') {
        imageOffsetX = dragStartImageX + dx;
        imageOffsetY = dragStartImageY + dy;
      } else {
        imageOffsetBX = dragStartImageX + dx;
        imageOffsetBY = dragStartImageY + dy;
      }
      syncOverlaySize();
    }
  });

  window.addEventListener('mouseup', function () {
    if (isDragging) canvasWrap.classList.remove('dragging');
    isDragging = false;
  });

  modeDragGridBtn.addEventListener('click', function () { setMode('dragGrid'); });
  modeDragImageBtn.addEventListener('click', function () { setMode('dragImage'); });
  modeSelectBtn.addEventListener('click', function () { setMode('select'); });
  setMode('dragGrid');

  resetAlignBtn.addEventListener('click', function () {
    gridOffsetX = 0;
    gridOffsetY = 0;
    imageOffsetX = 0;
    imageOffsetY = 0;
    imageOffsetBX = 0;
    imageOffsetBY = 0;
    if (imageEl.src && imageEl.complete || imageElB.src && imageElB.complete) syncOverlaySize();
    else redrawOverlay();
  });

  groundTruthFileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    groundTruthFileName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const raw = (ev.target && ev.target.result) || '';
      groundTruthFalseA = parseGroundTruthFromText(raw);
      const allCells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          allCells.push([r, c]);
        }
      }
      const aSet = new Set(groundTruthFalseA.map(([r, c]) => `${r},${c}`));
      groundTruthFalseB = allCells.filter(([r, c]) => !aSet.has(`${r},${c}`));
      redrawOverlay();
      updateAccuracyDisplay();
    };
    reader.readAsText(file, 'UTF-8');
  });

  function saveAnnotatedImage(imgEl, ov, suffix) {
    if (!imgEl.src || !imgEl.complete) return;
    const w = ov.width;
    const h = ov.height;
    if (w <= 0 || h <= 0) return;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const outCtx = out.getContext('2d');
    outCtx.drawImage(imgEl, 0, 0, imgEl.naturalWidth, imgEl.naturalHeight, 0, 0, w, h);
    outCtx.drawImage(ov, 0, 0);
    const link = document.createElement('a');
    link.download = 'annotated-' + suffix + '-' + Date.now() + '.png';
    link.href = out.toDataURL('image/png');
    link.click();
  }

  saveBtn.addEventListener('click', function () {
    saveAnnotatedImage(imageEl, overlay, 'A');
  });
  saveBtnB.addEventListener('click', function () {
    saveAnnotatedImage(imageElB, overlayB, 'B');
  });

  saveLabelBtn.addEventListener('click', function () {
    const txtA = getLabelMatrixText(userSelectedA);
    const txtB = getLabelMatrixText(userSelectedB);
    const blobA = new Blob([txtA], { type: 'text/plain;charset=utf-8' });
    const blobB = new Blob([txtB], { type: 'text/plain;charset=utf-8' });
    const ts = Date.now();
    const urlA = URL.createObjectURL(blobA);
    const urlB = URL.createObjectURL(blobB);
    const linkA = document.createElement('a');
    linkA.download = 'labels-A-' + ts + '.txt';
    linkA.href = urlA;
    linkA.click();
    const linkB = document.createElement('a');
    linkB.download = 'labels-B-' + ts + '.txt';
    linkB.href = urlB;
    linkB.click();
    URL.revokeObjectURL(urlA);
    URL.revokeObjectURL(urlB);
  });

  clearAllBtn.addEventListener('click', function () {
    userSelectedA.clear();
    userSelectedB.clear();
    highlightCell = { row: 0, col: 0 };
    renderCellList();
    redrawOverlay();
    updateAccuracyDisplay();
  });

  if (similarBtn) {
    similarBtn.addEventListener('click', function () {
      advanceHighlight();
      redrawOverlay();
    });
  }

  if (calcAccuracyBtn) {
    calcAccuracyBtn.addEventListener('click', function () {
      if (!groundTruthFalseA || groundTruthFalseA.length === 0) {
        alert('请先加载 A 图标签(txt)');
        return;
      }
      updateAccuracyDisplay();
    });
  }

  updateAccuracyDisplay();
})();
