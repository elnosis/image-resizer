(() => {
  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadSection = document.getElementById('upload-section');
  const controlsSection = document.getElementById('controls-section');
  const previewSection = document.getElementById('preview-section');

  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');
  const percentInput = document.getElementById('percent-input');
  const percentRange = document.getElementById('percent-range');
  const keepRatio = document.getElementById('keep-ratio');
  const qualityRange = document.getElementById('quality-range');
  const qualityValue = document.getElementById('quality-value');
  const qualityRow = document.getElementById('quality-row');
  const formatSelect = document.getElementById('format-select');

  const resizeBtn = document.getElementById('resize-btn');
  const resetBtn = document.getElementById('reset-btn');
  const downloadBtn = document.getElementById('download-btn');
  const newImageBtn = document.getElementById('new-image-btn');

  const previewImg = document.getElementById('preview-img');
  const originalInfo = document.getElementById('original-info');
  const newInfo = document.getElementById('new-info');

  const tabs = document.querySelectorAll('.tab');
  const dimensionMode = document.getElementById('dimension-mode');
  const percentMode = document.getElementById('percent-mode');

  // State
  let originalImage = null; // Image object
  let originalFile = null;
  let originalWidth = 0;
  let originalHeight = 0;
  let currentBlob = null;
  let originalMime = 'image/jpeg';  // 원본 파일 형식
  let outputMime = 'image/jpeg';   // 실제 출력에 사용할 형식
  let isUpdating = false; // prevent feedback loops on inputs

  // ---- File Handling ----
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    originalFile = file;
    // 원본 MIME 결정
    if (file.type === 'image/png') originalMime = 'image/png';
    else if (file.type === 'image/webp') originalMime = 'image/webp';
    else if (file.type === 'image/gif') originalMime = 'image/gif';
    else originalMime = 'image/jpeg';

    // 기본 출력은 원본 유지
    formatSelect.value = 'original';
    updateOutputMime();
    updateQualityVisibility();

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        originalWidth = img.naturalWidth;
        originalHeight = img.naturalHeight;

        // Reset controls
        widthInput.value = originalWidth;
        heightInput.value = originalHeight;
        percentInput.value = 50;
        percentRange.value = 50;

        // Show UI
        uploadSection.classList.add('hidden');
        controlsSection.classList.remove('hidden');
        previewSection.classList.remove('hidden');

        // Initial preview (original)
        showOriginalPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateOutputMime() {
    const selected = formatSelect.value;
    if (selected === 'original') {
      // GIF는 Canvas에서 애니메이션을 유지할 수 없으므로 PNG로 변환
      outputMime = (originalMime === 'image/gif') ? 'image/png' : originalMime;
    } else {
      outputMime = selected;
    }
  }

  function updateQualityVisibility() {
    // JPEG 또는 WebP일 때만 품질 조절 표시
    const needsQuality = outputMime === 'image/jpeg' || outputMime === 'image/webp';
    qualityRow.style.display = needsQuality ? 'block' : 'none';
  }

  formatSelect.addEventListener('change', () => {
    updateOutputMime();
    updateQualityVisibility();
  });

  function showOriginalPreview() {
    previewImg.src = originalImage.src;
    originalInfo.textContent = `원본: ${originalWidth} × ${originalHeight} px · ${formatSize(originalFile.size)}`;
    newInfo.textContent = `현재: 원본 그대로`;
    currentBlob = null;
  }

  // ---- Mode Tabs ----
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      if (mode === 'dimension') {
        dimensionMode.classList.remove('hidden');
        percentMode.classList.add('hidden');
      } else {
        dimensionMode.classList.add('hidden');
        percentMode.classList.remove('hidden');
      }
    });
  });

  // ---- Dimension inputs with ratio lock ----
  widthInput.addEventListener('input', () => {
    if (isUpdating || !keepRatio.checked || !originalWidth) return;
    isUpdating = true;
    const w = parseInt(widthInput.value, 10);
    if (w > 0) {
      heightInput.value = Math.round(w * (originalHeight / originalWidth));
    }
    isUpdating = false;
  });

  heightInput.addEventListener('input', () => {
    if (isUpdating || !keepRatio.checked || !originalHeight) return;
    isUpdating = true;
    const h = parseInt(heightInput.value, 10);
    if (h > 0) {
      widthInput.value = Math.round(h * (originalWidth / originalHeight));
    }
    isUpdating = false;
  });

  // When unlocking ratio, don't force anything
  keepRatio.addEventListener('change', () => {
    // just leave values as-is
  });

  // Percent sync
  percentInput.addEventListener('input', () => {
    percentRange.value = percentInput.value;
  });
  percentRange.addEventListener('input', () => {
    percentInput.value = percentRange.value;
  });

  qualityRange.addEventListener('input', () => {
    qualityValue.textContent = qualityRange.value;
  });

  // ---- Resize ----
  resizeBtn.addEventListener('click', () => {
    if (!originalImage) return;

    let targetW, targetH;

    const activeMode = document.querySelector('.tab.active').dataset.mode;

    if (activeMode === 'percent') {
      const pct = parseFloat(percentInput.value) / 100;
      if (!(pct > 0)) {
        alert('올바른 비율을 입력해주세요.');
        return;
      }
      targetW = Math.round(originalWidth * pct);
      targetH = Math.round(originalHeight * pct);
    } else {
      targetW = parseInt(widthInput.value, 10);
      targetH = parseInt(heightInput.value, 10);

      if (!targetW && !targetH) {
        alert('너비 또는 높이를 입력해주세요.');
        return;
      }

      if (keepRatio.checked) {
        if (targetW && !targetH) {
          targetH = Math.round(targetW * (originalHeight / originalWidth));
        } else if (targetH && !targetW) {
          targetW = Math.round(targetH * (originalWidth / originalHeight));
        } else if (targetW && targetH) {
          // both provided + keep ratio → prioritize width
          targetH = Math.round(targetW * (originalHeight / originalWidth));
        }
      }

      if (!targetW || !targetH || targetW < 1 || targetH < 1) {
        alert('올바른 크기를 입력해주세요.');
        return;
      }
    }

    // Cap at reasonable size
    if (targetW > 10000 || targetH > 10000) {
      alert('최대 10000px까지 지원합니다.');
      return;
    }

    resizeImage(targetW, targetH);
  });

  function resizeImage(w, h) {
    return new Promise((resolve, reject) => {
      updateOutputMime(); // 최신 포맷 반영

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // JPEG로 변환할 때 투명 배경이 검정으로 나오는 것을 방지
      if (outputMime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }

      // High quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(originalImage, 0, 0, w, h);

      const needsQuality = outputMime === 'image/jpeg' || outputMime === 'image/webp';
      const quality = needsQuality ? (qualityRange.value / 100) : undefined;

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다. 다른 포맷을 시도해보세요.');
          reject(new Error('toBlob failed'));
          return;
        }
        currentBlob = blob;
        const url = URL.createObjectURL(blob);
        previewImg.src = url;

        const formatLabel = getFormatLabel(outputMime);
        originalInfo.textContent = `원본: ${originalWidth} × ${originalHeight} px · ${formatSize(originalFile.size)}`;
        newInfo.textContent = `변경 후: ${w} × ${h} px · ${formatSize(blob.size)} · ${formatLabel}`;
        resolve(blob);
      }, outputMime, quality);
    });
  }

  // ---- Reset ----
  resetBtn.addEventListener('click', () => {
    if (!originalImage) return;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
    percentInput.value = 100;
    percentRange.value = 100;
    showOriginalPreview();
  });

  // ---- Download ----
  downloadBtn.addEventListener('click', async () => {
    if (!originalImage) return;

    // 아직 리사이즈하지 않았거나 포맷만 바꾸고 싶을 때 → 원본 크기로 변환
    if (!currentBlob) {
      try {
        await resizeImage(originalWidth, originalHeight);
      } catch (e) {
        return;
      }
    }

    const w = previewImg.naturalWidth || parseInt(widthInput.value) || originalWidth;
    const h = previewImg.naturalHeight || parseInt(heightInput.value) || originalHeight;
    triggerDownload(currentBlob, w, h);
  });

  function triggerDownload(blob, w, h) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = getDownloadName(originalFile.name, w, h);
    a.click();
  }

  function getDownloadName(originalName, w, h) {
    const base = originalName.replace(/\.[^.]+$/, '');
    const ext = outputMime === 'image/png' ? 'png' :
                outputMime === 'image/webp' ? 'webp' : 'jpg';
    return `${base}_${w}x${h}.${ext}`;
  }

  function getFormatLabel(mime) {
    if (mime === 'image/png') return 'PNG';
    if (mime === 'image/webp') return 'WebP';
    if (mime === 'image/jpeg') return 'JPEG';
    return mime;
  }

  // ---- New Image ----
  newImageBtn.addEventListener('click', () => {
    // Reset everything
    originalImage = null;
    originalFile = null;
    currentBlob = null;
    fileInput.value = '';
    uploadSection.classList.remove('hidden');
    controlsSection.classList.add('hidden');
    previewSection.classList.add('hidden');
    previewImg.src = '';
  });

  // ---- Helpers ----
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ---- Service Worker Registration ----
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
})();
