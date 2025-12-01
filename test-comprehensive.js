// Comprehensive test: Multiple files, blur/reveal cycles, mixed scenarios
// Simulates real-world usage: paste file1, blur, paste file2, blur, reveal all
// MUST reach 0% obfuscation with NO missing data

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
        contains: new RegExp(`(${prefixPattern})\\d{2,}`),
        fully: new RegExp(`^(${prefixPattern})\\d+$`)
    };
}

const patterns = buildPatterns();

// State (simulates app state)
let mappings = {};
let counters = {};
const style = STYLE_PRESETS.minimal;

// Known words (simplified)
const knownWords = new Set([
    'get', 'set', 'public', 'private', 'class', 'function', 'return', 'if', 'else',
    'for', 'while', 'new', 'this', 'string', 'int', 'void', 'async', 'await', 'var',
    'let', 'const', 'List', 'Task', 'User', 'Item', 'Data', 'Result', 'Config',
    'Manager', 'Service', 'Controller', 'Repository', 'Factory', 'Builder',
    'import', 'export', 'from', 'interface', 'type', 'extends', 'implements',
    'Promise', 'Map', 'Array', 'Object', 'String', 'Number', 'Boolean',
    'true', 'false', 'null', 'undefined', 'constructor', 'prototype',
    'console', 'log', 'error', 'warn', 'info', 'debug'
]);

function isKnownWord(word) {
    return knownWords.has(word) || knownWords.has(word.toLowerCase());
}

function replaceWholeWord(text, search, replace) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`\\b${escaped}\\b`, 'g'), replace);
}

function getMapping(value) {
    if (mappings[value]) return mappings[value];
    const prefixes = style.prefixes;
    const count = Object.keys(mappings).length;
    const prefix = prefixes[count % prefixes.length];
    counters[prefix] = (counters[prefix] || 0) + 1;
    const id = `${prefix}${String(counters[prefix]).padStart(3, '0')}`;
    mappings[value] = id;
    return id;
}

function splitCamelCase(word) {
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
}

// BLUR - obfuscate identifiers
function blur(text) {
    const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const processed = new Set();
    let match;

    while ((match = identifierPattern.exec(text)) !== null) {
        const id = match[1];
        if (processed.has(id) || id.length < 2) continue;
        if (id === id.toUpperCase()) continue;
        if (patterns.fully.test(id)) continue;
        if (isKnownWord(id)) continue;
        processed.add(id);

        const parts = splitCamelCase(id);
        const unknownParts = parts.filter(p => !isKnownWord(p));

        if (unknownParts.length > 0) {
            const obfuscated = parts.map(p => isKnownWord(p) ? p : getMapping(p)).join('');
            if (obfuscated !== id) {
                mappings[id] = obfuscated;
                text = replaceWholeWord(text, id, obfuscated);
            }
        }
    }
    return text;
}

// Expand obfuscated parts back to originals
function expandToOriginal(word) {
    const reverse = {};
    for (const [k, v] of Object.entries(mappings)) {
        reverse[v] = k;
    }
    const sorted = Object.keys(reverse).sort((a, b) => b.length - a.length);
    let result = word;
    for (const obf of sorted) {
        if (result.includes(obf)) result = result.split(obf).join(reverse[obf]);
    }
    return result;
}

// ANON - obfuscate composites
function anon(text) {
    const words = [...new Set(text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];
    const composites = words.filter(w => !patterns.fully.test(w) && patterns.contains.test(w));
    composites.sort((a, b) => b.length - a.length);

    for (const word of composites) {
        const expanded = expandToOriginal(word);
        const placeholder = getMapping(expanded);
        text = replaceWholeWord(text, word, placeholder);
    }
    return text;
}

// REVEAL - single pass
function reveal(text) {
    const sorted = Object.entries(mappings).sort((a, b) => b[1].length - a[1].length);
    for (const [original, obfuscated] of sorted) {
        text = replaceWholeWord(text, obfuscated, original);
    }
    return text;
}

// Calculate obfuscation %
function calcPercent(text) {
    const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{1,}\b/g) || [];
    if (words.length === 0) return 0;
    const obfuscated = words.filter(w => patterns.contains.test(w));
    return Math.round((obfuscated.length / words.length) * 100);
}

// ============================================
// TEST SCENARIOS
// ============================================

console.log('=== COMPREHENSIVE MULTI-FILE TEST ===\n');

// FILE 1: TypeScript service
const file1 = `
import { CustomerOrderService } from './services/CustomerOrderService';
import { OrderValidationConfig } from '../config/OrderValidationConfig';

export class CustomerOrderManager {
    private orderCache: Map<string, CustomerOrder>;
    private validationConfig: OrderValidationConfig;

    constructor(options: CustomerOrderOptions) {
        this.orderCache = new Map();
        this.validationConfig = options.config;
    }

    async processCustomerOrder(orderId: string): Promise<OrderResult> {
        const order = await this.fetchCustomerOrder(orderId);
        return this.validateCustomerOrder(order);
    }
}
`;

// FILE 2: Different service with some overlapping patterns
const file2 = `
import { PaymentGatewayService } from './services/PaymentGatewayService';
import { CustomerOrderService } from './services/CustomerOrderService';

export class PaymentProcessor {
    private gatewayClient: PaymentGatewayClient;
    private orderService: CustomerOrderService;

    async processPayment(paymentId: string, customerOrder: CustomerOrder): Promise<PaymentResult> {
        const validated = await this.validatePayment(paymentId);
        return this.executePayment(validated, customerOrder);
    }
}
`;

