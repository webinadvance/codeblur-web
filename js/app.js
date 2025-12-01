// CodeBlur Web - Main Application
// Replicates the Python CodeBlur obfuscator functionality

class CodeBlur {
    constructor() {
        // Obfuscation levels (simplified: 3 levels)
        this.LEVELS = ['BLUR', 'ANON', 'NUKE'];
        this.currentLevel = 0;

        // Anonymization style presets
        this.STYLE_PRESETS = {
            corporate: {
                prefixes: ['PERSON', 'ENTITY', 'ORG', 'ITEM', 'NAME', 'ID', 'REF'],
                comment: 'COMMENT', guid: 'GUID', path: 'PATH', func: 'FUNC', prop: 'PROP', field: 'FIELD'
            },
            hacker: {
                prefixes: ['X0R', 'H4CK', 'PH1SH', 'CR4CK', 'R00T', 'SH3LL', 'BYT3'],
                comment: 'N0T3', guid: 'H4SH', path: 'L0C', func: 'X3C', prop: 'V4R', field: 'D4T'
            },
            military: {
                prefixes: ['ALPHA', 'BRAVO', 'DELTA', 'ECHO', 'FOXTROT', 'TANGO', 'SIERRA'],
                comment: 'INTEL', guid: 'TARGET', path: 'COORD', func: 'OP', prop: 'ASSET', field: 'RECON'
            },
            minimal: {
                prefixes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
                comment: 'CMT', guid: 'UID', path: 'PTH', func: 'FN', prop: 'P', field: 'F'
            }
        };

        // Current style (default: minimal)
        this.currentStyle = 'minimal';

        // Number obfuscation threshold (0 = never, 3+ = obfuscate numbers with 3+ digits)
        this.numberThreshold = 4;

        // Mappings storage
        this.mappings = {};
        this.counters = {};
        this.initCounters();

        // Undo history
        this.undoStack = [];
        this.maxUndoLevels = 20;

        // Clear button state
        this.clearConfirmPending = false;
        this.clearTimeout = null;

        // DOM elements
        this.editor = document.getElementById('codeEditor');
        this.obfuscationPercent = document.getElementById('obfuscationPercent');
        this.meterFill = document.getElementById('meterFill');
        this.codeHighlight = document.getElementById('codeHighlight');
        this.blurBtn = document.getElementById('blurBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.anonStyleSelect = document.getElementById('anonStyle');
        this.numberThresholdSelect = document.getElementById('numberThreshold');
        this.tokenCount = document.getElementById('tokenCount');
        this.includePromptCheckbox = document.getElementById('includePrompt');

        // Track original text for percentage calculation
        this.originalText = '';

        // Skip list for member anonymization
        this.skipMethods = new Set([
            'tostring', 'gethashcode', 'equals', 'dispose', 'main', 'configure',
            'configureservices', 'createhostbuilder', 'startup', 'program',
            'onmodelcreating', 'savechanges', 'savechangesasync',
            'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'map', 'filter',
            'reduce', 'foreach', 'find', 'findindex', 'some', 'every', 'includes',
            'indexof', 'lastindexof', 'join', 'split', 'concat', 'reverse', 'sort',
            'usestate', 'useeffect', 'usecontext', 'usereducer', 'usecallback',
            'usememo', 'useref', 'uselayouteffect', 'useimperativehandle',
            'if', 'else', 'while', 'for', 'switch', 'case', 'default', 'return',
            'class', 'interface', 'struct', 'enum', 'async', 'await', 'try', 'catch',
            'finally', 'throw', 'new', 'this', 'base', 'super', 'typeof', 'instanceof',
            'constructor', 'render', 'componentdidmount', 'componentwillunmount',
            'shouldcomponentupdate', 'getderivedstatefromprops', 'getsnapshotbeforeupdate',
            'componentdidupdate', 'componentdidcatch', 'getderivedstatefromerror'
        ]);

        this.init();
    }

    initCounters() {
        // Initialize counters for current style
        const style = this.STYLE_PRESETS[this.currentStyle];
        this.counters = {};
        style.prefixes.forEach(p => this.counters[p] = 0);
        this.counters[style.comment] = 0;
        this.counters[style.guid] = 0;
        this.counters[style.path] = 0;
        this.counters[style.func] = 0;
        this.counters[style.prop] = 0;
        this.counters[style.field] = 0;
    }

    getStyle() {
        return this.STYLE_PRESETS[this.currentStyle];
    }

    getPrefixes() {
        return this.getStyle().prefixes;
    }

    init() {
        // Load style from localStorage
        this.loadStyle();

        // Load mappings from localStorage
        this.loadMappings();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateMappingCount();
        this.updateTokenCount();
    }

    loadStyle() {
        const savedStyle = localStorage.getItem('codeblur_style');
        if (savedStyle && this.STYLE_PRESETS[savedStyle]) {
            this.currentStyle = savedStyle;
            this.anonStyleSelect.value = savedStyle;
        }
        this.initCounters();
        this.loadSettings();
    }

    saveStyle() {
        localStorage.setItem('codeblur_style', this.currentStyle);
    }

    loadSettings() {
        const savedThreshold = localStorage.getItem('codeblur_number_threshold');
        if (savedThreshold !== null) {
            this.numberThreshold = parseInt(savedThreshold, 10);
            this.numberThresholdSelect.value = savedThreshold;
        }
    }

    saveSettings() {
        localStorage.setItem('codeblur_number_threshold', this.numberThreshold.toString());
    }

    setupEventListeners() {
        // Main buttons
        document.getElementById('copyCloseBtn').addEventListener('click', () => this.copyAndClose());
        document.getElementById('blurBtn').addEventListener('click', () => this.applyNextLevel());
        document.getElementById('deobfuscateBtn').addEventListener('click', () => this.deobfuscate());
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear());
        document.getElementById('obfuscateStringsBtn').addEventListener('click', () => this.obfuscateStringsOnly());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('askClaudeBtn').addEventListener('click', () => this.askClaude());

        // Style selector
        this.anonStyleSelect.addEventListener('change', (e) => {
            this.currentStyle = e.target.value;
            this.initCounters();
            this.saveStyle();
            this.showToast(`Style: ${this.currentStyle.toUpperCase()}`, 'info');
        });

        // Number threshold selector
        this.numberThresholdSelect.addEventListener('change', (e) => {
            this.numberThreshold = parseInt(e.target.value, 10);
            this.saveSettings();
            const msg = this.numberThreshold === 0 ? 'Numbers: NEVER' : `Numbers: ${this.numberThreshold}+ digits`;
            this.showToast(msg, 'info');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'c' && document.activeElement !== this.editor) {
                e.preventDefault();
                this.copyToClipboard();
            }
        });

