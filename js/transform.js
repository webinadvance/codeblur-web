// CodeBlur Transform
// PURE TEXT TRANSFORMS - text in, text out
// FUNCTIONAL STYLE - filter chains, no if/else

const Transform = {
    // ============================================
    // UTILITIES
    // ============================================

    replaceWord(text, search, replace) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), replace);
    },

    splitCamel: (word) => word.split(/(?=[A-Z])|_/).filter(p => p.length > 0),

    extractWords: (text) => [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])],

    extractWords3: (text) => [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [])],

    // ============================================
    // FILTER PREDICATES (reusable)
    // ============================================

    filters: {
        minLength: (n) => (id) => id.length >= n,
        notAllCaps: (id) => id !== id.toUpperCase(),
        notFullyObfuscated: (id) => !Mapper.isFullyObfuscated(id),
        notKnownWord: (id) => !Dictionaries.isKnownWord(id),
        isObfuscated: (id) => Mapper.isObfuscated(id),
        notShortConstant: (id) => !(id === id.toUpperCase() && id.length < 5),
        notCommentStart: (s) => !s.startsWith('//') && !s.startsWith('/*') && !s.startsWith('#') && !s.startsWith('--'),
        noNewlines: (s) => !s.includes('\n'),
    },

    // ============================================
    // BLUR LEVEL - PATTERN-BASED
    // ============================================

    blurIdentifiers(text) {
        const { minLength, notAllCaps, notFullyObfuscated, notKnownWord } = this.filters;

        // Extract -> Filter -> Transform -> Apply (linear pipeline)
        const candidates = this.extractWords(text)
            .filter(minLength(2))
            .filter(notAllCaps)
            .filter(notFullyObfuscated)
            .filter(notKnownWord);

        // Process each candidate
        return candidates.reduce((txt, id) => {
            const parts = this.splitCamel(id);
            const hasUnknown = parts.some(p => !Dictionaries.isKnownWord(p));
            const obf = hasUnknown
                ? parts.map(p => Dictionaries.isKnownWord(p) ? p : Mapper.get(p)).join('')
                : id;

            return (obf !== id)
                ? (Mapper.mappings[id] = obf, this.replaceWord(txt, id, obf))
                : txt;
        }, text);
    },

    blurAllPatterns(text) {
        const skipGroups = new Set(['strings', 'all_ids', 'all_sensitive', 'logs']);

        return Patterns.listGroups()
            .filter(g => !skipGroups.has(g))
            .reduce((txt, group) => Patterns.applyGroup(group, txt), text);
    },

    // Individual group functions (one-liners)
    blurComments: (text) => Patterns.applyGroup('comments', text),
    blurGuids: (text) => Patterns.applyGroup('guids', text),
    blurPaths: (text) => Patterns.applyGroup('paths', text),
    blurNetwork: (text) => Patterns.applyGroup('network', text),
    blurContact: (text) => Patterns.applyGroup('contact', text),
    blurSecrets: (text) => Patterns.applyGroup('secrets', text),
    blurPii: (text) => Patterns.applyGroup('pii', text),
    blurTimestamps: (text) => Patterns.applyGroup('timestamps', text),
    blurSessions: (text) => Patterns.applyGroup('sessions', text),
    blurHttp: (text) => Patterns.applyGroup('http', text),
    blurDatabase: (text) => Patterns.applyGroup('database', text),
    blurCloud: (text) => Patterns.applyGroup('cloud', text),
    blurErrors: (text) => Patterns.applyGroup('errors', text),
    blurBusiness: (text) => Patterns.applyGroup('business', text),

    removeEmptyLines: (text) => text.replace(/^\s*[\r\n]/gm, '').replace(/\n{3,}/g, '\n\n'),

    // ============================================
    // ANON LEVEL - AGGRESSIVE
    // ============================================

    anonNumbers(text, threshold = Config.DEFAULT_NUMBER_THRESHOLD) {
        return (threshold === 0) ? text :
            text.replace(
                new RegExp(`(?<![a-zA-Z_])\\b(\\d{${threshold},}(?:\\.\\d+)?)\\b(?![a-zA-Z_])`, 'g'),
                (_, num) => Mapper.get(num, 'number')
            );
    },

    anonStrings: (text) => Patterns.applyGroup('strings', text),

    anonComposites(text) {
        const { notFullyObfuscated, isObfuscated } = this.filters;

        return this.extractWords(text)
            .filter(notFullyObfuscated)
            .filter(isObfuscated)
            .sort((a, b) => b.length - a.length)
            .reduce((txt, word) => {
                const expanded = Mapper.expandToOriginal(word);
                return this.replaceWord(txt, word, Mapper.get(expanded));
            }, text);
    },

    anonRemainingIds(text) {
        const { notFullyObfuscated, notKnownWord, notShortConstant } = this.filters;

        return this.extractWords3(text)
            .filter(notFullyObfuscated)
            .filter(notKnownWord)
            .filter(notShortConstant)
            .reduce((txt, id) => {
                const obf = Mapper.get(id);
                return (obf !== id) ? this.replaceWord(txt, id, obf) : txt;
            }, text);
    },

    // ============================================
    // NUKE LEVEL - EVERYTHING
    // ============================================

    nuke(text) {
        const { notFullyObfuscated } = this.filters;

        return this.extractWords3(text)
            .filter(notFullyObfuscated)
            .sort((a, b) => b.length - a.length)
            .reduce((txt, id) => this.replaceWord(txt, id, Mapper.get(id)), text);
    },

    // ============================================
    // REVEAL & MAPPINGS
    // ============================================

    reveal(text) {
        return Object.entries(Mapper.mappings)
            .sort((a, b) => b[1].length - a[1].length)
            .reduce((txt, [original, obf]) => this.replaceWord(txt, obf, original), text);
    },

    applyMappings(text) {
        const { notCommentStart, noNewlines } = this.filters;

        return Object.entries(Mapper.mappings)
            .filter(([orig]) => notCommentStart(orig) && noNewlines(orig))
            .sort((a, b) => b[0].length - a[0].length)
            .reduce((txt, [original, obf]) => this.replaceWord(txt, original, obf), text);
    }
};
