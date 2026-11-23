// Cover upload and client-side image downscaling (classic script, global CoverUpload).
// Photos are decoded, resized to at most 360x540 preserving aspect ratio, drawn onto
// a canvas (which strips EXIF/GPS metadata), and encoded as a JPEG data URL <= 120 KB.
const CoverUpload = (() => {
    const DATA_URL_PREFIX = 'data:image/jpeg;base64,';
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
    const MAX_OUTPUT_BYTES = 120 * 1024;      // 120 KB
    const MAX_VALID_BYTES = 200 * 1024;       // 200 KB
    const MAX_WIDTH = 360;
    const MAX_HEIGHT = 540;
    const INITIAL_QUALITY = 0.82;
    const MIN_QUALITY = 0.5;
    const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5];
    const SIZE_STEPS = [0.85, 0.72, 0.6, 0.5, 0.4, 0.3];
    const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    const ERRORS = {
        NOT_IMAGE: 'Файлът не е изображение.',
        TOO_LARGE: 'Снимката е твърде голяма (над 10 MB).',
        PROCESS_FAILED: 'Не успях да обработя снимката. Опитай с друга.',
        QUOTA_EXCEEDED: 'Няма място в браузъра за корицата. Книгата е запазена без нея.'
    };

    function base64ByteLength(base64) {
        if (typeof base64 !== 'string' || base64.length === 0 || base64.length % 4 !== 0) {
            return -1;
        }
        if (!BASE64_RE.test(base64)) {
            return -1;
        }
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        return (base64.length * 3) / 4 - padding;
    }

    function isValidCoverDataUrl(str) {
        if (typeof str !== 'string' || !str.startsWith(DATA_URL_PREFIX)) {
            return false;
        }
        const payload = str.slice(DATA_URL_PREFIX.length);
        const bytes = base64ByteLength(payload);
        return bytes > 0 && bytes <= MAX_VALID_BYTES;
    }

    function fitDimensions(width, height, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT) {
        const w = Number(width);
        const h = Number(height);
        const mw = Number(maxWidth) || MAX_WIDTH;
        const mh = Number(maxHeight) || MAX_HEIGHT;
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
            throw new Error(ERRORS.PROCESS_FAILED);
        }
        const scale = Math.min(1, mw / w, mh / h);
        return {
            width: Math.max(1, Math.round(w * scale)),
            height: Math.max(1, Math.round(h * scale))
        };
    }

    function validateInputFile(file) {
        if (!file || typeof file !== 'object') {
            throw new Error(ERRORS.NOT_IMAGE);
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(ERRORS.NOT_IMAGE);
        }
        if (typeof file.size === 'number' && file.size > MAX_INPUT_BYTES) {
            throw new Error(ERRORS.TOO_LARGE);
        }
        if (typeof file.size !== 'number' || file.size <= 0) {
            throw new Error(ERRORS.NOT_IMAGE);
        }
        return true;
    }

    function encodeWithinLimit(encodeAt, initialWidth, initialHeight, maxBytes = MAX_OUTPUT_BYTES) {
        for (const quality of QUALITY_STEPS) {
            const dataUrl = encodeAt(initialWidth, initialHeight, quality);
            if (typeof dataUrl === 'string' && dataUrl.startsWith(DATA_URL_PREFIX)) {
                const bytes = base64ByteLength(dataUrl.slice(DATA_URL_PREFIX.length));
                if (bytes > 0 && bytes <= maxBytes) {
                    return { dataUrl, width: initialWidth, height: initialHeight, bytes, quality };
                }
            }
        }
        for (const factor of SIZE_STEPS) {
            const w = Math.max(1, Math.round(initialWidth * factor));
            const h = Math.max(1, Math.round(initialHeight * factor));
            const dataUrl = encodeAt(w, h, MIN_QUALITY);
            if (typeof dataUrl === 'string' && dataUrl.startsWith(DATA_URL_PREFIX)) {
                const bytes = base64ByteLength(dataUrl.slice(DATA_URL_PREFIX.length));
                if (bytes > 0 && bytes <= maxBytes) {
                    return { dataUrl, width: w, height: h, bytes, quality: MIN_QUALITY };
                }
            }
        }
        throw new Error(ERRORS.PROCESS_FAILED);
    }

    async function decodeViaImgElement(file) {
        if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
            throw new Error(ERRORS.PROCESS_FAILED);
        }
        const objectUrl = URL.createObjectURL(file);
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error(ERRORS.PROCESS_FAILED));
                el.src = objectUrl;
            });
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            if (!width || !height) throw new Error(ERRORS.PROCESS_FAILED);
            return {
                source: img,
                width,
                height,
                close() {
                    URL.revokeObjectURL(objectUrl);
                }
            };
        } catch (err) {
            URL.revokeObjectURL(objectUrl);
            throw new Error(ERRORS.PROCESS_FAILED);
        }
    }

    async function decodeImage(file) {
        if (typeof createImageBitmap === 'function') {
            try {
                const bitmap = await createImageBitmap(file);
                if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
                    return {
                        source: bitmap,
                        width: bitmap.width,
                        height: bitmap.height,
                        close() {
                            if (typeof bitmap.close === 'function') bitmap.close();
                        }
                    };
                }
                if (bitmap && typeof bitmap.close === 'function') bitmap.close();
            } catch (_) {
                // Fall back to HTMLImageElement decoding below.
            }
        }
        return decodeViaImgElement(file);
    }

    async function fileToCoverDataUrl(file) {
        validateInputFile(file);
        const decoded = await decodeImage(file);
        try {
            const { width, height } = fitDimensions(decoded.width, decoded.height, MAX_WIDTH, MAX_HEIGHT);
            if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
                throw new Error(ERRORS.PROCESS_FAILED);
            }
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error(ERRORS.PROCESS_FAILED);

            const result = encodeWithinLimit((w, h, quality) => {
                canvas.width = w;
                canvas.height = h;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(decoded.source, 0, 0, w, h);
                return canvas.toDataURL('image/jpeg', quality);
            }, width, height, MAX_OUTPUT_BYTES);

            if (!isValidCoverDataUrl(result.dataUrl)) {
                throw new Error(ERRORS.PROCESS_FAILED);
            }

            return {
                dataUrl: result.dataUrl,
                width: result.width,
                height: result.height,
                bytes: result.bytes
            };
        } catch (err) {
            if (err instanceof Error && Object.values(ERRORS).includes(err.message)) {
                throw err;
            }
            throw new Error(ERRORS.PROCESS_FAILED);
        } finally {
            decoded.close();
        }
    }

    // Form controller state so coverSearch.js and form.js coordinate cleanly.
    let formController = null;

    function initFormCoverUI() {
        const group = typeof document !== 'undefined' ? document.getElementById('coverUploadGroup') : null;
        if (!group) return null;

        const fileInput = document.getElementById('coverFileInput');
        const uploadBtn = document.getElementById('coverUploadBtn');
        const removeBtn = document.getElementById('removeCoverBtn');
        const legacyClearBtn = document.getElementById('clearSelectedCover');
        const previewWrap = document.getElementById('coverPreviewWrap');
        const previewImg = document.getElementById('coverPreviewImg');
        const previewMeta = document.getElementById('coverPreviewMeta');
        const errorEl = document.getElementById('coverUploadError');
        const coverUrlInput = document.getElementById('coverUrl');
        const coverSourceInput = document.getElementById('coverSource');
        const titleInput = document.getElementById('title');

        let uploaded = null; // { dataUrl, width?, height?, bytes? }
        let searched = null; // { url, source }

        function currentTitle() {
            return (titleInput?.value || '').trim();
        }

        function setError(message = '') {
            if (errorEl) errorEl.textContent = message;
        }

        function syncDOM() {
            const title = currentTitle();
            if (uploaded && isValidCoverDataUrl(uploaded.dataUrl)) {
                coverUrlInput.value = uploaded.dataUrl;
                if (coverSourceInput) coverSourceInput.value = 'upload';
                previewImg.src = uploaded.dataUrl;
                previewImg.alt = title
                    ? 'Преглед на качената корица за „' + title + '“'
                    : 'Преглед на качената корица';
                if (previewMeta) {
                    const kb = uploaded.bytes ? Math.max(1, Math.round(uploaded.bytes / 1024)) + ' KB' : '';
                    const dims = uploaded.width && uploaded.height ? uploaded.width + '×' + uploaded.height + ' px' : '';
                    previewMeta.textContent = ['Своя корица', dims, kb].filter(Boolean).join(' · ');
                }
                previewWrap.hidden = false;
                removeBtn.hidden = false;
                if (legacyClearBtn) legacyClearBtn.hidden = true;
                return;
            }

            if (searched && searched.url) {
                coverUrlInput.value = searched.url;
                if (coverSourceInput) coverSourceInput.value = searched.source || '';
                previewImg.src = searched.url;
                previewImg.alt = title
                    ? 'Преглед на избраната корица за „' + title + '“'
                    : 'Преглед на избраната корица';
                if (previewMeta) {
                    previewMeta.textContent = searched.source === 'google'
                        ? 'Избрана корица · Google Books'
                        : 'Избрана корица · Open Library';
                }
                previewWrap.hidden = false;
                removeBtn.hidden = false;
                if (legacyClearBtn) legacyClearBtn.hidden = true;
                return;
            }

            coverUrlInput.value = '';
            if (coverSourceInput) coverSourceInput.value = '';
            previewWrap.hidden = true;
            previewImg.removeAttribute('src');
            if (previewMeta) previewMeta.textContent = '';
            removeBtn.hidden = true;
            if (legacyClearBtn) legacyClearBtn.hidden = true;
        }

        // Hydrate initial state if form.js already populated coverUrl in edit mode
        function hydrateFromInputs() {
            const initialUrl = coverUrlInput?.value || '';
            const initialSource = coverSourceInput?.value || '';
            if (isValidCoverDataUrl(initialUrl)) {
                const bytes = base64ByteLength(initialUrl.slice(DATA_URL_PREFIX.length));
                uploaded = { dataUrl: initialUrl, bytes: bytes > 0 ? bytes : undefined };
                searched = null;
            } else if (typeof CoverService !== 'undefined' && CoverService.normalizeCoverUrl(initialUrl)) {
                const norm = CoverService.normalizeCoverUrl(initialUrl);
                const inferred = initialSource === 'google' || initialSource === 'openlibrary'
                    ? initialSource
                    : norm.includes('google') ? 'google' : 'openlibrary';
                searched = { url: norm, source: inferred };
                uploaded = null;
            } else {
                uploaded = null;
                searched = null;
            }
            syncDOM();
        }

        uploadBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            setError('');
            try {
                const result = await fileToCoverDataUrl(file);
                uploaded = result;
                syncDOM();
            } catch (err) {
                fileInput.value = '';
                setError(err instanceof Error ? err.message : ERRORS.PROCESS_FAILED);
            }
        });

        function clearAllCovers(focusButton = true) {
            uploaded = null;
            searched = null;
            if (fileInput) fileInput.value = '';
            setError('');
            syncDOM();
            if (focusButton) uploadBtn?.focus({ preventScroll: true });
        }

        removeBtn?.addEventListener('click', () => clearAllCovers(true));
        legacyClearBtn?.addEventListener('click', () => clearAllCovers(true));

        previewImg?.addEventListener('error', () => {
            if (!uploaded && searched) {
                searched = null;
                syncDOM();
            }
        });

        previewImg?.addEventListener('load', () => {
            if (uploaded && (!uploaded.width || !uploaded.height) && previewImg.naturalWidth > 0) {
                uploaded.width = previewImg.naturalWidth;
                uploaded.height = previewImg.naturalHeight;
                syncDOM();
            }
        });

        formController = {
            setSearchCover(url, source) {
                const normalized = typeof CoverService !== 'undefined' ? CoverService.normalizeCoverUrl(url) : null;
                searched = normalized ? {
                    url: normalized,
                    source: source === 'google' || source === 'openlibrary'
                        ? source
                        : normalized.includes('google') ? 'google' : 'openlibrary'
                } : null;
                setError('');
                // Uploaded cover keeps priority if the user already chose one.
                syncDOM();
            },
            clearSearchCover() {
                searched = null;
                syncDOM();
            },
            clearAll() {
                clearAllCovers(false);
            },
            hasUploadedCover() {
                return Boolean(uploaded && isValidCoverDataUrl(uploaded.dataUrl));
            },
            showError(message) {
                setError(message);
            },
            hydrateFromInputs
        };

        hydrateFromInputs();
        return formController;
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', initFormCoverUI);
    }

    return {
        DATA_URL_PREFIX,
        ALLOWED_TYPES,
        MAX_INPUT_BYTES,
        MAX_OUTPUT_BYTES,
        MAX_VALID_BYTES,
        MAX_WIDTH,
        MAX_HEIGHT,
        INITIAL_QUALITY,
        MIN_QUALITY,
        ERRORS,
        base64ByteLength,
        isValidCoverDataUrl,
        fitDimensions,
        validateInputFile,
        encodeWithinLimit,
        fileToCoverDataUrl,
        initFormCoverUI,
        getFormController() {
            return formController;
        }
    };
})();

if (typeof globalThis !== 'undefined') {
    globalThis.CoverUpload = CoverUpload;
}