        // Paste handler - auto-apply existing mappings to new content
        this.editor.addEventListener('paste', (e) => {
            const wasEmpty = !this.editor.value.trim();
            this.saveUndoState();
            // Reset to BLUR level for new content
            this.currentLevel = 0;
            this.updateLevelDisplay();
            // Auto-apply existing mappings after paste
            setTimeout(() => {
                this.applyExistingMappings();
                this.updateObfuscationPercent();
                this.updateHighlighting();
                // Only scroll to top if pasting into empty editor
                if (wasEmpty) {
                    this.editor.scrollTop = 0;
                    this.codeHighlight.scrollTop = 0;
                }
            }, 0);
        });

        // Update percentage, highlighting, and token count on input
        this.editor.addEventListener('input', (e) => {
            // Auto-obfuscate when user finishes typing a mapped word
            if (e.inputType === 'insertText' && /[\s\.\,\;\:\(\)\{\}\[\]\n]/.test(e.data)) {
                this.autoObfuscateLastWord();
            }
            this.updateObfuscationPercent();
            this.updateHighlighting();
            this.updateTokenCount();
        });

        // Sync scroll between textarea and highlight div
        this.editor.addEventListener('scroll', () => {
            this.codeHighlight.scrollTop = this.editor.scrollTop;
            this.codeHighlight.scrollLeft = this.editor.scrollLeft;
        });

        // Click on highlight div focuses textarea (for non-word clicks)
        this.codeHighlight.addEventListener('click', (e) => {
            if (!e.target.classList.contains('clickable-word')) {
                this.editor.focus();
            }
        });

        // Sync scroll from highlight div to textarea
        this.codeHighlight.addEventListener('scroll', () => {
            this.editor.scrollTop = this.codeHighlight.scrollTop;
            this.editor.scrollLeft = this.codeHighlight.scrollLeft;
        });

        // Double-click on textarea to obfuscate selected word
        this.editor.addEventListener('dblclick', () => {
            const selection = this.editor.value.substring(
                this.editor.selectionStart,
                this.editor.selectionEnd
            ).trim();
            if (selection && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(selection)) {
                this.obfuscateWord(selection);
            }
        });

        // Initial highlighting
        this.updateHighlighting();

