// CodeBlur Mapper
// EXPLICIT STATE OWNER - all mapping mutations happen here

const Mapper = {
    // State
    mappings: {},
    counters: {},
    style: null,
    patterns: null,

    // Initialize with style
    init(styleName) {
        this.style = Config.STYLES[styleName] || Config.STYLES[Config.DEFAULT_STYLE];
        this.patterns = this.buildPatterns();
        this.initCounters();
    },

    // Build detection patterns from all styles (runs once)
    buildPatterns() {
        const allPrefixes = [];
        Object.values(Config.STYLES).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.push(p));
            ['comment', 'guid', 'path', 'func', 'prop', 'field', 'number', 'string'].forEach(k => {
                if (style[k]) allPrefixes.push(style[k]);
            });
        });
        const unique = [...new Set(allPrefixes)].sort((a, b) => b.length - a.length);
        const pattern = unique.join('|');
        return {
            contains: new RegExp(`(${pattern})\\d{2,}`),
            fully: new RegExp(`^(${pattern})\\d+$`)
        };
    },

    initCounters() {
        this.style.prefixes.forEach(p => this.counters[p] = this.counters[p] || 0);
        ['comment', 'guid', 'path', 'func', 'prop', 'field', 'number', 'string'].forEach(k => {
            if (this.style[k]) this.counters[this.style[k]] = this.counters[this.style[k]] || 0;
        });
    },

    // Get or create mapping - ONLY place that mutates mappings
    get(value, type = 'default') {
        if (this.mappings[value]) return this.mappings[value];

        const prefix = this.style[type] || this.style.prefixes[Object.keys(this.mappings).length % this.style.prefixes.length];
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const id = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
        this.mappings[value] = id;
        return id;
    },

    // Reverse lookup: obfuscated -> original
    getReverse() {
        return Object.fromEntries(Object.entries(this.mappings).map(([k, v]) => [v, k]));
    },

    // Expand composite back to original parts
    expandToOriginal(word) {
        const reverse = this.getReverse();
        const sorted = Object.keys(reverse).sort((a, b) => b.length - a.length);
        let result = word;
        for (const obf of sorted) {
            if (result.includes(obf)) result = result.split(obf).join(reverse[obf]);
        }
        return result;
    },

    // Check if word is obfuscated
    isObfuscated(word) {
        return this.patterns.contains.test(word);
    },

    isFullyObfuscated(word) {
        return this.patterns.fully.test(word);
    },

    // Calculate obfuscation percentage
    calcPercent(text) {
        const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
        if (words.length === 0) return 0;
        const obfuscated = words.filter(w => this.patterns.contains.test(w));
        return Math.round((obfuscated.length / words.length) * 100);
    },

    // State management
    clear() {
        this.mappings = {};
        this.counters = {};
        this.initCounters();
    },

    load(data) {
        this.mappings = data.mappings || {};
        this.counters = data.counters || {};
    },

    save() {
        return { mappings: this.mappings, counters: this.counters };
    },

    count() {
        return Object.keys(this.mappings).length;
    }
};
