// CodeBlur Obfuscator
// Pure text transformation functions - no state, no DOM

const Obfuscator = {
    // ============================================
    // CORE UTILITIES
    // ============================================

    replaceWholeWord(text, search, replace) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), replace);
    },

    splitCamelCase(word) {
        const parts = [];
        let current = '';
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const nextChar = word[i + 1];
            if (char === '_') {
                if (current) parts.push(current);
                current = '';
            } else if (i > 0 && /[A-Z]/.test(char)) {
                if (/[a-z]/.test(word[i - 1]) || (nextChar && /[a-z]/.test(nextChar))) {
                    if (current) parts.push(current);
                    current = char;
                } else {
                    current += char;
                }
            } else {
                current += char;
            }
        }
        if (current) parts.push(current);
        return parts.length > 0 ? parts : [word];
    },

    // ============================================
    // BLUR LEVEL - Identifiers
    // ============================================

    obfuscateIdentifiers(text, state) {
        const pattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        const processed = new Set();
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const id = match[1];
            if (processed.has(id) || id.length < 2) continue;
            if (id === id.toUpperCase()) continue;
            if (state.patterns.fully.test(id)) continue;
            if (Dictionaries.isKnownWord(id)) continue;
            processed.add(id);

            const parts = this.splitCamelCase(id);
            const unknownParts = parts.filter(p => !Dictionaries.isKnownWord(p));

            if (unknownParts.length > 0) {
                const obfuscated = parts.map(p =>
                    Dictionaries.isKnownWord(p) ? p : this.getMapping(p, state)
                ).join('');
                if (obfuscated !== id) {
                    state.mappings[id] = obfuscated;
                    text = this.replaceWholeWord(text, id, obfuscated);
                }
            }
        }
        return text;
    },

    removeComments(text, state) {
        // Multi-line /* */
        text = text.replace(/\/\*([\s\S]*?)\*\//g, (_, c) => `/* ${this.getMapping(c, state, 'comment')} */`);
        // XML doc ///
        text = text.replace(/\/\/\/(.*)$/gm, (_, c) => `/// ${this.getMapping(c, state, 'comment')}`);
        // Single //
        text = text.replace(/\/\/(?!\/)(.*)$/gm, (_, c) => `// ${this.getMapping(c, state, 'comment')}`);
        // Python #
        text = text.replace(/(?<!['"])#(?!['"])(.*)$/gm, (m, c) => {
            if (m.match(/^#[0-9a-fA-F]{3,8}$/)) return m;
            return `# ${this.getMapping(c, state, 'comment')}`;
        });
        // SQL --
        text = text.replace(/--(.*)$/gm, (_, c) => `-- ${this.getMapping(c, state, 'comment')}`);
        return text;
    },

    removeEmptyLines(text) {
        return text.replace(/^\s*[\r\n]/gm, '').replace(/\n{3,}/g, '\n\n');
    },

    // ============================================
    // ANON LEVEL - Strings, GUIDs, Paths, Numbers
    // ============================================

    obfuscateGuids(text, state) {
        const guidPattern = /\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?/g;
        text = text.replace(guidPattern, m => this.getMapping(m, state, 'guid'));

        const hexPattern = /\b[0-9a-fA-F]{32}\b/g;
        text = text.replace(hexPattern, m => m.startsWith('0x') ? m : this.getMapping(m, state, 'guid'));
        return text;
    },

    obfuscatePaths(text, state) {
        // URLs
        text = text.replace(/(https?|ftp|file|ws|wss):\/\/[^\s"'<>]+/g, m => this.getMapping(m, state, 'path'));
        // Windows paths
        text = text.replace(/[A-Za-z]:\\[^\s"'<>:*?|]+/g, m => this.getMapping(m, state, 'path'));
        // UNC paths
        text = text.replace(/\\\\[^\s"'<>:*?|]+/g, m => this.getMapping(m, state, 'path'));
        // Unix paths
        text = text.replace(/(?<=['"`])\/[a-zA-Z][^\s"'<>]*(?=['"`])/g, m => this.getMapping(m, state, 'path'));
        // Relative paths
        text = text.replace(/(?<=['"`])\.\.?\/[^\s"'<>]+(?=['"`])/g, m => this.getMapping(m, state, 'path'));
        return text;
    },

    obfuscateNumbers(text, state, threshold) {
        if (threshold === 0) return text;
        const pattern = new RegExp(`(?<![a-zA-Z_])\\b(\\d{${threshold},}(?:\\.\\d+)?)\\b(?![a-zA-Z_])`, 'g');
        return text.replace(pattern, (_, num) => this.getMapping(num, state, 'number'));
    },

    obfuscateStrings(text, state) {
        // Double-quoted
        text = text.replace(/"([^"\\]|\\.)*"/g, m => this.obfuscateStringContent(m, '"', state));
        // Single-quoted (skip char literals)
        text = text.replace(/'([^'\\]|\\.)*'/g, m => m.length <= 4 ? m : this.obfuscateStringContent(m, "'", state));
        return text;
    },

    obfuscateStringContent(match, quote, state) {
        const content = match.slice(1, -1);
        if (!content || content.trim() === '') return match;
        if (content.includes('{') && content.includes('}')) return match;
        if (state.patterns.fully.test(content)) return match;
        const obf = this.getMapping(content, state, 'string');
        return `${quote}${obf}${quote}`;
    },

    anonymizeComposites(text, state) {
        const words = [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];
        const composites = words.filter(w =>
            !state.patterns.fully.test(w) && state.patterns.contains.test(w)
        );
        composites.sort((a, b) => b.length - a.length);

        for (const word of composites) {
            const expanded = this.expandToOriginal(word, state.mappings);
            const placeholder = this.getMapping(expanded, state);
            text = this.replaceWholeWord(text, word, placeholder);
        }
        return text;
    },

    expandToOriginal(word, mappings) {
        const reverse = Object.fromEntries(Object.entries(mappings).map(([k, v]) => [v, k]));
        const sorted = Object.keys(reverse).sort((a, b) => b.length - a.length);
        let result = word;
        for (const obf of sorted) {
            if (result.includes(obf)) result = result.split(obf).join(reverse[obf]);
        }
        return result;
    },

    // ============================================
    // NUKE LEVEL - Total Obfuscation
    // ============================================

    nukeCode(text, state) {
        const pattern = /\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/g;
        const processed = new Set();
        const identifiers = [];
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const id = match[1];
            if (!processed.has(id)) {
                processed.add(id);
                identifiers.push(id);
            }
        }

        identifiers.sort((a, b) => b.length - a.length);
        for (const id of identifiers) {
            if (!state.patterns.fully.test(id)) {
                const obf = this.getMapping(id, state);
                text = this.replaceWholeWord(text, id, obf);
            }
        }
        return text;
    },

    // ============================================
    // REVEAL
    // ============================================

    reveal(text, mappings) {
        const sorted = Object.entries(mappings).sort((a, b) => b[1].length - a[1].length);
        for (const [original, obfuscated] of sorted) {
            text = this.replaceWholeWord(text, obfuscated, original);
        }
        return text;
    },

    // ============================================
    // MAPPING HELPER
    // ============================================

    getMapping(value, state, type = 'prefix') {
        if (state.mappings[value]) return state.mappings[value];

        const style = state.style;
        let prefix;

        switch (type) {
            case 'comment': prefix = style.comment; break;
            case 'guid': prefix = style.guid; break;
            case 'path': prefix = style.path; break;
            case 'number': prefix = 'NUM'; break;
            case 'string':
            case 'prefix':
            default:
                const prefixes = style.prefixes;
                const count = Object.keys(state.mappings).length;
                prefix = prefixes[count % prefixes.length];
        }

        state.counters[prefix] = (state.counters[prefix] || 0) + 1;
        const id = `${prefix}${String(state.counters[prefix]).padStart(3, '0')}`;
        state.mappings[value] = id;
        return id;
    },

    // ============================================
    // METRICS
    // ============================================

    calculatePercent(text, patterns) {
        const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
        if (words.length === 0) return 0;
        const obfuscated = words.filter(w => patterns.contains.test(w));
        return Math.round((obfuscated.length / words.length) * 100);
    }
};
