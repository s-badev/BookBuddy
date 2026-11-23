// Library shelf dimensions and palette are independent of the DOM.
const ShelfLayout = (() => {
    const colors = [
        '#7d8a99', '#233a63', '#a45c2f', '#b8b1a0', '#7a2a2a', '#3b2a22',
        '#4a1f3a', '#3d1f2b', '#1f3a2e', '#8b6a2b', '#0f4c5c', '#2d4a3a',
        '#6b1d22', '#e8e4da', '#2a2a33'
    ];
    const kinds = ['cloth', 'label', 'paper'];

    function luminance(hex) {
        const channels = hex.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16) / 255);
        const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }

    function contrastRatio(first, second) {
        const a = luminance(first) + 0.05;
        const b = luminance(second) + 0.05;
        return Math.max(a, b) / Math.min(a, b);
    }

    const palette = Object.freeze(colors.map(spine => {
        const light = '#ffffff';
        const dark = '#000000';
        const ink = contrastRatio(spine, dark) > contrastRatio(spine, light) ? dark : light;
        return Object.freeze({ spine, ink });
    }));

    function hashString(str) {
        let hash = 2166136261;
        for (const character of str) {
            hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
        }
        hash ^= hash >>> 16;
        return hash >>> 0;
    }

    function bookLook(book) {
        const key = (book.title + '\0' + book.author).normalize('NFC');
        const hash = hashString(key);
        const pages = Math.max(0, Number(book.totalPages) || 0);
        const thickness = Math.round(22 + Math.min(42, pages * 0.042));
        const height = 205 + ((hash >>> 8) % 62);
        const tilt = (hash >>> 23) % 12;
        return {
            palette: palette[hash % palette.length],
            kind: kinds[(hash >>> 4) % kinds.length],
            thickness, height, coverWidth: Math.round(height * 2 / 3),
            lean: tilt === 0 ? -1.5 : tilt === 1 ? 2 : 0
        };
    }

    function fitTitle(title, availablePx, baseFont, minFont, measure) {
        let fontSize = baseFont;
        while (fontSize > minFont && measure(title, fontSize) > availablePx) {
            fontSize = Math.max(minFont, fontSize - 0.5);
        }
        if (measure(title, fontSize) <= availablePx) return { text: title, fontSize };
        if (measure('…', fontSize) > availablePx) return { text: '', fontSize };

        const characters = [...title];
        let low = 0;
        let high = characters.length;
        while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            const candidate = characters.slice(0, middle).join('') + '…';
            if (measure(candidate, fontSize) <= availablePx) low = middle;
            else high = middle - 1;
        }
        return { text: characters.slice(0, low).join('').trimEnd() + '…', fontSize };
    }

    function layoutShelves(books, containerWidth, { faceOut = 0, stack = 0 } = {}) {
        const width = Math.max(1, containerWidth);
        const newRow = () => ({ books: [], faceOut: false, stack: false });
        const rows = [newRow()];
        let row = rows[0];
        let used = Math.max(0, faceOut);
        row.faceOut = used > 0;
        function place(nextWidth) {
            if (used > 0 && used + nextWidth > width) {
                row = newRow();
                rows.push(row);
                used = 0;
            }
            used += nextWidth;
        }
        for (const book of books) {
            place(bookLook(book).thickness + 1);
            row.books.push(book);
        }
        if (stack > 0) {
            place(stack);
            row.stack = true;
        }
        return rows;
    }

    return Object.freeze({ hashString, bookLook, fitTitle, layoutShelves, palette, contrastRatio });
})();