        // Click outside clears the clear confirmation state
        document.addEventListener('click', (e) => {
            if (this.clearConfirmPending && !this.clearBtn.contains(e.target)) {
                this.resetClearButton();
            }
        });
    }

    resetClearButton() {
        this.clearConfirmPending = false;
        this.updateMappingCount();
        this.clearBtn.classList.remove('btn-danger');
        this.clearBtn.classList.add('btn-gray-light');
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
            this.clearTimeout = null;
        }
    }

    // ============================================
    // LEVEL MANAGEMENT
    // ============================================

    applyNextLevel() {
        // Loop back to BLUR if all levels completed
        if (this.currentLevel >= this.LEVELS.length) {
            this.currentLevel = 0;
        }

        this.saveUndoState();
        const levelName = this.LEVELS[this.currentLevel];

        switch (levelName) {
            case 'BLUR':
                // Identifiers + comments/empty lines
                this.obfuscateIdentifiers();
                this.removeComments();
                this.removeEmptyLines();
                break;
            case 'ANON':
                // GUIDs/paths/numbers first (specific patterns), then strings (catch-all)
                this.obfuscateGuids();
                this.obfuscatePaths();
                this.obfuscateNumbers();
                this.obfuscateStrings();
                this.anonymizeMembers();
                break;
            case 'NUKE':
                this.nukeCode();
                break;
        }

        // Advance to next level
        this.currentLevel++;
        this.updateLevelDisplay();
        this.saveMappings();
        this.updateMappingCount();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.showToast(`Applied ${levelName} level`, 'success');
    }

    updateLevelDisplay() {
        // Loop display index if past the end
        const displayLevel = this.currentLevel >= this.LEVELS.length ? 0 : this.currentLevel;
        const nextLevel = this.LEVELS[displayLevel];
        this.blurBtn.textContent = nextLevel;

        // NUKE level gets red styling
        if (nextLevel === 'NUKE') {
            this.blurBtn.classList.remove('btn-accent');
            this.blurBtn.classList.add('btn-nuke');
        } else {
            this.blurBtn.classList.remove('btn-nuke');
            this.blurBtn.classList.add('btn-accent');
        }
    }

    // ============================================
    // LEVEL 1: BLUR - Identifier Obfuscation
    // ============================================

    obfuscateIdentifiers() {
        let text = this.editor.value;

        // Find all potential identifiers (excluding inside strings and comments)
        const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        const processed = new Set();
        let match;

        while ((match = identifierPattern.exec(text)) !== null) {
            const identifier = match[1];
            if (processed.has(identifier)) continue;
            processed.add(identifier);

            // Skip if too short
            if (identifier.length < 2) continue;

            // Skip if all uppercase (likely constant)
            if (identifier === identifier.toUpperCase() && identifier.length > 1) continue;

            // Skip if already obfuscated
            if (this.isObfuscatedIdentifier(identifier)) continue;

            // First check if the whole identifier is known (e.g., "EntityFrameworkCore")
            if (Dictionaries.isKnownWord(identifier)) continue;

            // Split into camelCase parts and check
            const parts = this.splitCamelCase(identifier);
            const unknownParts = parts.filter(part => !Dictionaries.isKnownWord(part));

            if (unknownParts.length > 0) {
                // Has unknown parts, obfuscate the unknown portions
                const obfuscatedIdentifier = this.obfuscateIdentifierParts(identifier, parts);
                if (obfuscatedIdentifier !== identifier) {
                    text = this.replaceWholeWord(text, identifier, obfuscatedIdentifier);
                }
            }
        }

        this.editor.value = text;
    }

    splitCamelCase(word) {
        // Split camelCase/PascalCase into parts
        // "getUserById" -> ["get", "User", "By", "Id"]
        const parts = [];
        let current = '';

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const nextChar = word[i + 1];

            if (char === '_') {
                if (current) parts.push(current);
                current = '';
            } else if (i > 0 && /[A-Z]/.test(char)) {
                // Check if this starts a new word
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
    }

    obfuscateIdentifierParts(original, parts) {
        // Reconstruct identifier with unknown parts obfuscated
        let result = '';
        let isFirst = true;

        for (const part of parts) {
            if (Dictionaries.isKnownWord(part)) {
                result += isFirst ? part : part;
            } else {
                // Generate or get existing mapping for this part
                const obfuscated = this.getOrCreateMapping(part);
                result += obfuscated;
            }
            isFirst = false;
        }

        // Store full mapping
        if (result !== original && !this.mappings[original]) {
            this.mappings[original] = result;
        }

        return result;
    }

    getOrCreateMapping(value) {
        // Check if already mapped as a KEY
        if (this.mappings[value]) {
            return this.mappings[value];
        }

        // Generate new identifier using current style
        const prefixes = this.getPrefixes();
        const totalMappings = Object.keys(this.mappings).length;
        const prefix = prefixes[totalMappings % prefixes.length];
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const newId = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;

        this.mappings[value] = newId;
        return newId;
    }

    isObfuscatedIdentifier(word) {
        // Build pattern from all style prefixes
        const allPrefixes = new Set();
        Object.values(this.STYLE_PRESETS).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.add(p));
            allPrefixes.add(style.comment);
            allPrefixes.add(style.guid);
            allPrefixes.add(style.path);
            allPrefixes.add(style.func);
            allPrefixes.add(style.prop);
            allPrefixes.add(style.field);
        });
        const prefixPattern = Array.from(allPrefixes).join('|');
        const pattern = new RegExp(`^(${prefixPattern})\\d+$`);
        return pattern.test(word);
    }

    containsObfuscatedPart(word) {
        // Check if word contains any obfuscated value from our mappings
        for (const obfuscated of Object.values(this.mappings)) {
            if (word.includes(obfuscated) && word !== obfuscated) {
                return true;
            }
        }

        // Also check against obfuscation pattern directly (PREFIX + digits)
        // This catches cases where mapping might be structured differently
        const allPrefixes = new Set();
        Object.values(this.STYLE_PRESETS).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.add(p));
            allPrefixes.add(style.comment);
            allPrefixes.add(style.guid);
            allPrefixes.add(style.path);
            allPrefixes.add(style.func);
            allPrefixes.add(style.prop);
            allPrefixes.add(style.field);
        });

        // Sort by length (longest first) to match longer prefixes first
        const sortedPrefixes = Array.from(allPrefixes).sort((a, b) => b.length - a.length);

        for (const prefix of sortedPrefixes) {
            // Check if word contains PREFIX followed by digits (like A001, PERSON001)
            const pattern = new RegExp(`${prefix}\\d{2,}`);
            if (pattern.test(word) && !this.isObfuscatedIdentifier(word)) {
                return true;
            }
        }

        return false;
    }

    replaceWholeWord(text, search, replace) {
        // Replace whole word only (not partial matches)
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'g');
        return text.replace(regex, replace);
    }

    // ============================================
    // LEVEL 2: STEALTH - Comments & Empty Lines
    // ============================================

    removeComments() {
        let text = this.editor.value;

        // Multi-line comments /* */
        text = text.replace(/\/\*([\s\S]*?)\*\//g, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `/* ${placeholder} */`;
        });

        // C# XML doc comments ///
        text = text.replace(/\/\/\/(.*)$/gm, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `/// ${placeholder}`;
        });

        // Single-line comments //
        text = text.replace(/\/\/(?!\/)(.*)$/gm, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `// ${placeholder}`;
        });

        // Python/Shell comments #
        text = text.replace(/(?<!['"])#(?!['"])(.*)$/gm, (match, content) => {
            // Skip if inside a string or looks like a hex color
            if (match.match(/^#[0-9a-fA-F]{3,8}$/)) return match;
            const placeholder = this.getCommentPlaceholder(content);
            return `# ${placeholder}`;
        });

        // SQL comments --
        text = text.replace(/--(?!\[)(.*)$/gm, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `-- ${placeholder}`;
        });

        // HTML comments <!-- -->
        text = text.replace(/<!--([\s\S]*?)-->/g, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `<!-- ${placeholder} -->`;
        });

        // Lua multi-line comments --[[ ]]
        text = text.replace(/--\[\[([\s\S]*?)\]\]/g, (match, content) => {
            const placeholder = this.getCommentPlaceholder(content);
            return `--[[ ${placeholder} ]]`;
        });

        // VB comments '
        text = text.replace(/'(?![^']*')(.*)$/gm, (match, content) => {
            // Skip if it looks like a string
            if (match.startsWith("''")) return match;
            const placeholder = this.getCommentPlaceholder(content);
            return `' ${placeholder}`;
        });

        this.editor.value = text;
    }

    getCommentPlaceholder(content) {
        // Check if already mapped (store only the content, not the prefix)
        const trimmed = content.trim();
        if (!trimmed) return ''; // Empty comment

        if (this.mappings[trimmed]) {
            return this.mappings[trimmed];
        }

        // Generate new comment identifier using current style
        const prefix = this.getStyle().comment;
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const placeholder = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
        this.mappings[trimmed] = placeholder;
        return placeholder;
    }

    removeEmptyLines() {
        let text = this.editor.value;
        // Remove lines that are only whitespace
        text = text.replace(/^\s*[\r\n]/gm, '\n');
        // Collapse multiple blank lines into one
        text = text.replace(/\n{3,}/g, '\n\n');
        // Remove trailing empty lines
        text = text.replace(/\n+$/, '\n');
        this.editor.value = text;
    }

    removeCommentsOnly() {
        this.saveUndoState();
        this.removeComments();
        this.saveMappings();
        this.updateMappingCount();
        this.showToast('Comments removed', 'success');
    }

    // ============================================
    // LEVEL 3: PHANTOM - Strings, GUIDs, Paths
    // ============================================

    obfuscateStrings() {
        let text = this.editor.value;

        // Double-quoted strings
        text = text.replace(/"([^"\\]|\\.)*"/g, (match) => {
            return this.obfuscateStringContent(match, '"');
        });

        // Single-quoted strings (skip if looks like char literal)
        text = text.replace(/'([^'\\]|\\.)*'/g, (match) => {
            if (match.length <= 4) return match; // Likely a char literal
            return this.obfuscateStringContent(match, "'");
        });

        this.editor.value = text;
    }

    obfuscateStringContent(match, quote) {
        const content = match.slice(1, -1);

        // Skip empty strings
        if (!content || content.trim() === '') return match;

        // Skip strings with interpolation
        if (content.includes('{') && content.includes('}')) return match;

        // Skip if already obfuscated
        if (this.isObfuscatedIdentifier(content)) return match;

        // Get or create mapping
        let obfuscated;
        if (this.mappings[content]) {
            obfuscated = this.mappings[content];
        } else {
            const prefixes = this.getPrefixes();
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            this.counters[prefix] = (this.counters[prefix] || 0) + 1;
            obfuscated = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
            this.mappings[content] = obfuscated;
        }

        return `${quote}${obfuscated}${quote}`;
    }

    obfuscateStringsOnly() {
        this.saveUndoState();
        this.obfuscateStrings();
        this.saveMappings();
        this.updateMappingCount();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.showToast('Strings obfuscated', 'success');
    }

    obfuscateGuids() {
        let text = this.editor.value;
        const prefix = this.getStyle().guid;

        // Standard GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const guidPattern = /\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?/g;

        text = text.replace(guidPattern, (match) => {
            if (this.mappings[match]) {
                return this.mappings[match];
            }
            this.counters[prefix] = (this.counters[prefix] || 0) + 1;
            const placeholder = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
            this.mappings[match] = placeholder;
            return placeholder;
        });

        // Also match 32 hex chars without dashes
        const hexPattern = /\b[0-9a-fA-F]{32}\b/g;
        text = text.replace(hexPattern, (match) => {
            // Skip if it looks like other hex data
            if (match.startsWith('0x')) return match;
            if (this.mappings[match]) {
                return this.mappings[match];
            }
            this.counters[prefix] = (this.counters[prefix] || 0) + 1;
            const placeholder = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
            this.mappings[match] = placeholder;
            return placeholder;
        });

        this.editor.value = text;
    }

    obfuscatePaths() {
        let text = this.editor.value;

        // URL patterns
        const urlPattern = /(https?|ftp|file|ws|wss):\/\/[^\s"'<>]+/g;
        text = text.replace(urlPattern, (match) => {
            return this.getPathPlaceholder(match);
        });

        // Windows paths: C:\path\to\file
        const windowsPathPattern = /[A-Za-z]:\\[^\s"'<>:*?|]+/g;
        text = text.replace(windowsPathPattern, (match) => {
            return this.getPathPlaceholder(match);
        });

        // UNC paths: \\server\share
        const uncPathPattern = /\\\\[^\s"'<>]+/g;
        text = text.replace(uncPathPattern, (match) => {
            return this.getPathPlaceholder(match);
        });

        // Unix absolute paths: /usr/local/bin
        const unixPathPattern = /(?<![a-zA-Z0-9])\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+/g;
        text = text.replace(unixPathPattern, (match) => {
            // Skip API routes that are short
            if (match.split('/').length <= 3) return match;
            return this.getPathPlaceholder(match);
        });

        this.editor.value = text;
    }

    getPathPlaceholder(path) {
        if (this.mappings[path]) {
            return this.mappings[path];
        }
        const prefix = this.getStyle().path;
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const placeholder = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
        this.mappings[path] = placeholder;
        return placeholder;
    }

    obfuscateNumbers() {
        // Skip if threshold is 0 (never obfuscate numbers)
        if (this.numberThreshold === 0) return;

        let text = this.editor.value;

        // Match numbers with threshold+ digits (integers and decimals)
        // Avoid matching numbers that are part of identifiers (like A001)
        const numberPattern = new RegExp(
            `(?<![a-zA-Z_])\\b(\\d{${this.numberThreshold},}(?:\\.\\d+)?)\\b(?![a-zA-Z_])`,
            'g'
        );

        text = text.replace(numberPattern, (match, num) => {
            return this.getNumberPlaceholder(num);
        });

        this.editor.value = text;
    }

    getNumberPlaceholder(num) {
        if (this.mappings[num]) {
            return this.mappings[num];
        }
        // Use 'NUM' prefix for numbers
        const prefix = 'NUM';
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const placeholder = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;
        this.mappings[num] = placeholder;
        return placeholder;
    }

    // ============================================
    // LEVEL 4: ANON - Obfuscate All Composite Identifiers
    // ============================================

    // Expand obfuscated parts in a word back to their originals
    // e.g., "A001Manager" -> "UserManager" (if User -> A001 exists)
    expandToOriginal(word) {
        // Build reverse mapping: obfuscated -> original
        const reverseMap = {};
        for (const [original, obfuscated] of Object.entries(this.mappings)) {
            reverseMap[obfuscated] = original;
        }

        // Sort by length (longest first) to avoid partial matches
        const sortedObfuscated = Object.keys(reverseMap).sort((a, b) => b.length - a.length);

        let expanded = word;
        for (const obfuscated of sortedObfuscated) {
            if (expanded.includes(obfuscated)) {
                expanded = expanded.split(obfuscated).join(reverseMap[obfuscated]);
            }
        }
        return expanded;
    }

    anonymizeMembers() {
        let text = this.editor.value;

        // Get all unique words in text
        const words = [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];

        // Build pattern to detect obfuscated parts (PREFIX + 2+ digits)
        const allPrefixes = [];
        Object.values(this.STYLE_PRESETS).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.push(p));
            allPrefixes.push(style.comment, style.guid, style.path, style.func, style.prop, style.field);
        });
        // Sort longest first
        allPrefixes.sort((a, b) => b.length - a.length);
        const obfuscatedPattern = new RegExp(`(${allPrefixes.join('|')})\\d{2,}`);

        // Find composites: words containing obfuscated pattern but NOT fully obfuscated
        const composites = words.filter(word => {
            if (this.isObfuscatedIdentifier(word)) return false; // skip pure A001, PERSON001
            return obfuscatedPattern.test(word); // contains A001, D001, etc.
        });

        // Sort by length (longest first) and replace all
        composites.sort((a, b) => b.length - a.length);
        for (const word of composites) {
            // IMPORTANT: Expand to original form before storing mapping
            // e.g., "A001Manager" -> store "UserManager" -> "B001"
            // This ensures reveal works in one pass without nested lookups
            const expandedOriginal = this.expandToOriginal(word);
            const placeholder = this.getOrCreateMapping(expandedOriginal);
            text = this.replaceWholeWord(text, word, placeholder);
        }

        this.editor.value = text;
    }

    // ============================================
    // LEVEL 5: NUKE - Total Obfuscation
    // ============================================

    nukeCode() {
        let text = this.editor.value;

        // 1. Obfuscate ALL remaining identifiers (including known words)
        const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/g;
        const processed = new Set();
        let match;

        // Collect all identifiers first
        const identifiers = [];
        while ((match = identifierPattern.exec(text)) !== null) {
            const identifier = match[1];
            if (!processed.has(identifier)) {
                processed.add(identifier);
                identifiers.push(identifier);
            }
        }

        // Sort by length (longest first) to avoid partial replacements
        identifiers.sort((a, b) => b.length - a.length);

        // Keywords to preserve
        const keywords = new Set([
            'if', 'else', 'while', 'for', 'switch', 'case', 'default', 'return',
            'class', 'interface', 'struct', 'enum', 'async', 'await', 'try', 'catch',
            'finally', 'throw', 'new', 'this', 'base', 'super', 'typeof', 'instanceof',
            'public', 'private', 'protected', 'static', 'readonly', 'const', 'let', 'var',
            'function', 'void', 'null', 'undefined', 'true', 'false', 'import', 'export',
            'from', 'extends', 'implements', 'constructor', 'get', 'set', 'yield',
            'break', 'continue', 'delete', 'in', 'of', 'with', 'debugger',
            'int', 'string', 'bool', 'float', 'double', 'long', 'short', 'byte', 'char',
            'boolean', 'number', 'object', 'any', 'never', 'unknown', 'symbol', 'bigint'
        ]);

        for (const identifier of identifiers) {
            // Skip if already obfuscated or is a keyword
            if (this.isObfuscatedIdentifier(identifier)) continue;
            if (keywords.has(identifier.toLowerCase())) continue;
            if (identifier.length < 3) continue;

            // Get or create mapping
            const obfuscated = this.getOrCreateMapping(identifier);
            text = this.replaceWholeWord(text, identifier, obfuscated);
        }

        this.editor.value = text;
    }

    // ============================================
    // LEVEL 6: SKELETON - Remove Function Bodies
    // ============================================

    removeFunctionBodies() {
        let text = this.editor.value;

        // Find function/method declarations and remove their bodies
        const lines = text.split('\n');
        const result = [];
        let braceDepth = 0;
        let inFunctionBody = false;
        let functionStartLine = -1;
        let bodyCounter = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Check if this line starts a function body
            if (!inFunctionBody && this.isFunctionSignatureLine(trimmed)) {
                if (trimmed.includes('{')) {
                    // Function with opening brace on same line
                    const openBraceIndex = line.indexOf('{');
                    bodyCounter++;
                    const placeholder = `BODY${String(bodyCounter).padStart(3, '0')}`;

                    // Store the body content if we can find it
                    const bodyContent = this.extractFunctionBody(lines, i);
                    if (bodyContent) {
                        this.mappings[placeholder] = bodyContent;
                    }

                    result.push(line.substring(0, openBraceIndex + 1) + ` ${placeholder} }`);

                    // Skip the body
                    braceDepth = 1;
                    for (let j = openBraceIndex + 1; j < line.length; j++) {
                        if (line[j] === '{') braceDepth++;
                        if (line[j] === '}') braceDepth--;
                    }

                    if (braceDepth > 0) {
                        inFunctionBody = true;
                        functionStartLine = i;
                    }
                } else {
                    result.push(line);
                }
            } else if (inFunctionBody) {
                // Count braces
                for (const char of line) {
                    if (char === '{') braceDepth++;
                    if (char === '}') braceDepth--;
                }

                if (braceDepth <= 0) {
                    inFunctionBody = false;
                    // Don't add the closing brace line as we already added it
                }
                // Skip body lines
            } else {
                result.push(line);
            }
        }

        this.editor.value = result.join('\n');
    }

    isFunctionSignatureLine(line) {
        // Check if line looks like a function/method signature
        const patterns = [
            // C# method: public void Method() {
            /\b(public|private|protected|internal|static|async|virtual|override|abstract)\b.*\w+\s*\([^)]*\)\s*\{?$/,
            // TypeScript/JavaScript function
            /\b(function|async\s+function)\s+\w+\s*\([^)]*\)\s*\{?$/,
            // Arrow function assigned
            /\b(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>\s*\{?$/,
            // Class method
            /^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{?$/
        ];

        // Skip control structures
        const skipPatterns = [
            /^\s*(if|else|while|for|foreach|switch|try|catch|finally|do|using|lock)\b/,
            /^\s*(class|interface|struct|enum|namespace)\b/
        ];

        for (const skip of skipPatterns) {
            if (skip.test(line)) return false;
        }

        for (const pattern of patterns) {
            if (pattern.test(line)) return true;
        }

        return false;
    }

    extractFunctionBody(lines, startIndex) {
        let braceDepth = 0;
        let started = false;
        let body = [];

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') {
                    braceDepth++;
                    started = true;
                }
                if (char === '}') {
                    braceDepth--;
                    if (started && braceDepth === 0) {
                        return body.join('\n');
                    }
                }
            }
            if (started && i > startIndex) {
                body.push(line);
            }
        }

        return body.join('\n');
    }

    // ============================================
    // AUTO-APPLY EXISTING MAPPINGS
    // ============================================

    applyExistingMappings() {
        if (Object.keys(this.mappings).length === 0) return;

        let text = this.editor.value;

        // Apply existing mappings to new text
        // Sort by length (longest first) to avoid partial replacements
        const sortedMappings = Object.entries(this.mappings)
            .sort((a, b) => b[0].length - a[0].length);

        for (const [original, obfuscated] of sortedMappings) {
            // Skip if this is a comment, body, or other non-identifier mapping
            if (original.startsWith('//') || original.startsWith('/*') ||
                original.startsWith('#') || original.startsWith('--') ||
                original.includes('\n')) {
                continue;
            }
            text = this.replaceWholeWord(text, original, obfuscated);
        }

        this.editor.value = text;
        this.updateMappingCount();
    }

    // ============================================
    // DEOBFUSCATION
    // ============================================

    deobfuscate() {
        this.saveUndoState();
        let text = this.editor.value;
        const originalText = text;

        // Sort mappings by obfuscated value length (longest first) to avoid partial replacements
        const sortedMappings = Object.entries(this.mappings)
            .sort((a, b) => b[1].length - a[1].length);

        // Single pass - apply all mappings once per click
        for (const [original, obfuscated] of sortedMappings) {
            const escaped = obfuscated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'g');
            text = text.replace(regex, original);
        }

        this.editor.value = text;
        const percent = this.calculateObfuscationPercent();

        if (text === originalText) {
            this.showToast('Nothing to reveal', 'info');
            return;
        }

        // Reset to BLUR level
        this.currentLevel = 0;
        this.updateLevelDisplay();
        this.updateObfuscationPercent();
        this.updateHighlighting();

        if (percent > 0) {
            this.showToast(`Revealed (${percent}% remaining - click again)`, 'success');
        } else {
            this.showToast('Text revealed', 'success');
        }
    }

    // ============================================
    // UNDO SYSTEM
    // ============================================

    saveUndoState() {
        this.undoStack.push({
            text: this.editor.value,
            mappings: JSON.parse(JSON.stringify(this.mappings)),
            counters: JSON.parse(JSON.stringify(this.counters)),
            level: this.currentLevel
        });

        // Limit undo stack size
        if (this.undoStack.length > this.maxUndoLevels) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.showToast('Nothing to undo', 'error');
            return;
        }

        const state = this.undoStack.pop();
        this.editor.value = state.text;
        this.mappings = state.mappings;
        this.counters = state.counters;
        this.currentLevel = state.level;

        this.updateLevelDisplay();
        this.updateMappingCount();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.saveMappings();
        this.showToast('Undo successful', 'success');
    }

    // ============================================
    // CLEAR FUNCTIONALITY
    // ============================================

    handleClear() {
        if (this.clearConfirmPending) {
            // Second click - actually clear
            this.clearAll();
            this.resetClearButton();
        } else {
            // First click - show confirmation with mapping count
            this.clearConfirmPending = true;
            const count = Object.keys(this.mappings).length;
            this.clearBtn.textContent = `CLEAR ${count}?`;
            this.clearBtn.classList.remove('btn-gray-light');
            this.clearBtn.classList.add('btn-danger');

            // Reset after 3 seconds
            this.clearTimeout = setTimeout(() => {
                this.resetClearButton();
            }, 3000);
        }
    }

    clearAll() {
        this.saveUndoState();
        this.mappings = {};
        this.initCounters();
        this.currentLevel = 0;
        this.editor.value = '';
        this.updateLevelDisplay();
        this.saveMappings();
        this.updateMappingCount();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.showToast('All cleared', 'success');
    }

    // ============================================
    // CLIPBOARD & COPY
    // ============================================

    async copyToClipboard() {
        let textToCopy = this.editor.value;

        // Prepend obfuscation notice if checkbox is checked
        if (this.includePromptCheckbox && this.includePromptCheckbox.checked) {
            const obfuscationNotice = `/*
 * THIS CODE HAS BEEN OBFUSCATED
 * Variable names, strings, and identifiers have been anonymized.
 * Treat all placeholder names as-is - do not attempt to guess or restore original names.
 */

`;
            textToCopy = obfuscationNotice + textToCopy;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast('Copied to clipboard', 'success');
        } catch (err) {
            // Fallback for older browsers
            const tempTextarea = document.createElement('textarea');
            tempTextarea.value = textToCopy;
            document.body.appendChild(tempTextarea);
            tempTextarea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextarea);
            this.showToast('Copied to clipboard', 'success');
        }
    }

    async copyAndClose() {
        await this.copyToClipboard();
        // In web context, we can't close the window unless we opened it
        // So just show a message
        this.showToast('Copied! You can close this tab.', 'success');
    }

    autoObfuscateLastWord() {
        if (Object.keys(this.mappings).length === 0) return;

        const cursorPos = this.editor.selectionStart;
        const text = this.editor.value;

        // Find the word before the cursor (before the delimiter that was just typed)
        const beforeCursor = text.substring(0, cursorPos - 1);
        const wordMatch = beforeCursor.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);

        if (!wordMatch) return;

        const word = wordMatch[1];
        const wordStart = beforeCursor.length - word.length;

        // Check if this word has a mapping (case insensitive)
        const wordLower = word.toLowerCase();
        let obfuscated = null;

        for (const [original, mapped] of Object.entries(this.mappings)) {
            if (original.toLowerCase() === wordLower) {
                obfuscated = mapped;
                break;
            }
        }

        if (obfuscated) {
            const before = text.substring(0, wordStart);
            const after = text.substring(cursorPos - 1);

            this.editor.value = before + obfuscated + after;

            // Restore cursor position (adjusted for length difference)
            const newCursorPos = wordStart + obfuscated.length + 1;
            this.editor.selectionStart = newCursorPos;
            this.editor.selectionEnd = newCursorPos;
        }
    }

    getCodeWithInstructions() {
        let code = this.editor.value;
        if (!code || code.trim() === '') {
            return null;
        }

        // Prepend instructions if checkbox is checked
        if (this.includePromptCheckbox && this.includePromptCheckbox.checked) {
            const obfuscationNotice = `/*
 * THIS CODE HAS BEEN OBFUSCATED
 * Variable names, strings, and identifiers have been anonymized.
 * Treat all placeholder names as-is - do not attempt to guess or restore original names.
 */

`;
            code = obfuscationNotice + code;
        }

        return code;
    }

    askClaude() {
        const code = this.getCodeWithInstructions();
        if (!code) {
            this.showToast('No code to send', 'error');
            return;
        }

        const encodedCode = encodeURIComponent(code);
        const claudeUrl = `https://claude.ai/new?q=${encodedCode}`;
        window.open(claudeUrl, '_blank');
        this.showToast('Opening Claude...', 'success');
    }

    // ============================================
    // PERSISTENCE
    // ============================================

    saveMappings() {
        const data = {
            mappings: this.mappings,
            counters: this.counters
        };
        localStorage.setItem('codeblur_mappings', JSON.stringify(data));
    }

    loadMappings() {
        try {
            const stored = localStorage.getItem('codeblur_mappings');
            if (stored) {
                const data = JSON.parse(stored);
                this.mappings = data.mappings || {};
                this.counters = data.counters || this.counters;
            }
        } catch (e) {
            console.error('Failed to load mappings:', e);
        }
    }

    // ============================================
    // UI UPDATES
    // ============================================

    updateMappingCount() {
        const count = Object.keys(this.mappings).length;
        // Update clear button with count (if not in confirm state)
        if (!this.clearConfirmPending) {
            this.clearBtn.textContent = `CLEAR (${count})`;
        }
    }

    calculateObfuscationPercent() {
        const currentText = this.editor.value;

        // If no text, return 0
        if (!currentText || currentText.trim() === '') {
            return 0;
        }

        // Keywords to exclude from counting (not real identifiers)
        const keywords = new Set([
            'if', 'else', 'while', 'for', 'switch', 'case', 'default', 'return',
            'class', 'interface', 'struct', 'enum', 'async', 'await', 'try', 'catch',
            'finally', 'throw', 'new', 'this', 'base', 'super', 'typeof', 'instanceof',
            'public', 'private', 'protected', 'static', 'readonly', 'const', 'let', 'var',
            'function', 'void', 'null', 'undefined', 'true', 'false', 'import', 'export',
            'from', 'extends', 'implements', 'constructor', 'get', 'set', 'yield',
            'break', 'continue', 'delete', 'in', 'of', 'with', 'debugger', 'using',
            'int', 'string', 'bool', 'float', 'double', 'long', 'short', 'byte', 'char',
            'boolean', 'number', 'object', 'any', 'never', 'unknown', 'symbol', 'bigint',
            'virtual', 'override', 'abstract', 'sealed', 'partial', 'internal', 'extern',
            'namespace', 'package', 'def', 'self', 'lambda', 'pass', 'raise', 'except',
            'elif', 'None', 'True', 'False', 'and', 'or', 'not', 'is', 'as', 'with',
            'global', 'nonlocal', 'assert', 'print', 'input', 'range', 'len', 'type',
            'Task', 'List', 'Dictionary', 'Array', 'String', 'Object', 'Console'
        ]);

        // Build pattern from all style prefixes
        const allPrefixes = new Set();
        Object.values(this.STYLE_PRESETS).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.add(p));
            allPrefixes.add(style.comment);
            allPrefixes.add(style.guid);
            allPrefixes.add(style.path);
            allPrefixes.add(style.func);
            allPrefixes.add(style.prop);
            allPrefixes.add(style.field);
        });
        const prefixPattern = Array.from(allPrefixes).join('|');
        const obfuscatedPattern = new RegExp(`(${prefixPattern})\\d+`, 'g');
        const obfuscatedMatches = currentText.match(obfuscatedPattern) || [];

        // Count all identifier-like tokens (words with 2+ chars), excluding keywords
        const allIdentifiersPattern = /\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g;
        const allMatchesRaw = currentText.match(allIdentifiersPattern) || [];

        // Filter out keywords - only count actual code identifiers
        const allMatches = allMatchesRaw.filter(word => !keywords.has(word));

        if (allMatches.length === 0) {
            return 0;
        }

        // Calculate percentage based on ratio of obfuscated tokens
        const percent = Math.round((obfuscatedMatches.length / allMatches.length) * 100);
        return Math.min(percent, 100); // Cap at 100%
    }

    updateObfuscationPercent() {
        const percent = this.calculateObfuscationPercent();
        this.obfuscationPercent.textContent = `${percent}%`;
        this.meterFill.style.width = `${percent}%`;
    }

    countTokens(text) {
        // LLM-style token counting approximation
        // Based on GPT tokenization patterns (roughly 4 chars per token on average)
        if (!text || text.trim() === '') {
            return 0;
        }

        let tokens = 0;

        // Split into chunks: words, numbers, punctuation, whitespace
        const chunks = text.match(/\s+|[a-zA-Z_][a-zA-Z0-9_]*|\d+\.?\d*|[^\s\w]/g) || [];

        for (const chunk of chunks) {
            if (/^\s+$/.test(chunk)) {
                // Whitespace: count newlines and spaces separately
                const newlines = (chunk.match(/\n/g) || []).length;
                tokens += newlines; // Each newline is typically a token
                // Spaces between words are usually merged with next token
            } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(chunk)) {
                // Words: roughly 1 token per 4 characters, minimum 1
                // Common short words (the, is, a, to) are 1 token
                // Longer words get split into subwords
                if (chunk.length <= 4) {
                    tokens += 1;
                } else if (chunk.length <= 8) {
                    tokens += 2;
                } else if (chunk.length <= 12) {
                    tokens += 3;
                } else {
                    tokens += Math.ceil(chunk.length / 4);
                }
            } else if (/^\d+\.?\d*$/.test(chunk)) {
                // Numbers: each digit or small number is roughly 1 token
                tokens += Math.ceil(chunk.length / 2);
            } else {
                // Punctuation and special chars: usually 1 token each
                tokens += 1;
            }
        }

        return tokens;
    }

    updateTokenCount() {
        const text = this.editor.value;
        const tokens = this.countTokens(text);
        this.tokenCount.textContent = tokens.toLocaleString();
    }

    updateHighlighting() {
        const text = this.editor.value;

        // Escape HTML entities
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Build pattern from all style prefixes
        const allPrefixes = new Set();
        Object.values(this.STYLE_PRESETS).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.add(p));
            allPrefixes.add(style.comment);
            allPrefixes.add(style.guid);
            allPrefixes.add(style.path);
            allPrefixes.add(style.func);
            allPrefixes.add(style.prop);
            allPrefixes.add(style.field);
        });
        const prefixPattern = Array.from(allPrefixes).join('|');
        const obfuscatedPattern = new RegExp(`(${prefixPattern})\\d+`, 'g');

        // Wrap identifiers as clickable spans (before adding obfuscated spans)
        // Match word boundaries but skip HTML entities like &lt; &gt; &amp;
        html = html.replace(/\b([a-zA-Z_][a-zA-Z0-9_]{1,})\b/g, (match, word) => {
            // Skip HTML entity parts
            if (['lt', 'gt', 'amp', 'quot', 'nbsp'].includes(word)) {
                return match;
            }
            // Skip if it's an obfuscated identifier
            if (obfuscatedPattern.test(word)) {
                obfuscatedPattern.lastIndex = 0;
                return `<span class="obfuscated">${word}</span>`;
            }
            return `<span class="clickable-word" data-word="${word}">${word}</span>`;
        });

        // Add extra line at end to match textarea behavior
        html += '\n';

        this.codeHighlight.innerHTML = html;

        // Add click handlers to clickable words
        this.codeHighlight.querySelectorAll('.clickable-word').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                this.obfuscateWord(span.dataset.word);
            });
        });
    }

    obfuscateWord(word) {
        if (!word || word.length < 2) return;

        // Skip if already obfuscated
        if (this.isObfuscatedIdentifier(word)) return;

        // Skip if it's a known word (optional - remove if you want to obfuscate anything)
        // if (Dictionaries.isKnownWord(word)) return;

        this.saveUndoState();

        // Get or create mapping for this word
        const obfuscated = this.getOrCreateMapping(word);

        // Replace all occurrences in the editor
        let text = this.editor.value;
        text = this.replaceWholeWord(text, word, obfuscated);
        this.editor.value = text;

        this.saveMappings();
        this.updateMappingCount();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.showToast(`${word} → ${obfuscated}`, 'success');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dictionaries to load
    const initApp = () => {
        if (Dictionaries.loaded) {
            window.codeBlur = new CodeBlur();
        } else {
            setTimeout(initApp, 100);
        }
    };
    initApp();
});
