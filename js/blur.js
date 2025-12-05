// CodeBlur - Fast Single-Pass Implementation
// Replaces: mapper.js, patterns.js, transform.js, levels.js
// 25-143x faster than previous multi-pass architecture

// ============================================
// FINGERPRINT - AI Watermark/Fingerprint Sanitization
// Removes invisible Unicode characters, homoglyphs, and
// other markers that LLMs may embed in generated code
// ============================================
const Fingerprint = {
    // Zero-width and invisible characters (comprehensive list)
    // Sources: Unicode.org, invisible-characters.com, security research
    INVISIBLE_CHARS: [
        // Zero-width characters
        '\u200B',  // Zero Width Space
        '\u200C',  // Zero Width Non-Joiner
        '\u200D',  // Zero Width Joiner
        '\u200E',  // Left-to-Right Mark
        '\u200F',  // Right-to-Left Mark
        '\uFEFF',  // Byte Order Mark (BOM) / Zero Width No-Break Space
        '\u00AD',  // Soft Hyphen

        // Word joiners and separators
        '\u2060',  // Word Joiner
        '\u2061',  // Function Application (invisible operator)
        '\u2062',  // Invisible Times
        '\u2063',  // Invisible Separator
        '\u2064',  // Invisible Plus
        '\u2065',  // (reserved)

        // Directional formatting
        '\u202A',  // Left-to-Right Embedding
        '\u202B',  // Right-to-Left Embedding
        '\u202C',  // Pop Directional Formatting
        '\u202D',  // Left-to-Right Override
        '\u202E',  // Right-to-Left Override

        // Directional isolates
        '\u2066',  // Left-to-Right Isolate
        '\u2067',  // Right-to-Left Isolate
        '\u2068',  // First Strong Isolate
        '\u2069',  // Pop Directional Isolate

        // Arabic/digit shaping
        '\u206A',  // Inhibit Symmetric Swapping
        '\u206B',  // Activate Symmetric Swapping
        '\u206C',  // Inhibit Arabic Form Shaping
        '\u206D',  // Activate Arabic Form Shaping
        '\u206E',  // National Digit Shapes
        '\u206F',  // Nominal Digit Shapes

        // Mongolian and other invisible
        '\u180B',  // Mongolian Free Variation Selector One
        '\u180C',  // Mongolian Free Variation Selector Two
        '\u180D',  // Mongolian Free Variation Selector Three
        '\u180E',  // Mongolian Vowel Separator

        // Tags (used for steganography)
        '\uE0001', // Language Tag

        // Other invisible
        '\u034F',  // Combining Grapheme Joiner
        '\u061C',  // Arabic Letter Mark
        '\u115F',  // Hangul Choseong Filler
        '\u1160',  // Hangul Jungseong Filler
        '\u17B4',  // Khmer Vowel Inherent Aq
        '\u17B5',  // Khmer Vowel Inherent Aa
        '\u3164',  // Hangul Filler
        '\uFFA0',  // Halfwidth Hangul Filler

        // Annotation characters
        '\uFFF9',  // Interlinear Annotation Anchor
        '\uFFFA',  // Interlinear Annotation Separator
        '\uFFFB',  // Interlinear Annotation Terminator
    ],

    // Non-standard spaces (often used as fingerprints)
    SPECIAL_SPACES: {
        '\u00A0': ' ',  // Non-Breaking Space → regular space
        '\u1680': ' ',  // Ogham Space Mark
        '\u2000': ' ',  // En Quad
        '\u2001': ' ',  // Em Quad
        '\u2002': ' ',  // En Space
        '\u2003': ' ',  // Em Space
        '\u2004': ' ',  // Three-Per-Em Space
        '\u2005': ' ',  // Four-Per-Em Space
        '\u2006': ' ',  // Six-Per-Em Space
        '\u2007': ' ',  // Figure Space
        '\u2008': ' ',  // Punctuation Space
        '\u2009': ' ',  // Thin Space
        '\u200A': ' ',  // Hair Space
        '\u202F': ' ',  // Narrow No-Break Space (common in AI output!)
        '\u205F': ' ',  // Medium Mathematical Space
        '\u3000': ' ',  // Ideographic Space
    },

    // Common homoglyphs: visually identical chars from different Unicode blocks
    // Maps confusable characters to their ASCII equivalents
    HOMOGLYPHS: {
        // Cyrillic → Latin (lowercase)
        '\u0430': 'a',  // Cyrillic Small Letter A
        '\u0441': 'c',  // Cyrillic Small Letter Es
        '\u0435': 'e',  // Cyrillic Small Letter Ie
        '\u04BB': 'h',  // Cyrillic Small Letter Shha
        '\u0456': 'i',  // Cyrillic Small Letter Byelorussian-Ukrainian I
        '\u0458': 'j',  // Cyrillic Small Letter Je
        '\u043E': 'o',  // Cyrillic Small Letter O
        '\u0440': 'p',  // Cyrillic Small Letter Er
        '\u0455': 's',  // Cyrillic Small Letter Dze
        '\u0445': 'x',  // Cyrillic Small Letter Ha
        '\u0443': 'y',  // Cyrillic Small Letter U
        '\u04CF': 'l',  // Cyrillic Small Letter Palochka

        // Cyrillic → Latin (uppercase)
        '\u0410': 'A',  // Cyrillic Capital Letter A
        '\u0412': 'B',  // Cyrillic Capital Letter Ve
        '\u0421': 'C',  // Cyrillic Capital Letter Es
        '\u0415': 'E',  // Cyrillic Capital Letter Ie
        '\u041D': 'H',  // Cyrillic Capital Letter En
        '\u0406': 'I',  // Cyrillic Capital Letter Byelorussian-Ukrainian I
        '\u0408': 'J',  // Cyrillic Capital Letter Je
        '\u041A': 'K',  // Cyrillic Capital Letter Ka
        '\u041C': 'M',  // Cyrillic Capital Letter Em
        '\u041E': 'O',  // Cyrillic Capital Letter O
        '\u0420': 'P',  // Cyrillic Capital Letter Er
        '\u0405': 'S',  // Cyrillic Capital Letter Dze
        '\u0422': 'T',  // Cyrillic Capital Letter Te
        '\u0425': 'X',  // Cyrillic Capital Letter Ha
        '\u0423': 'Y',  // Cyrillic Capital Letter U

        // Greek → Latin
        '\u03B1': 'a',  // Greek Small Letter Alpha
        '\u03B5': 'e',  // Greek Small Letter Epsilon
        '\u03B9': 'i',  // Greek Small Letter Iota
        '\u03BA': 'k',  // Greek Small Letter Kappa
        '\u03BD': 'v',  // Greek Small Letter Nu
        '\u03BF': 'o',  // Greek Small Letter Omicron
        '\u03C1': 'p',  // Greek Small Letter Rho
        '\u03C5': 'u',  // Greek Small Letter Upsilon
        '\u03C7': 'x',  // Greek Small Letter Chi
        '\u0391': 'A',  // Greek Capital Letter Alpha
        '\u0392': 'B',  // Greek Capital Letter Beta
        '\u0395': 'E',  // Greek Capital Letter Epsilon
        '\u0397': 'H',  // Greek Capital Letter Eta
        '\u0399': 'I',  // Greek Capital Letter Iota
        '\u039A': 'K',  // Greek Capital Letter Kappa
        '\u039C': 'M',  // Greek Capital Letter Mu
        '\u039D': 'N',  // Greek Capital Letter Nu
        '\u039F': 'O',  // Greek Capital Letter Omicron
        '\u03A1': 'P',  // Greek Capital Letter Rho
        '\u03A4': 'T',  // Greek Capital Letter Tau
        '\u03A7': 'X',  // Greek Capital Letter Chi
        '\u03A5': 'Y',  // Greek Capital Letter Upsilon
        '\u0396': 'Z',  // Greek Capital Letter Zeta

        // Extended Latin variants
        '\u0501': 'd',  // Cyrillic Small Letter Komi De
        '\u0578': 'n',  // Armenian Small Letter Vo

        // Typographic variants (common in AI output)
        '\u2014': '-',  // Em Dash → hyphen
        '\u2013': '-',  // En Dash → hyphen
        '\u2010': '-',  // Hyphen
        '\u2011': '-',  // Non-Breaking Hyphen
        '\u2012': '-',  // Figure Dash
        '\u2015': '-',  // Horizontal Bar
        '\u2018': "'",  // Left Single Quotation Mark
        '\u2019': "'",  // Right Single Quotation Mark
        '\u201A': "'",  // Single Low-9 Quotation Mark
        '\u201B': "'",  // Single High-Reversed-9 Quotation Mark
        '\u201C': '"',  // Left Double Quotation Mark
        '\u201D': '"',  // Right Double Quotation Mark
        '\u201E': '"',  // Double Low-9 Quotation Mark
        '\u201F': '"',  // Double High-Reversed-9 Quotation Mark
        '\u2032': "'",  // Prime
        '\u2033': '"',  // Double Prime
        '\u2035': "'",  // Reversed Prime
        '\u2036': '"',  // Reversed Double Prime
        '\u00AB': '"',  // Left-Pointing Double Angle Quotation Mark
        '\u00BB': '"',  // Right-Pointing Double Angle Quotation Mark
        '\u2039': "'",  // Single Left-Pointing Angle Quotation Mark
        '\u203A': "'",  // Single Right-Pointing Angle Quotation Mark
        '\u02BC': "'",  // Modifier Letter Apostrophe
        '\u02BB': "'",  // Modifier Letter Turned Comma
        '\u0060': "'",  // Grave Accent (when used as apostrophe)
        '\u00B4': "'",  // Acute Accent

        // Mathematical operators that look like letters
        '\u2212': '-',  // Minus Sign
        '\u2217': '*',  // Asterisk Operator
        '\u2215': '/',  // Division Slash
        '\u2044': '/',  // Fraction Slash
        '\u2236': ':',  // Ratio

        // Fullwidth ASCII (common in CJK contexts)
        '\uFF01': '!',  // Fullwidth Exclamation Mark
        '\uFF02': '"',  // Fullwidth Quotation Mark
        '\uFF03': '#',  // Fullwidth Number Sign
        '\uFF04': '$',  // Fullwidth Dollar Sign
        '\uFF05': '%',  // Fullwidth Percent Sign
        '\uFF06': '&',  // Fullwidth Ampersand
        '\uFF07': "'",  // Fullwidth Apostrophe
        '\uFF08': '(',  // Fullwidth Left Parenthesis
        '\uFF09': ')',  // Fullwidth Right Parenthesis
        '\uFF0A': '*',  // Fullwidth Asterisk
        '\uFF0B': '+',  // Fullwidth Plus Sign
        '\uFF0C': ',',  // Fullwidth Comma
        '\uFF0D': '-',  // Fullwidth Hyphen-Minus
        '\uFF0E': '.',  // Fullwidth Full Stop
        '\uFF0F': '/',  // Fullwidth Solidus
        '\uFF1A': ':',  // Fullwidth Colon
        '\uFF1B': ';',  // Fullwidth Semicolon
        '\uFF1C': '<',  // Fullwidth Less-Than Sign
        '\uFF1D': '=',  // Fullwidth Equals Sign
        '\uFF1E': '>',  // Fullwidth Greater-Than Sign
        '\uFF1F': '?',  // Fullwidth Question Mark
        '\uFF20': '@',  // Fullwidth Commercial At
        '\uFF3B': '[',  // Fullwidth Left Square Bracket
        '\uFF3C': '\\', // Fullwidth Reverse Solidus
        '\uFF3D': ']',  // Fullwidth Right Square Bracket
        '\uFF3E': '^',  // Fullwidth Circumflex Accent
        '\uFF3F': '_',  // Fullwidth Low Line
        '\uFF40': '`',  // Fullwidth Grave Accent
        '\uFF5B': '{',  // Fullwidth Left Curly Bracket
        '\uFF5C': '|',  // Fullwidth Vertical Line
        '\uFF5D': '}',  // Fullwidth Right Curly Bracket
        '\uFF5E': '~',  // Fullwidth Tilde
    },

    // Build regex patterns once for performance
    _invisiblePattern: null,
    _spacePattern: null,
    _homoglyphPattern: null,

    _buildPatterns() {
        if (!this._invisiblePattern) {
            // Invisible characters pattern
            const invisibleEscaped = this.INVISIBLE_CHARS
                .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            this._invisiblePattern = new RegExp(invisibleEscaped, 'g');

            // Special spaces pattern
            const spaceChars = Object.keys(this.SPECIAL_SPACES).join('');
            this._spacePattern = new RegExp(`[${spaceChars}]`, 'g');

            // Homoglyphs pattern
            const homoglyphChars = Object.keys(this.HOMOGLYPHS).join('');
            this._homoglyphPattern = new RegExp(`[${homoglyphChars}]`, 'g');
        }
    },

    /**
     * Sanitize text by removing AI fingerprints/watermarks
     * @param {string} text - Input text to sanitize
     * @param {Object} options - Sanitization options
     * @param {boolean} options.removeInvisible - Remove invisible characters (default: true)
     * @param {boolean} options.normalizeSpaces - Normalize special spaces (default: true)
     * @param {boolean} options.replaceHomoglyphs - Replace homoglyphs with ASCII (default: true)
     * @param {boolean} options.useNFKC - Apply NFKC normalization (default: true)
     * @returns {Object} { text: string, stats: { invisible: number, spaces: number, homoglyphs: number } }
     */
    sanitize(text, options = {}) {
        const opts = {
            removeInvisible: true,
            normalizeSpaces: true,
            replaceHomoglyphs: true,
            useNFKC: true,
            ...options
        };

        this._buildPatterns();

        const stats = {
            invisible: 0,
            spaces: 0,
            homoglyphs: 0
        };

        let result = text;

        // Step 1: NFKC normalization (handles many compatibility characters)
        if (opts.useNFKC && typeof result.normalize === 'function') {
            const before = result;
            result = result.normalize('NFKC');
            // Can't count exact changes from normalization, but it handles:
            // - Fullwidth → ASCII
            // - Ligatures → component letters
            // - Compatibility decompositions
        }

        // Step 2: Remove invisible characters
        if (opts.removeInvisible) {
            result = result.replace(this._invisiblePattern, (match) => {
                stats.invisible++;
                return '';
            });

            // Also remove variation selectors (U+FE00 - U+FE0F) and (U+E0100 - U+E01EF)
            result = result.replace(/[\uFE00-\uFE0F]/g, (match) => {
                stats.invisible++;
                return '';
            });
        }

        // Step 3: Normalize special spaces
        if (opts.normalizeSpaces) {
            result = result.replace(this._spacePattern, (match) => {
                stats.spaces++;
                return this.SPECIAL_SPACES[match] || ' ';
            });
        }

        // Step 4: Replace homoglyphs with ASCII equivalents
        if (opts.replaceHomoglyphs) {
            result = result.replace(this._homoglyphPattern, (match) => {
                stats.homoglyphs++;
                return this.HOMOGLYPHS[match] || match;
            });
        }

        return { text: result, stats };
    },

    /**
     * Quick check if text contains any fingerprint characters
     * @param {string} text - Text to check
     * @returns {boolean} True if fingerprints detected
     */
    hasFingerprints(text) {
        this._buildPatterns();
        return this._invisiblePattern.test(text) ||
               this._spacePattern.test(text) ||
               this._homoglyphPattern.test(text) ||
               /[\uFE00-\uFE0F]/.test(text);
    },

    /**
     * Get human-readable report of fingerprints found
     * @param {string} text - Text to analyze
     * @returns {Object} Detailed report of found fingerprints
     */
    analyze(text) {
        this._buildPatterns();
        const found = {
            invisible: [],
            spaces: [],
            homoglyphs: [],
            total: 0
        };

        // Find invisible characters
        let match;
        const invisibleRegex = new RegExp(this._invisiblePattern.source, 'g');
        while ((match = invisibleRegex.exec(text)) !== null) {
            const char = match[0];
            const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            found.invisible.push({ char, code: `U+${code}`, position: match.index });
            found.total++;
        }

        // Find special spaces
        const spaceRegex = new RegExp(this._spacePattern.source, 'g');
        while ((match = spaceRegex.exec(text)) !== null) {
            const char = match[0];
            const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            found.spaces.push({ char, code: `U+${code}`, position: match.index });
            found.total++;
        }

        // Find homoglyphs
        const homoglyphRegex = new RegExp(this._homoglyphPattern.source, 'g');
        while ((match = homoglyphRegex.exec(text)) !== null) {
            const char = match[0];
            const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            const ascii = this.HOMOGLYPHS[char];
            found.homoglyphs.push({ char, code: `U+${code}`, ascii, position: match.index });
            found.total++;
        }

        // Find variation selectors
        const varSelectorRegex = /[\uFE00-\uFE0F]/g;
        while ((match = varSelectorRegex.exec(text)) !== null) {
            const char = match[0];
            const code = char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
            found.invisible.push({ char, code: `U+${code}`, position: match.index });
            found.total++;
        }

        return found;
    }
};