// FILE 3: Repository with more overlapping
const file3 = `
interface ICustomerOrderRepository {
    getCustomerOrderById(id: string): CustomerOrder;
    saveCustomerOrder(order: CustomerOrder): void;
    deleteCustomerOrder(id: string): boolean;
    findCustomerOrdersByStatus(status: OrderStatus): CustomerOrder[];
}

class CustomerOrderRepository implements ICustomerOrderRepository {
    private dbContext: DatabaseContext;

    getCustomerOrderById(id: string): CustomerOrder {
        return this.dbContext.customerOrders.find(o => o.id === id);
    }
}
`;

let combinedText = '';
let step = 0;

function logStep(desc, text) {
    step++;
    const percent = calcPercent(text);
    console.log(`STEP ${step}: ${desc}`);
    console.log(`  Obfuscation: ${percent}%`);
    console.log(`  Mappings: ${Object.keys(mappings).length}`);
    console.log(`  Text preview: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
    console.log('');
}

// SCENARIO: Paste file1, blur
console.log('--- SCENARIO 1: Paste and blur File 1 ---\n');
combinedText = file1;
logStep('Pasted File 1', combinedText);

combinedText = blur(combinedText);
logStep('After BLUR', combinedText);

combinedText = anon(combinedText);
logStep('After ANON', combinedText);

// SCENARIO: Reveal partially (user clicks reveal once)
console.log('--- SCENARIO 2: Partial reveal ---\n');
combinedText = reveal(combinedText);
logStep('After REVEAL (1 pass)', combinedText);

// SCENARIO: Blur again (user wants to re-obfuscate)
console.log('--- SCENARIO 3: Re-blur the same text ---\n');
combinedText = blur(combinedText);
logStep('After re-BLUR', combinedText);

combinedText = anon(combinedText);
logStep('After re-ANON', combinedText);

// SCENARIO: Paste file2 (append)
console.log('--- SCENARIO 4: Append File 2 and blur ---\n');
combinedText = combinedText + '\n\n// === FILE 2 ===\n' + file2;
logStep('After appending File 2', combinedText);

combinedText = blur(combinedText);
logStep('After BLUR', combinedText);

combinedText = anon(combinedText);
logStep('After ANON', combinedText);

// SCENARIO: Paste file3 (append more)
console.log('--- SCENARIO 5: Append File 3 and blur ---\n');
combinedText = combinedText + '\n\n// === FILE 3 ===\n' + file3;
logStep('After appending File 3', combinedText);

combinedText = blur(combinedText);
logStep('After BLUR', combinedText);

combinedText = anon(combinedText);
logStep('After ANON', combinedText);

// SCENARIO: Multiple blur cycles (simulates user clicking blur multiple times)
console.log('--- SCENARIO 6: Multiple blur cycles ---\n');
for (let i = 0; i < 3; i++) {
    combinedText = blur(combinedText);
    combinedText = anon(combinedText);
}
logStep('After 3 more BLUR+ANON cycles', combinedText);

// SCENARIO: FULL REVEAL - must reach 0%
console.log('--- SCENARIO 7: Full reveal (must reach 0%) ---\n');

let pass = 0;
const maxPasses = 50;
let percentHistory = [];

while (pass < maxPasses) {
    const percent = calcPercent(combinedText);
    percentHistory.push(percent);
    console.log(`  Reveal pass ${pass}: ${percent}%`);

    if (percent === 0) {
        console.log('\n✓ SUCCESS: 0% obfuscation reached!\n');
        break;
    }

    combinedText = reveal(combinedText);
    pass++;
}

if (pass >= maxPasses) {
    console.log(`\n✗ FAIL: Could not reach 0% after ${maxPasses} passes`);
    console.log('Percent history:', percentHistory);

    // Find remaining obfuscated words
    const words = combinedText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
    const remaining = words.filter(w => patterns.contains.test(w));
    console.log('Remaining obfuscated words:', [...new Set(remaining)]);
    process.exit(1);
}

// Verify no obfuscated patterns remain
const finalWords = combinedText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
const remainingObfuscated = finalWords.filter(w => patterns.contains.test(w));

if (remainingObfuscated.length > 0) {
    console.log('✗ FAIL: Still has obfuscated words:', [...new Set(remainingObfuscated)]);
    process.exit(1);
}

// Verify original identifiers are restored
const expectedIdentifiers = [
    'CustomerOrderService', 'CustomerOrderManager', 'CustomerOrder',
    'OrderValidationConfig', 'CustomerOrderOptions', 'OrderResult',
    'PaymentGatewayService', 'PaymentProcessor', 'PaymentGatewayClient',
    'PaymentResult', 'ICustomerOrderRepository', 'CustomerOrderRepository',
    'DatabaseContext', 'OrderStatus'
];

console.log('--- VERIFICATION: Check original identifiers restored ---\n');
let allFound = true;
for (const id of expectedIdentifiers) {
    const found = combinedText.includes(id);
    console.log(`  ${found ? '✓' : '✗'} ${id}`);
    if (!found) allFound = false;
}

if (!allFound) {
    console.log('\n✗ FAIL: Some original identifiers not restored');
    process.exit(1);
}

console.log('\n--- FINAL TEXT ---\n');
console.log(combinedText);

console.log('\n=== ALL TESTS PASSED ===');
console.log(`Total mappings created: ${Object.keys(mappings).length}`);
console.log(`Reveal passes needed: ${pass}`);
process.exit(0);
