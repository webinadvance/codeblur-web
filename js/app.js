// CodeBlur Web - Main Application
// Replicates the Python CodeBlur obfuscator functionality

class CodeBlur {
    constructor() {
        // Obfuscation levels
        this.LEVELS = ['BLUR', 'STEALTH', 'PHANTOM', 'ANON'];
        this.currentLevel = 0;

        // Mappings storage
        this.mappings = {};
        this.counters = {
            PERSON: 0,
            ENTITY: 0,
            ORG: 0,
            ITEM: 0,
            NAME: 0,
            ID: 0,
            REF: 0,
            GUID: 0,
            COMMENT: 0,
            BODY: 0,
            PATH: 0,
            FUNC: 0,
            PROP: 0,
            FIELD: 0
        };

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

        // Track original text for percentage calculation
        this.originalText = '';

        // Identifier prefixes for generated names
        this.prefixes = ['PERSON', 'ENTITY', 'ORG', 'ITEM', 'NAME', 'ID', 'REF'];

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

    init() {
        // Load mappings from localStorage
        this.loadMappings();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateMappingCount();
    }

    setupEventListeners() {
        // Main buttons
        document.getElementById('copyCloseBtn').addEventListener('click', () => this.copyAndClose());
        document.getElementById('blurBtn').addEventListener('click', () => this.applyNextLevel());
        document.getElementById('deobfuscateBtn').addEventListener('click', () => this.deobfuscate());
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear());
        document.getElementById('obfuscateStringsBtn').addEventListener('click', () => this.obfuscateStringsOnly());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());

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
            this.saveUndoState();
            // Reset to BLUR level for new content
            this.currentLevel = 0;
            this.updateLevelDisplay();
            // Auto-apply existing mappings after paste
            setTimeout(() => {
                this.applyExistingMappings();
                this.updateObfuscationPercent();
                this.updateHighlighting();
                // Scroll to top
                this.editor.scrollTop = 0;
                this.codeHighlight.scrollTop = 0;
            }, 0);
        });

        // Update percentage and highlighting on input
        this.editor.addEventListener('input', () => {
            this.updateObfuscationPercent();
            this.updateHighlighting();
        });

        // Sync scroll between textarea and highlight div
        this.editor.addEventListener('scroll', () => {
            this.codeHighlight.scrollTop = this.editor.scrollTop;
            this.codeHighlight.scrollLeft = this.editor.scrollLeft;
        });

        // Initial highlighting
        this.updateHighlighting();
    }

    // ============================================
    // LEVEL MANAGEMENT
    // ============================================

    applyNextLevel() {
        // Check if all levels completed
        if (this.currentLevel >= this.LEVELS.length) {
            this.showToast('All levels complete! Paste new code to start over.', 'info');
            return;
        }

        this.saveUndoState();
        const levelName = this.LEVELS[this.currentLevel];

        switch (levelName) {
            case 'BLUR':
                this.obfuscateIdentifiers();
                break;
            case 'STEALTH':
                this.removeComments();
                this.removeEmptyLines();
                break;
            case 'PHANTOM':
                this.obfuscateStrings();
                this.obfuscateGuids();
                this.obfuscatePaths();
                break;
            case 'ANON':
                this.anonymizeMembers();
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
        if (this.currentLevel >= this.LEVELS.length) {
            this.blurBtn.textContent = '0xDEAD';
        } else {
            const nextLevel = this.LEVELS[this.currentLevel];
            this.blurBtn.textContent = nextLevel;
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
        // Check if already mapped
        if (this.mappings[value]) {
            return this.mappings[value];
        }

        // Check reverse mapping
        for (const [orig, mapped] of Object.entries(this.mappings)) {
            if (mapped === value) {
                return mapped;
            }
        }

        // Generate new identifier
        const prefix = this.prefixes[this.counters.PERSON % this.prefixes.length];
        this.counters[prefix] = (this.counters[prefix] || 0) + 1;
        const newId = `${prefix}${String(this.counters[prefix]).padStart(3, '0')}`;

        this.mappings[value] = newId;
        return newId;
    }

    isObfuscatedIdentifier(word) {
        const pattern = /^(PERSON|ENTITY|ORG|ITEM|NAME|ID|REF|GUID|COMMENT|BODY|PATH|FUNC|PROP|FIELD)\d+$/;
        return pattern.test(word);
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

        // Generate new COMMENT identifier
        this.counters.COMMENT++;
        const placeholder = `COMMENT${String(this.counters.COMMENT).padStart(3, '0')}`;
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
            const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
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

        // Standard GUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const guidPattern = /\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?/g;

        text = text.replace(guidPattern, (match) => {
            if (this.mappings[match]) {
                return this.mappings[match];
            }
            this.counters.GUID++;
            const placeholder = `GUID${String(this.counters.GUID).padStart(3, '0')}`;
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
            this.counters.GUID++;
            const placeholder = `GUID${String(this.counters.GUID).padStart(3, '0')}`;
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
        this.counters.PATH++;
        const placeholder = `PATH${String(this.counters.PATH).padStart(3, '0')}`;
        this.mappings[path] = placeholder;
        return placeholder;
    }

    // ============================================
    // LEVEL 4: ANON - Member Anonymization
    // ============================================

    anonymizeMembers() {
        let text = this.editor.value;

        // C# method patterns
        // public void MethodName() or private async Task<T> MethodName()
        const csharpMethodPattern = /\b(public|private|protected|internal|static|virtual|override|abstract|async|sealed|\s)+\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/g;

        text = text.replace(csharpMethodPattern, (match, modifiers, returnType, methodName, offset) => {
            if (this.shouldSkipMethod(methodName)) return match;
            const newName = this.getMethodPlaceholder(methodName);
            return match.replace(methodName + '(', newName + '(');
        });

        // C# property patterns
        // public string PropertyName { get; set; }
        const csharpPropertyPattern = /\b(public|private|protected|internal|static|virtual|override|abstract|\s)+\s+(\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*(\{|=>)/g;

        text = text.replace(csharpPropertyPattern, (match, modifiers, type, propName, bracket) => {
            // Skip if it looks like a method or class
            if (bracket === '(') return match;
            if (this.shouldSkipMethod(propName)) return match;
            const newName = this.getPropertyPlaceholder(propName);
            return match.replace(new RegExp(`\\b${propName}\\s*(\\{|=>)`), `${newName} ${bracket}`);
        });

        // C# field patterns
        // private readonly string _fieldName;
        const csharpFieldPattern = /\b(private|protected|internal|public|static|readonly|const|\s)+\s+(\w+(?:<[^>]+>)?(?:\[\])?)\s+(_?\w+)\s*(;|=)/g;

        text = text.replace(csharpFieldPattern, (match, modifiers, type, fieldName, ending) => {
            if (this.shouldSkipMethod(fieldName)) return match;
            if (fieldName.startsWith('_')) {
                const newName = this.getFieldPlaceholder(fieldName);
                return match.replace(fieldName, newName);
            }
            return match;
        });

        // TypeScript/JavaScript method patterns
        // async methodName() or private methodName()
        const tsMethodPattern = /\b(public|private|protected|static|async|\s)*\s*(\w+)\s*\([^)]*\)\s*(\{|:)/g;

        text = text.replace(tsMethodPattern, (match, modifiers, methodName, bracket) => {
            if (this.shouldSkipMethod(methodName)) return match;
            // Skip constructor
            if (methodName === 'constructor') return match;
            const newName = this.getMethodPlaceholder(methodName);
            return match.replace(new RegExp(`\\b${methodName}\\s*\\(`), `${newName}(`);
        });

        this.editor.value = text;
    }

    shouldSkipMethod(name) {
        return this.skipMethods.has(name.toLowerCase()) ||
            this.isObfuscatedIdentifier(name) ||
            Dictionaries.isKnownWord(name);
    }

    getMethodPlaceholder(name) {
        if (this.mappings[name]) {
            return this.mappings[name];
        }
        this.counters.FUNC++;
        const placeholder = `FUNC${String(this.counters.FUNC).padStart(3, '0')}`;
        this.mappings[name] = placeholder;
        return placeholder;
    }

    getPropertyPlaceholder(name) {
        if (this.mappings[name]) {
            return this.mappings[name];
        }
        this.counters.PROP++;
        const placeholder = `PROP${String(this.counters.PROP).padStart(3, '0')}`;
        this.mappings[name] = placeholder;
        return placeholder;
    }

    getFieldPlaceholder(name) {
        if (this.mappings[name]) {
            return this.mappings[name];
        }
        this.counters.FIELD++;
        const placeholder = `FIELD${String(this.counters.FIELD).padStart(3, '0')}`;
        this.mappings[name] = placeholder;
        return placeholder;
    }

    // ============================================
    // LEVEL 5: SKELETON - Remove Function Bodies
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

        // Sort mappings by obfuscated value length (longest first) to avoid partial replacements
        const sortedMappings = Object.entries(this.mappings)
            .sort((a, b) => b[1].length - a[1].length);

        // Keep replacing until no more changes (handles nested/combined obfuscations)
        let prevText;
        let passes = 0;
        const maxPasses = 10; // Safety limit

        do {
            prevText = text;
            for (const [original, obfuscated] of sortedMappings) {
                // Escape special regex characters in obfuscated string
                const escaped = obfuscated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'g');
                text = text.replace(regex, original);
            }
            passes++;
        } while (text !== prevText && passes < maxPasses);

        this.editor.value = text;
        // Reset to BLUR level
        this.currentLevel = 0;
        this.updateLevelDisplay();
        this.updateObfuscationPercent();
        this.updateHighlighting();
        this.showToast('Text revealed', 'success');
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
            this.clearConfirmPending = false;
            this.clearBtn.textContent = 'CLEAR';
            this.clearBtn.classList.remove('btn-danger');
            this.clearBtn.classList.add('btn-gray-light');
            if (this.clearTimeout) {
                clearTimeout(this.clearTimeout);
                this.clearTimeout = null;
            }
        } else {
            // First click - show confirmation with mapping count
            this.clearConfirmPending = true;
            const count = Object.keys(this.mappings).length;
            this.clearBtn.textContent = `CLEAR ${count}?`;
            this.clearBtn.classList.remove('btn-gray-light');
            this.clearBtn.classList.add('btn-danger');

            // Reset after 3 seconds
            this.clearTimeout = setTimeout(() => {
                this.clearConfirmPending = false;
                this.clearBtn.textContent = 'CLEAR';
                this.clearBtn.classList.remove('btn-danger');
                this.clearBtn.classList.add('btn-gray-light');
            }, 3000);
        }
    }

    clearAll() {
        this.saveUndoState();
        this.mappings = {};
        this.counters = {
            PERSON: 0, ENTITY: 0, ORG: 0, ITEM: 0, NAME: 0, ID: 0, REF: 0,
            GUID: 0, COMMENT: 0, BODY: 0, PATH: 0, FUNC: 0, PROP: 0, FIELD: 0
        };
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
        try {
            await navigator.clipboard.writeText(this.editor.value);
            this.showToast('Copied to clipboard', 'success');
        } catch (err) {
            // Fallback for older browsers
            this.editor.select();
            document.execCommand('copy');
            this.showToast('Copied to clipboard', 'success');
        }
    }

    async copyAndClose() {
        await this.copyToClipboard();
        // In web context, we can't close the window unless we opened it
        // So just show a message
        this.showToast('Copied! You can close this tab.', 'success');
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

        // Count obfuscated tokens in current text
        // Matches each segment: PERSON001, NAME089, ENTITY054, etc.
        const obfuscatedPattern = /(PERSON|ENTITY|ORG|ITEM|NAME|ID|REF|GUID|COMMENT|BODY|PATH|FUNC|PROP|FIELD)\d+/g;
        const obfuscatedMatches = currentText.match(obfuscatedPattern) || [];

        // Count all identifier-like tokens (words with 2+ chars)
        const allIdentifiersPattern = /\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g;
        const allMatches = currentText.match(allIdentifiersPattern) || [];

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

    updateHighlighting() {
        const text = this.editor.value;

        // Escape HTML entities
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Highlight each obfuscated segment (PERSON001, NAME089, ENTITY054, etc.)
        // This catches them even when combined like NAME217NAME091
        const obfuscatedPattern = /(PERSON|ENTITY|ORG|ITEM|NAME|ID|REF|GUID|COMMENT|BODY|PATH|FUNC|PROP|FIELD)\d+/g;
        html = html.replace(obfuscatedPattern, '<span class="obfuscated">$&</span>');

        // Add extra line at end to match textarea behavior
        html += '\n';

        this.codeHighlight.innerHTML = html;
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
