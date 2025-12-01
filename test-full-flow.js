// Full flow test: blur multiple code pieces, combine, reveal until clear
// Run with: node test-full-flow.js

const STYLE_PRESETS = {
    corporate: {
        prefixes: ['PERSON', 'ENTITY', 'ORG', 'ITEM', 'NAME', 'ID', 'REF'],
        comment: 'COMMENT', guid: 'GUID', path: 'PATH', func: 'FUNC', prop: 'PROP', field: 'FIELD'
    },
    minimal: {
        prefixes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        comment: 'CMT', guid: 'UID', path: 'PTH', func: 'FN', prop: 'P', field: 'F'
    }
};

// Mappings storage (like app.js this.mappings)
let mappings = {};
let counters = {};

// Known words (simplified)
const knownWords = new Set([
    'get', 'set', 'public', 'private', 'class', 'function', 'return', 'if', 'else',
    'for', 'while', 'new', 'this', 'string', 'int', 'void', 'async', 'await', 'var',
    'let', 'const', 'List', 'Task', 'User', 'Item', 'Data', 'Result', 'Config',
    'Manager', 'Service', 'Controller', 'Repository', 'Factory', 'Builder',
    'Processor', 'Validator', 'Handler', 'Provider', 'Options', 'Request',
    'Response', 'Query', 'Command', 'Event', 'Model', 'View', 'Dictionary',
    'readonly', 'static', 'override', 'virtual', 'abstract', 'interface',
    'Connection', 'String', 'cached', 'Items', 'Cache', 'Configurazione',
    'Execute', 'Fetch', 'Process', 'Validate', 'Build', 'Select', 'sql',
    'query', 'id', 'By', 'Async', 'private', 'protected', 'internal'
]);

function isKnownWord(word) {
    return knownWords.has(word) || knownWords.has(word.toLowerCase());
}

// Build patterns
function buildPatterns() {
    const allPrefixes = [];
    Object.values(STYLE_PRESETS).forEach(style => {
        style.prefixes.forEach(p => allPrefixes.push(p));
        allPrefixes.push(style.comment, style.guid, style.path, style.func, style.prop, style.field);
    });
    allPrefixes.sort((a, b) => b.length - a.length);
    const prefixPattern = allPrefixes.join('|');
    return {
        allPrefixes,
        obfuscatedPattern: new RegExp(`(${prefixPattern})\\d{2,}`),
        fullyObfuscatedPattern: new RegExp(`^(${prefixPattern})\\d+$`)
    };
}

const { allPrefixes, obfuscatedPattern, fullyObfuscatedPattern } = buildPatterns();

function isObfuscatedIdentifier(word) {
    return fullyObfuscatedPattern.test(word);
}

function getOrCreateMapping(value) {
    if (mappings[value]) return mappings[value];

    const prefixes = STYLE_PRESETS.minimal.prefixes;
    const totalMappings = Object.keys(mappings).length;
    const prefix = prefixes[totalMappings % prefixes.length];
    counters[prefix] = (counters[prefix] || 0) + 1;
    const newId = `${prefix}${String(counters[prefix]).padStart(3, '0')}`;
    mappings[value] = newId;
    return newId;
}

function splitCamelCase(word) {
    const parts = [];
    let current = '';
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (i > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
            if (current) parts.push(current);
            current = char;
        } else {
            current += char;
        }
    }
    if (current) parts.push(current);
    return parts;
}

function replaceWholeWord(text, search, replace) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    return text.replace(regex, replace);
}

// BLUR level - obfuscate unknown identifier parts
function blur(text) {
    const words = [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];

    for (const word of words) {
        if (word.length < 2) continue;
        if (isObfuscatedIdentifier(word)) continue;
        if (isKnownWord(word)) continue;

        const parts = splitCamelCase(word);
        const newParts = parts.map(part => {
            if (isKnownWord(part)) return part;
            return getOrCreateMapping(part);
        });

        const newWord = newParts.join('');
        if (newWord !== word) {
            mappings[word] = newWord; // store full mapping too
            text = replaceWholeWord(text, word, newWord);
        }
    }
    return text;
}

