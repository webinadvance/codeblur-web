// CodeBlur Web - Dictionaries Module
// Loads and manages known words from JSON files

const Dictionaries = {
    knownWords: new Set(),
    brandWords: new Set(),
    packageWords: new Set(),
    allKnownWords: new Set(),
    loaded: false,

    async load() {
        if (this.loaded) return;

        try {
            // Load all dictionary files
            const [knownResponse, brandResponse, packageResponse] = await Promise.all([
                fetch('js/known_words.json'),
                fetch('js/brand_words.json'),
                fetch('js/package_words.json')
            ]);

            const known = await knownResponse.json();
            const brands = await brandResponse.json();
            const packages = await packageResponse.json();

            // Populate sets (case-insensitive by storing lowercase)
            known.forEach(word => {
                this.knownWords.add(word.toLowerCase());
                this.allKnownWords.add(word.toLowerCase());
            });

            brands.forEach(word => {
                this.brandWords.add(word.toLowerCase());
                this.allKnownWords.add(word.toLowerCase());
            });

            packages.forEach(word => {
                this.packageWords.add(word.toLowerCase());
                this.allKnownWords.add(word.toLowerCase());
            });

            this.loaded = true;
            console.log(`Dictionaries loaded: ${this.allKnownWords.size} total words`);
        } catch (error) {
            console.error('Failed to load dictionaries:', error);
            // Fallback to embedded minimal dictionary
            this.loadFallbackDictionary();
        }
    },

    loadFallbackDictionary() {
        // Minimal fallback dictionary with common programming terms
        const fallbackWords = [
            // Common verbs
            'get', 'set', 'is', 'has', 'can', 'add', 'remove', 'create', 'delete', 'update',
            'fetch', 'load', 'save', 'find', 'search', 'filter', 'map', 'reduce', 'sort',
            'validate', 'parse', 'format', 'convert', 'transform', 'build', 'make', 'do',
            'run', 'execute', 'start', 'stop', 'init', 'initialize', 'setup', 'configure',
            'handle', 'process', 'send', 'receive', 'read', 'write', 'open', 'close',
            'connect', 'disconnect', 'subscribe', 'unsubscribe', 'publish', 'emit',
            'render', 'display', 'show', 'hide', 'enable', 'disable', 'toggle',
            'check', 'verify', 'assert', 'test', 'mock', 'spy', 'stub',

            // Common nouns
            'data', 'value', 'result', 'response', 'request', 'error', 'message',
            'item', 'element', 'node', 'list', 'array', 'object', 'string', 'number',
            'boolean', 'function', 'method', 'class', 'interface', 'type', 'enum',
            'event', 'handler', 'listener', 'callback', 'promise', 'observable',
            'state', 'props', 'context', 'store', 'reducer', 'action', 'dispatch',
            'component', 'module', 'service', 'controller', 'model', 'view',
            'config', 'options', 'settings', 'params', 'args', 'arguments',
            'path', 'url', 'route', 'endpoint', 'api', 'http', 'https',
            'file', 'folder', 'directory', 'stream', 'buffer', 'reader', 'writer',
            'input', 'output', 'source', 'target', 'destination', 'origin',
            'key', 'id', 'name', 'title', 'label', 'text', 'content', 'body',
            'header', 'footer', 'sidebar', 'main', 'nav', 'menu', 'button',
            'form', 'field', 'input', 'select', 'option', 'checkbox', 'radio',
            'table', 'row', 'column', 'cell', 'grid', 'layout', 'container',
            'image', 'icon', 'logo', 'avatar', 'thumbnail', 'preview',
            'user', 'admin', 'role', 'permission', 'auth', 'token', 'session',
            'date', 'time', 'timestamp', 'duration', 'interval', 'timeout',
            'count', 'total', 'sum', 'average', 'min', 'max', 'length', 'size',
            'index', 'position', 'offset', 'limit', 'page', 'cursor',
            'cache', 'memory', 'storage', 'database', 'db', 'sql', 'query',
            'log', 'debug', 'info', 'warn', 'error', 'trace', 'logger',

            // Common adjectives/modifiers
            'new', 'old', 'current', 'previous', 'next', 'first', 'last',
            'all', 'any', 'some', 'none', 'empty', 'null', 'undefined',
            'true', 'false', 'valid', 'invalid', 'active', 'inactive',
            'enabled', 'disabled', 'visible', 'hidden', 'selected', 'focused',
            'loading', 'loaded', 'pending', 'complete', 'success', 'failed',
            'public', 'private', 'protected', 'internal', 'static', 'const',
            'async', 'await', 'sync', 'parallel', 'concurrent', 'sequential',
            'default', 'custom', 'base', 'abstract', 'virtual', 'override',
            'primary', 'secondary', 'main', 'sub', 'child', 'parent', 'root',

            // Common prepositions/connectors
            'of', 'to', 'from', 'with', 'by', 'for', 'in', 'on', 'at', 'as',
            'and', 'or', 'not', 'if', 'else', 'then', 'when', 'while', 'until',

            // Framework/language keywords
            'return', 'throw', 'try', 'catch', 'finally', 'break', 'continue',
            'switch', 'case', 'import', 'export', 'require', 'module', 'package',
            'extends', 'implements', 'constructor', 'super', 'this', 'self',
            'void', 'int', 'float', 'double', 'long', 'short', 'byte', 'char',
            'var', 'let', 'const', 'readonly', 'final', 'sealed', 'abstract',

            // Common framework terms
            'react', 'angular', 'vue', 'svelte', 'next', 'nuxt', 'express',
            'node', 'npm', 'yarn', 'webpack', 'babel', 'typescript', 'javascript',
            'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml',
            'redux', 'mobx', 'vuex', 'pinia', 'zustand', 'recoil', 'jotai',
            'axios', 'fetch', 'graphql', 'rest', 'websocket', 'socket',
            'jest', 'mocha', 'chai', 'jasmine', 'cypress', 'playwright',
            'eslint', 'prettier', 'tslint', 'stylelint', 'husky', 'lint'
        ];

        fallbackWords.forEach(word => {
            this.allKnownWords.add(word.toLowerCase());
        });

        this.loaded = true;
        console.log(`Fallback dictionary loaded: ${this.allKnownWords.size} words`);
    },

    isKnownWord(word) {
        if (!word) return false;
        return this.allKnownWords.has(word.toLowerCase());
    }
};

// Auto-load dictionaries when script loads
Dictionaries.load();
