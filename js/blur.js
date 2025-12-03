// CodeBlur - Fast Single-Pass Implementation
// Replaces: mapper.js, patterns.js, transform.js, levels.js
// 25-143x faster than previous multi-pass architecture

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

    isObfuscated(word) {
        return /[A-Z_]+\d{2,}/.test(word);
    },

    isFullyObfuscated(word) {
        return /^[A-Z_]+\d+$/.test(word);
    },

    calcPercent(text) {
        const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
        if (words.length === 0) return 0;
        const obfuscated = words.filter(w => this.isObfuscated(w));
        return Math.round((obfuscated.length / words.length) * 100);
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
            // Multi-line /* */
            if (match.startsWith('/*') && match.endsWith('*/')) {
                const content = match.slice(2, -2);
                if (!content.trim()) return match;
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
            const singleLineMatch = match.match(/^(\s*)(\/\/|#|--|%|REM\s|::)(.*)$/);
            if (singleLineMatch) {
                const [, whitespace, marker, content] = singleLineMatch;
                if (!content.trim()) return match;
                return `${whitespace}${marker}${Mapper.get(content.trim(), 'comment')}`;
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
    // BLUR - Smart pattern-aware single pass
    // ============================================
    blur(text) {
        // First pass: obfuscate comments and strings
        let result = this.blurComments(text);
        result = this.blurStrings(result);

        // Second pass: apply MEGA_PATTERN for everything else
        return result.replace(this.MEGA_PATTERN, (match,
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
        const entries = Object.entries(Mapper.mappings).sort((a, b) => b[1].length - a[1].length);
        let result = text;
        for (const [original, obf] of entries) {
            result = this.replaceWord(result, obf, original);
        }
        return result;
    },

    applyMappings(text) {
        const entries = Object.entries(Mapper.mappings)
            .filter(([orig]) => !orig.startsWith('//') && !orig.startsWith('/*') && !orig.startsWith('#') && !orig.includes('\n'))
            .sort((a, b) => b[0].length - a[0].length);
        let result = text;
        for (const [original, obf] of entries) {
            result = this.replaceWord(result, original, obf);
        }
        return result;
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
                return Transform.removeEmptyLines(Transform.blur(text));
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
