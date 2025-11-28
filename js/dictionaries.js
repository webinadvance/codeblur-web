// CodeBlur Web - Dictionaries Module
// Loads and manages known words from JSON files

const Dictionaries = {
    allKnownWords: new Set(),
    loaded: false,

    load() {
        if (this.loaded) return;
        this.loadFallbackDictionary();
    },

    loadFallbackDictionary() {
        // Comprehensive fallback dictionary with common programming terms
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

            // C#/.NET keywords and namespaces
            'using', 'namespace', 'class', 'struct', 'record', 'interface', 'enum',
            'Microsoft', 'System', 'EntityFrameworkCore', 'EntityFramework', 'Entity',
            'Framework', 'Core', 'Storage', 'Value', 'Conversion', 'Converter',
            'Linq', 'Expressions', 'Expression', 'Collections', 'Generic', 'Generics',
            'Threading', 'Tasks', 'Task', 'Async', 'Parallel', 'Concurrent',
            'Text', 'IO', 'Net', 'Http', 'Web', 'Sockets', 'Security', 'Cryptography',
            'Reflection', 'Runtime', 'Interop', 'Diagnostics', 'ComponentModel',
            'Data', 'Sql', 'Client', 'Common', 'Configuration', 'DependencyInjection',
            'Extensions', 'Hosting', 'Logging', 'Options', 'Caching', 'Memory',
            'AspNetCore', 'Mvc', 'Razor', 'SignalR', 'Identity', 'Authorization',
            'Authentication', 'Server', 'Models', 'Domain', 'Shared', 'Enums',
            'Services', 'Repositories', 'Controllers', 'Handlers', 'Middleware',
            'Filters', 'Attributes', 'Validators', 'Mappers', 'Helpers', 'Utils',
            'Contracts', 'Interfaces', 'Abstractions', 'Implementations',

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
    },

    isKnownWord(word) {
        if (!word) return false;
        // Ensure dictionary is loaded
        if (this.allKnownWords.size === 0) {
            this.loadFallbackDictionary();
        }
        return this.allKnownWords.has(word.toLowerCase());
    },

    // Debug function - call from console: Dictionaries.debug()
    debug() {
        console.log(`Total words: ${this.allKnownWords.size}`);
        console.log(`loaded: ${this.loaded}`);
        console.log(`Has 'using': ${this.allKnownWords.has('using')}`);
        console.log(`Has 'microsoft': ${this.allKnownWords.has('microsoft')}`);
        console.log(`Has 'system': ${this.allKnownWords.has('system')}`);
        console.log(`Has 'linq': ${this.allKnownWords.has('linq')}`);
    }
};

// Auto-load dictionaries when script loads
Dictionaries.load();