// ============================================
// MAPPER - State management (backward compatible API)
// ============================================
const Mapper = {
    mappings: {},
    counters: {},
    style: null,
    _reverse: null,

    init(styleName) {
        this.style = Config.STYLES[styleName] || Config.STYLES[Config.DEFAULT_STYLE];
        this.counters = {};
        this.style.prefixes.forEach(p => this.counters[p] = 0);
        ['comment', 'guid', 'path', 'func', 'prop', 'field', 'number', 'string'].forEach(k => {
            if (this.style[k]) this.counters[this.style[k]] = 0;
        });
        this._reverse = null;
    },

    get(value, type = 'default') {
        if (this.mappings[value]) return this.mappings[value];

        const prefix = this.style[type] || this.style.prefixes[Object.keys(this.mappings).length % this.style.prefixes.length];
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const id = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
        this.mappings[value] = id;
        this._reverse = null;
        return id;
    },

    getReverse() {
        if (!this._reverse) {
            this._reverse = Object.fromEntries(Object.entries(this.mappings).map(([k, v]) => [v, k]));
        }
        return this._reverse;
    },

    // Token pattern: 1-3 uppercase letters + 3 digits (e.g., G001, STR001, NUM001)
    TOKEN_PATTERN: /[A-Z]{1,3}\d{3}/g,

    isObfuscated(word) {
        // Check if word contains any obfuscated token (handles consecutive like G001STR001)
        return /[A-Z]{1,3}\d{3}/.test(word);
    },

    isFullyObfuscated(word) {
        // Check if word is exactly one or more consecutive tokens (e.g., G001 or G001STR001)
        return /^([A-Z]{1,3}\d{3})+$/.test(word);
    },

    calcPercent(text) {
        // Count individual tokens, not words (handles consecutive tokens)
        const tokens = text.match(this.TOKEN_PATTERN) || [];
        const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
        if (words.length === 0 && tokens.length === 0) return 0;
        // Use token count for percentage (more accurate)
        const totalIdentifiers = words.filter(w => !this.isFullyObfuscated(w)).length + tokens.length;
        if (totalIdentifiers === 0) return 0;
        return Math.round((tokens.length / totalIdentifiers) * 100);
    },

    clear() {
        this.mappings = {};
        this._reverse = null;
        if (this.style) {
            this.style.prefixes.forEach(p => this.counters[p] = 0);
            ['comment', 'guid', 'path', 'func', 'prop', 'field', 'number', 'string'].forEach(k => {
                if (this.style[k]) this.counters[this.style[k]] = 0;
            });
        }
    },

    load(data) {
        this.mappings = data.mappings || {};
        this.counters = data.counters || {};
        this._reverse = null;
    },

    save() {
        return { mappings: this.mappings, counters: this.counters };
    },

    count() {
        return Object.keys(this.mappings).length;
    }
};