// ANON level - obfuscate composite identifiers
function anon(text) {
    const words = [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];

    const composites = words.filter(word => {
        if (isObfuscatedIdentifier(word)) return false;
        return obfuscatedPattern.test(word);
    });

    composites.sort((a, b) => b.length - a.length);

    for (const word of composites) {
        const placeholder = getOrCreateMapping(word);
        text = replaceWholeWord(text, word, placeholder);
    }
    return text;
}

// REVEAL - deobfuscate using mappings
function reveal(text) {
    const sortedMappings = Object.entries(mappings).sort((a, b) => b[1].length - a[1].length);

    for (const [original, obfuscated] of sortedMappings) {
        text = replaceWholeWord(text, obfuscated, original);
    }
    return text;
}

// Calculate obfuscation percentage
function getObfuscationPercent(text) {
    const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
    const obfuscated = words.filter(w => obfuscatedPattern.test(w));
    if (words.length === 0) return 0;
    return Math.round((obfuscated.length / words.length) * 100);
}

// =====================
// TEST
// =====================

console.log('=== FULL FLOW TEST ===\n');

// Multiple code snippets to blur separately (TypeScript-like)
const codeSnippets = [
    `import { UserPrenotaCorsi } from './services/PrenotaCorsiService';
import { PrenotaCorsiConfig } from '../config/PrenotaCorsiConfig';`,

    `export class PrenotaCorsiManager {
    private prenotaCorsiCache: Map<string, PrenotaCorsi>;
    private configPrenotaCorsi: PrenotaCorsiConfig;

    constructor(optionsPrenotaCorsi: PrenotaCorsiOptions) {
        this.prenotaCorsiCache = new Map();
    }
}`,

    `async function fetchPrenotaCorsiData(idPrenotaCorsi: string): Promise<PrenotaCorsiResult> {
    const responsePrenotaCorsi = await apiPrenotaCorsi.get(idPrenotaCorsi);
    return parsePrenotaCorsiResponse(responsePrenotaCorsi);
}`,

    `const handlePrenotaCorsiSubmit = (eventPrenotaCorsi: FormEvent) => {
    const dataPrenotaCorsi = validatePrenotaCorsiForm(eventPrenotaCorsi);
    submitPrenotaCorsi(dataPrenotaCorsi);
};`,

    `interface IPrenotaCorsiRepository {
    getPrenotaCorsiById(id: string): PrenotaCorsi;
    savePrenotaCorsi(item: PrenotaCorsi): void;
    deletePrenotaCorsi(id: string): boolean;
}`
];

console.log('STEP 1: Blur each snippet separately\n');

let combinedText = '';
for (let i = 0; i < codeSnippets.length; i++) {
    console.log(`--- Snippet ${i + 1} ---`);
    console.log('BEFORE:', codeSnippets[i].replace(/\n/g, ' '));

    const blurred = blur(codeSnippets[i]);
    console.log('AFTER BLUR:', blurred.replace(/\n/g, ' '));
    console.log('');

    combinedText += blurred + '\n\n';
}

console.log('\nSTEP 2: Combined obfuscated text\n');
console.log(combinedText);

console.log('STEP 3: Apply ANON to combined text\n');
const afterAnon = anon(combinedText);
console.log(afterAnon);

console.log('\nSTEP 4: Reveal until 0%\n');

let currentText = afterAnon;
let pass = 0;
const maxPasses = 20;

while (pass < maxPasses) {
    const percent = getObfuscationPercent(currentText);
    console.log(`Pass ${pass}: ${percent}% obfuscation`);

    if (percent === 0) {
        console.log('\n✓ SUCCESS: 0% obfuscation reached!');
        break;
    }

    currentText = reveal(currentText);
    pass++;
}

if (pass >= maxPasses) {
    console.log('\n✗ FAIL: Could not reach 0% after', maxPasses, 'passes');
    console.log('Remaining text:', currentText);
    process.exit(1);
}

console.log('\nFINAL REVEALED TEXT:\n');
console.log(currentText);

// Verify no obfuscated patterns remain
const finalWords = currentText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
const remaining = finalWords.filter(w => obfuscatedPattern.test(w));

if (remaining.length > 0) {
    console.log('\n✗ FAIL: Still has obfuscated words:', remaining);
    process.exit(1);
}

console.log('\n✓ ALL TESTS PASSED');
process.exit(0);
