// Simple test for ANON obfuscation
// Run with: node test-anon.js

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

// Build patterns (same as app.js)
function buildPatterns() {
    const allPrefixes = [];
    Object.values(STYLE_PRESETS).forEach(style => {
        style.prefixes.forEach(p => allPrefixes.push(p));
        allPrefixes.push(style.comment, style.guid, style.path, style.func, style.prop, style.field);
    });
    allPrefixes.sort((a, b) => b.length - a.length);

    const prefixPattern = allPrefixes.join('|');
    return {
        obfuscatedPattern: new RegExp(`(${prefixPattern})\\d{2,}`),
        fullyObfuscatedPattern: new RegExp(`^(${prefixPattern})\\d+$`)
    };
}

const { obfuscatedPattern, fullyObfuscatedPattern } = buildPatterns();

function isObfuscatedIdentifier(word) {
    return fullyObfuscatedPattern.test(word);
}

function shouldBeReplaced(word) {
    if (isObfuscatedIdentifier(word)) return false;
    return obfuscatedPattern.test(word);
}

// Test cases
const tests = [
    // [word, shouldReplace]
    ['D001Item', true],
    ['UserD001Manager', true],
    ['connectionStringD001', true],
    ['A001B001Config', true],
    ['B002ServiceA001B001', true],
    ['D001', false],  // fully obfuscated - skip
    ['A001', false],  // fully obfuscated - skip
    ['PERSON001', false],  // fully obfuscated - skip
    ['User', false],  // no pattern
    ['List', false],  // no pattern
    ['string', false],  // no pattern
    ['PrenotaCorsi', false],  // no obfuscated pattern
];

console.log('ANON Obfuscation Tests\n');
console.log(`Obfuscated Pattern: ${obfuscatedPattern}\n`);

let passed = 0;
let failed = 0;

for (const [word, expected] of tests) {
    const result = shouldBeReplaced(word);
    const status = result === expected ? 'PASS' : 'FAIL';

    if (result === expected) {
        passed++;
        console.log(`✓ ${word} => ${result} (expected ${expected})`);
    } else {
        failed++;
        console.log(`✗ ${word} => ${result} (expected ${expected}) <<<< FAIL`);
    }
}

console.log(`\n${passed} passed, ${failed} failed`);

// Full flow test - simulate anonymizeMembers
console.log('\n\n=== FULL FLOW TEST ===\n');

const inputText = `public class UserD001Manager : B002ServiceA001B001
{
    private List<D001Item> cachedItems;
    public A001B001Config Config { get; set; }
}`;

console.log('INPUT:');
console.log(inputText);
console.log('\n');

// Get all words
const words = [...new Set(inputText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];
console.log('ALL WORDS:', words);
console.log('\n');

// Find composites
const composites = words.filter(word => {
    if (isObfuscatedIdentifier(word)) return false;
    return obfuscatedPattern.test(word);
});
console.log('COMPOSITES TO REPLACE:', composites);
console.log('\n');

// Simulate replacement (using real prefixes like the app does)
let counter = 1;
let outputText = inputText;
composites.sort((a, b) => b.length - a.length);

for (const word of composites) {
    const placeholder = `PERSON${String(counter++).padStart(3, '0')}`;
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    outputText = outputText.replace(regex, placeholder);
    console.log(`Replacing "${word}" with "${placeholder}"`);
}

console.log('\nOUTPUT:');
console.log(outputText);

// Check for remaining composites
const remainingWords = [...new Set(outputText.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [])];
const remainingComposites = remainingWords.filter(word => {
    if (isObfuscatedIdentifier(word)) return false;
    return obfuscatedPattern.test(word);
});

if (remainingComposites.length > 0) {
    console.log('\n!!! REMAINING COMPOSITES (BUG):', remainingComposites);
    process.exit(1);
} else {
    console.log('\n✓ No remaining composites - SUCCESS');
}

process.exit(failed > 0 ? 1 : 0);