// ============================================
// TRANSFORM - Fast single-pass transforms
// ============================================
const Transform = {
    // Utility: replace word with boundary matching
    replaceWord(text, search, replace) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), replace);
    },

    // CamelCase split - handles camelCase, PascalCase, SCREAMING_SNAKE_CASE
    // Returns { parts: string[], separator: string }
    splitCamel(word) {
        // SCREAMING_SNAKE_CASE - split on underscores, preserve underscore as separator
        if (word.includes('_')) {
            return { parts: word.split('_').filter(p => p.length > 0), separator: '_' };
        }
        // camelCase/PascalCase - split on case transitions, join with empty string
        const parts = word
            .replace(/([a-z])([A-Z])/g, '$1\x00$2')           // camelCase → camel\0Case
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1\x00$2')     // XMLParser → XML\0Parser
            .split('\x00')
            .filter(p => p.length > 0);
        return { parts, separator: '' };
    },

    // Check if word is known
    isKnown: (word) => Dictionaries.isKnownWord(word),

    // Smart word blur with CamelCase support
    blurWord(word) {
        if (word.length < 3) return word;
        // Skip if already obfuscated (fully or partially) - prevents circular mappings
        if (Mapper.isFullyObfuscated(word)) return word;
        if (Mapper.isObfuscated(word)) return word;

        const { parts, separator } = this.splitCamel(word);
        if (parts.length > 1) {
            const hasUnknown = parts.some(p => !this.isKnown(p));
            if (hasUnknown) {
                const result = parts.map(p => this.isKnown(p) ? p : Mapper.get(p)).join(separator);
                if (result !== word) {
                    Mapper.mappings[word] = result;
                    return result;
                }
            }
            return word;
        }

        return this.isKnown(word) ? word : Mapper.get(word);
    },

    // ============================================
    // SINGLE-PASS MEGA PATTERN - Comprehensive Security
    // ============================================
    MEGA_PATTERN: new RegExp([
        // Email addresses
        '([\\w.+-]+@[\\w.-]+\\.[a-z]{2,})',

        // IP Addresses (IPv4 & IPv6)
        '(\\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\\b)',                    // IPv6 full
        '(\\b(?:[0-9a-fA-F]{1,4}:){1,7}:\\b)',                                 // IPv6 compressed
        '(\\b:(?::[0-9a-fA-F]{1,4}){1,7}\\b)',                                 // IPv6 compressed start
        '(\\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\\b)',                 // IPv6 mixed
        '(\\b\\d{1,3}(?:\\.\\d{1,3}){3}(?::\\d+)?\\b)',                        // IPv4 with optional port

        // MAC addresses
        '(\\b(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\\b)',

        // GUIDs/UUIDs
        '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})',

        // Credit card numbers (13-19 digits, grouped by spaces/dashes)
        '(\\b(?:\\d{4}[\\s-]?){3}\\d{1,7}\\b)',

        // Social Security Numbers (SSN) - US format
        '(\\b\\d{3}-\\d{2}-\\d{4}\\b)',

        // Phone numbers (various formats)
        '(\\+?\\d{1,3}[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b)',

        // URLs (http, https, ftp, ws, wss, file)
        '((?:https?|ftp|file|ws|wss):\\/\\/[^\\s"\'<>]+)',

        // File paths
        '([A-Za-z]:\\\\[^\\s"\'<>:*?|]+)',                                     // Windows path
        '(\\\\\\\\[^\\s"\'<>:*?|]+)',                                          // UNC path
        '(\\/(?:[a-zA-Z0-9_.-]+\\/){2,}[a-zA-Z0-9_.-]*)',                      // Unix absolute path

        // Security tokens & keys
        '(eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*)',              // JWT
        '(\\bAKIA[A-Z0-9]{16}\\b)',                                            // AWS Access Key
        '(\\bAIza[0-9A-Za-z\\-_]{35}\\b)',                                     // Google API Key
        '(\\bgh[pousr]_[A-Za-z0-9]{36}\\b)',                                   // GitHub Token
        '(\\bsk_live_[0-9a-zA-Z]{24,}\\b)',                                    // Stripe Secret Key
        '(\\bsq0csp-[0-9A-Za-z\\-_]{43}\\b)',                                  // Square Access Token
        '(\\bxox[pboa]-[0-9]{12}-[0-9]{12}-[0-9a-zA-Z]{24,}\\b)',             // Slack Token

        // Crypto addresses
        '(\\b(?:0x)?[a-fA-F0-9]{40}\\b)',                                      // Ethereum address
        '(\\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\\b)',                             // Bitcoin address

        // Database connection strings
        '((?:mongodb|mysql|postgresql|redis|mssql):\\/\\/[^\\s"\'<>]+)',

        // Hex numbers
        '(\\b0x[0-9a-fA-F]+\\b)',

        // Large numbers (4+ digits, including decimals)
        '(\\b\\d{4,}(?:\\.\\d+)?\\b)',

        // Identifiers (last - catch remaining words)
        '(\\b[a-zA-Z_][a-zA-Z0-9_]{2,}\\b)'
    ].join('|'), 'g'),

    // ============================================
    // COMMENTS & STRINGS - Obfuscate before main pass
    // ============================================

    // Comment patterns for various languages
    COMMENT_PATTERN: new RegExp([
        // Multi-line comments: /* ... */ (C, JS, Java, CSS, etc.)
        '(/\\*[\\s\\S]*?\\*/)',
        // Single-line comments: // (C, JS, Java, Go, etc.)
        '(//[^\\n]*)',
        // Hash comments: # (Python, Ruby, Shell, YAML, etc.)
        '(#[^\\n]*)',
        // HTML/XML comments: <!-- ... -->
        '(<!--[\\s\\S]*?-->)',
        // SQL comments: --
        '(--[^\\n]*)',
        // Lua/Haskell comments: --
        // Already covered above
        // PowerShell block comments: <# ... #>
        '(<#[\\s\\S]*?#>)',
        // Batch/CMD comments: REM or ::
        '(^\\s*(?:REM|::)[^\\n]*)',
        // MATLAB comments: %
        '(%[^\\n]*)',
    ].join('|'), 'gm'),

    // String patterns - double and single quoted
    STRING_PATTERN: new RegExp([
        // Double-quoted strings (with escape handling)
        '("(?:[^"\\\\]|\\\\.)*")',
        // Single-quoted strings (with escape handling)
        "('(?:[^'\\\\]|\\\\.)*')",
        // Template literals / backtick strings
        '(`(?:[^`\\\\]|\\\\.)*`)',
    ].join('|'), 'g'),

    // Obfuscate all comments
    blurComments(text) {
        return text.replace(this.COMMENT_PATTERN, (match) => {
            if (!match || match.length < 2) return match;
            // Skip if already obfuscated
            if (Mapper.isFullyObfuscated(match)) return match;

            // Preserve comment markers, obfuscate content
            // Multi-line /* */ - SKIP if contains newlines (preserve JSDoc, complex comments)
            if (match.startsWith('/*') && match.endsWith('*/')) {
                const content = match.slice(2, -2);
                if (!content.trim()) return match;
                // Skip multi-line comments (they often contain important docs)
                if (content.includes('\n')) return match;
                return `/*${Mapper.get(content.trim(), 'comment')}*/`;
            }
            // HTML <!-- -->
            if (match.startsWith('<!--') && match.endsWith('-->')) {
                const content = match.slice(4, -3);
                if (!content.trim()) return match;
                return `<!--${Mapper.get(content.trim(), 'comment')}-->`;
            }
            // PowerShell <# #>
            if (match.startsWith('<#') && match.endsWith('#>')) {
                const content = match.slice(2, -2);
                if (!content.trim()) return match;
                return `<#${Mapper.get(content.trim(), 'comment')}#>`;
            }
            // Single-line comments (// # -- % REM ::)
            const singleLineMatch = match.match(/^(\s*)(\/\/|#|--|%|REM\s|::)(\s*)(.*)$/);
            if (singleLineMatch) {
                const [, whitespace, marker, spacing, content] = singleLineMatch;
                if (!content.trim()) return match;
                return `${whitespace}${marker}${spacing}${Mapper.get(content.trim(), 'comment')}`;
            }

            return match;
        });
    },

    // Obfuscate all strings
    blurStrings(text) {
        return text.replace(this.STRING_PATTERN, (match) => {
            if (!match || match.length < 2) return match;

            const quote = match[0]; // " or ' or `
            const content = match.slice(1, -1);

            // Skip empty strings
            if (!content) return match;
            // Skip if content is already obfuscated
            if (Mapper.isFullyObfuscated(content)) return match;
            // Skip strings that look like template expressions ${...} or {...}
            if (content.includes('${') || (quote === '`' && content.includes('${'))) return match;
            // Skip very short strings (1-2 chars) - likely format specifiers
            if (content.length < 3) return match;

            return `${quote}${Mapper.get(content, 'string')}${quote}`;
        });
    },

    // ============================================
    // BLUR - Clean linear flow
    // ============================================
    blur(text, options = {}) {
        const fullStringObfuscation = options.fullStringObfuscation || false;

        // Step 1: Protect strings with placeholders (prevents # in strings being treated as comments)
        // Use \x00\x01N\x01\x00 format - \x01 won't match any pattern (not #, not identifier)
        const strings = [];
        let result = text.replace(this.STRING_PATTERN, (match) => {
            strings.push(match);
            return `\x00\x01${strings.length - 1}\x01\x00`;
        });

        // Step 2: Obfuscate comments
        result = this.blurComments(result);

        // Step 3: Apply MEGA_PATTERN to non-string content
        result = result.replace(this.MEGA_PATTERN, (match,
            email,
            ipv6_full, ipv6_comp, ipv6_start, ipv6_mixed, ipv4,
            mac,
            guid,
            credit_card,
            ssn,
            phone,
            url,
            winpath, unc, unixpath,
            jwt, aws, google_api, github, stripe, square, slack,
            eth_addr, btc_addr,
            db_conn,
            hex,
            number,
            word) => {

            // Email
            if (email) return Mapper.get(match, 'path');

            // IP Addresses
            if (ipv6_full || ipv6_comp || ipv6_start || ipv6_mixed || ipv4) return Mapper.get(match, 'path');

            // MAC address
            if (mac) return Mapper.get(match, 'path');

            // GUID
            if (guid) return Mapper.get(match, 'guid');

            // Sensitive personal data
            if (credit_card) return Mapper.get(match, 'number');
            if (ssn) return Mapper.get(match, 'number');
            if (phone) return Mapper.get(match, 'number');

            // URLs
            if (url) return Mapper.get(match, 'path');

            // File paths
            if (winpath || unc || unixpath) return Mapper.get(match, 'path');

            // Security tokens & API keys
            if (jwt || aws || google_api || github || stripe || square || slack) return Mapper.get(match, 'string');

            // Crypto addresses
            if (eth_addr || btc_addr) return Mapper.get(match, 'string');

            // Database connections
            if (db_conn) return Mapper.get(match, 'path');

            // Hex numbers
            if (hex) return Mapper.get(match, 'number');

            // Large numbers
            if (number) return Mapper.get(match, 'number');

            // Identifiers (smart blur with dictionary check)
            if (word) return this.blurWord(match);

            return match;
        });

        // Step 4: Restore strings and apply obfuscation based on mode
        result = result.replace(/\x00\x01(\d+)\x01\x00/g, (_, idx) => {
            const original = strings[parseInt(idx)];
            if (!original || original.length < 2) return original;

            const quote = original[0];
            const content = original.slice(1, -1);

            // Empty string - keep as is
            if (!content) return original;

            // Already obfuscated - keep as is
            if (Mapper.isFullyObfuscated(content)) return original;

            // Template literal with ${} - keep as is (has dynamic content)
            if (content.includes('${')) return original;

            // Full string obfuscation: entire string becomes one token
            if (fullStringObfuscation) {
                return `${quote}${Mapper.get(content, 'string')}${quote}`;
            }

            // Normal mode: keep string as is (content already processed by MEGA_PATTERN if needed)
            return original;
        });

        return result;
    },

    // ============================================
    // ANON - Aggressive: numbers + strings + remaining
    // ============================================
    anon(text, numberThreshold = 4) {
        let result = text;

        // Numbers
        if (numberThreshold > 0) {
            result = result.replace(
                new RegExp(`(?<![a-zA-Z_])\\b(\\d{${numberThreshold},}(?:\\.\\d+)?)\\b(?![a-zA-Z_])`, 'g'),
                (_, num) => Mapper.get(num, 'number')
            );
        }

        // Strings
        result = result.replace(/"([^"\\]|\\.)+"/g, (match) => {
            const content = match.slice(1, -1);
            if (!content || content.includes('{') || Mapper.isFullyObfuscated(content)) return match;
            return `"${Mapper.get(content, 'string')}"`;
        });

        result = result.replace(/'([^'\\]|\\.){4,}'/g, (match) => {
            const content = match.slice(1, -1);
            if (!content || content.includes('{') || Mapper.isFullyObfuscated(content)) return match;
            return `'${Mapper.get(content, 'string')}'`;
        });

        // Remaining identifiers
        result = result.replace(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g, (word) => {
            // Skip if already obfuscated (fully or partially)
            if (Mapper.isFullyObfuscated(word)) return word;
            if (Mapper.isObfuscated(word)) return word;
            if (this.isKnown(word)) return word;
            return Mapper.get(word);
        });

        return result;
    },

    // ============================================
    // NUKE - Everything, no mercy
    // ============================================
    nuke(text) {
        return text.replace(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g, (word) => {
            // Skip if fully or partially obfuscated (prevents circular mappings)
            if (Mapper.isFullyObfuscated(word)) return word;
            if (Mapper.isObfuscated(word)) return word;
            return Mapper.get(word);
        });
    },

    // ============================================
    // UTILITY TRANSFORMS
    // ============================================
    anonStrings(text) {
        let result = text;
        result = result.replace(/"([^"\\]|\\.)+"/g, (match) => {
            const content = match.slice(1, -1);
            if (!content || Mapper.isFullyObfuscated(content)) return match;
            return `"${Mapper.get(content, 'string')}"`;
        });
        result = result.replace(/'([^'\\]|\\.){4,}'/g, (match) => {
            const content = match.slice(1, -1);
            if (!content || Mapper.isFullyObfuscated(content)) return match;
            return `'${Mapper.get(content, 'string')}'`;
        });
        return result;
    },

    removeEmptyLines: (text) => text.replace(/^\s*[\r\n]/gm, '').replace(/\n{3,}/g, '\n\n'),

    reveal(text) {
        const entries = Object.entries(Mapper.mappings);
        if (entries.length === 0) return text;

        // Build reverse lookup: obfuscated -> original
        const reverseLookup = Object.fromEntries(entries.map(([orig, obf]) => [obf, orig]));

        // Sort by length descending to match longer tokens first (STR001 before STR00)
        const sortedObfs = entries.map(([, obf]) => obf).sort((a, b) => b.length - a.length);
        const escapedObfs = sortedObfs.map(obf => obf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // Use lookbehind/lookahead to:
        // - Allow consecutive tokens: G001STR001 (digit before uppercase S is OK)
        // - Prevent matching inside words: mySTR001var (lowercase before/after is NOT OK)
        // (?<![a-z]) = not preceded by lowercase letter
        // (?![a-z]) = not followed by lowercase letter
        const combinedPattern = new RegExp(`(?<![a-z])(${escapedObfs.join('|')})(?![a-z])`, 'g');

        return text.replace(combinedPattern, (match, token) => reverseLookup[token] || match);
    },

    applyMappings(text) {
        const entries = Object.entries(Mapper.mappings)
            .filter(([orig]) => !orig.startsWith('//') && !orig.startsWith('/*') && !orig.startsWith('#') && !orig.includes('\n'));

        if (entries.length === 0) return text;

        // Build a single regex matching all originals (much faster than iterating)
        const escapedOriginals = entries.map(([orig]) => orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const combinedPattern = new RegExp(`\\b(${escapedOriginals.join('|')})\\b`, 'g');

        // Create lookup map for O(1) replacement
        const lookupMap = Object.fromEntries(entries);

        return text.replace(combinedPattern, (match) => lookupMap[match] || match);
    }
};

// ============================================
// LEVELS - Pipeline execution
// ============================================
const Levels = {
    ORDER: ['BLUR', 'ANON', 'NUKE'],

    execute(levelName, text, options = {}) {
        switch (levelName) {
            case 'BLUR':
                return Transform.removeEmptyLines(Transform.blur(text, options));
            case 'ANON':
                return Transform.anon(text, options.anonNumbers || Config.DEFAULT_NUMBER_THRESHOLD);
            case 'NUKE':
                return Transform.nuke(text);
            default:
                return text;
        }
    },

    next(currentIndex) {
        return this.ORDER[currentIndex] || this.ORDER[0];
    },

    count() {
        return this.ORDER.length;
    }
};

// ============================================
// PATTERNS - Minimal backward compatibility
// ============================================
const Patterns = {
    list: () => ['mega_pattern'],
    listGroups: () => ['all'],
    applyGroup: (group, text) => Transform.blur(text)
};
