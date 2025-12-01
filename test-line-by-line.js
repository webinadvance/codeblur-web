// Line-by-line Pattern Test
// Run with: node test-line-by-line.js

const fs = require('fs');

// ============================================
// MOCK DEPENDENCIES
// ============================================

let counter = 0;
const Config = { DEFAULT_NUMBER_THRESHOLD: 4 };

const Mapper = {
    mappings: {},
    get(original, type = 'default') {
        const prefix = type.toUpperCase().slice(0, 4);
        const id = `${prefix}${String(++counter).padStart(3, '0')}`;
        this.mappings[original] = id;
        return id;
    },
    isFullyObfuscated(word) {
        return /^[A-Z]{2,6}\d{3,}$/.test(word);
    },
    isObfuscated(word) {
        return /[A-Z]{2,6}\d{2,}/.test(word);
    },
    expandToOriginal(word) { return word; }
};

const Dictionaries = {
    isKnownWord(word) {
        const known = ['function', 'return', 'class', 'public', 'private', 'void', 'string', 'int',
            'get', 'set', 'List', 'for', 'if', 'else', 'new', 'var', 'const', 'let', 'async', 'await',
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AS', 'AND', 'OR', 'def', 'pass', 'import',
            'GUID', 'UUID', 'URL', 'IPv4', 'IPv6', 'MAC', 'SSN', 'JWT', 'AWS', 'ARN', 'SQL'];
        return known.includes(word) || known.includes(word.toLowerCase()) || known.includes(word.toUpperCase());
    }
};

// Load patterns.js
const patternsCode = fs.readFileSync('./js/patterns.js', 'utf8');
const Patterns = new Function('Mapper', 'Config', patternsCode + '\nreturn Patterns;')(Mapper, Config);

// ============================================
// TEST CASES - Each line with expected pattern
// ============================================

const testLines = [
    // GUIDs
    { input: 'GUID Standard: {12345678-abcd-1234-abcd-123456789abc}', sensitive: '{12345678-abcd-1234-abcd-123456789abc}', group: 'guids' },
    { input: 'GUID Hex32: 0123456789abcdef0123456789abcdef', sensitive: '0123456789abcdef0123456789abcdef', group: 'guids' },
    { input: 'MongoDB ObjectId: 507f1f77bcf86cd799439011', sensitive: '507f1f77bcf86cd799439011', group: 'guids' },

    // Paths
    { input: 'URL HTTPS: https://api.mycompany.com/v1/users/123', sensitive: 'https://api.mycompany.com/v1/users/123', group: 'paths' },
    { input: 'Windows Path: C:\\Users\\JohnDoe\\Documents\\file.txt', sensitive: 'C:\\Users\\JohnDoe\\Documents\\file.txt', group: 'paths' },
    { input: 'UNC Path: \\\\fileserver\\shared\\report.xlsx', sensitive: '\\\\fileserver\\shared\\report.xlsx', group: 'paths' },

    // Network
    { input: 'IPv4: 192.168.1.100', sensitive: '192.168.1.100', group: 'network' },
    { input: 'IPv4 with Port: 10.0.0.50:8080', sensitive: '10.0.0.50:8080', group: 'network' },
    { input: 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334', sensitive: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', group: 'network' },
    { input: 'MAC Address: 00:1A:2B:3C:4D:5E', sensitive: '00:1A:2B:3C:4D:5E', group: 'network' },

    // Contact
    { input: 'Email: john.doe@mycompany.com', sensitive: 'john.doe@mycompany.com', group: 'contact' },
    { input: 'Phone US: (555) 123-4567', sensitive: '(555) 123-4567', group: 'contact' },
    { input: 'Phone US 2: 555-987-6543', sensitive: '555-987-6543', group: 'contact' },
    { input: 'Phone Intl: +44 20 7123 4567', sensitive: '+44 20 7123 4567', group: 'contact' },

    // PII
    { input: 'SSN: 123-45-6789', sensitive: '123-45-6789', group: 'pii' },
    { input: 'Credit Card: 4111-1111-1111-1111', sensitive: '4111-1111-1111-1111', group: 'pii' },
    { input: 'Credit Card 2: 5500 0000 0000 0004', sensitive: '5500 0000 0000 0004', group: 'pii' },

    // Secrets
    { input: 'api_key = "sk_test_fakekeyabcdef1234567890"', sensitive: 'sk_test_fakekeyabcdef1234567890', group: 'secrets' },
    { input: 'password = "MyS3cr3tP@ssw0rd!"', sensitive: 'MyS3cr3tP@ssw0rd!', group: 'secrets' },
    { input: 'AWS Key: AKIAIOSFODNN7EXAMPLE', sensitive: 'AKIAIOSFODNN7EXAMPLE', group: 'secrets' },
    { input: 'JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xyz', sensitive: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', group: 'secrets' },

    // Timestamps
    { input: 'ISO Timestamp: 2024-01-15T10:30:00.000Z', sensitive: '2024-01-15T10:30:00.000Z', group: 'timestamps' },
    { input: 'Apache Timestamp: [15/Jan/2024:10:30:00 +0000]', sensitive: '[15/Jan/2024:10:30:00 +0000]', group: 'timestamps' },
    { input: 'Unix Timestamp: 1705315800000', sensitive: '1705315800000', group: 'timestamps' },

    // Sessions
    { input: 'session_id = "sess_abc123def456ghi789jkl"', sensitive: 'sess_abc123def456ghi789jkl', group: 'sessions' },
    { input: 'request_id: "req-12345678-abcd-ef01"', sensitive: 'req-12345678-abcd-ef01', group: 'sessions' },
    { input: '[thread-42] Processing...', sensitive: '[thread-42]', group: 'sessions' },

    // HTTP
    { input: 'GET /api/v1/users/12345?page=1', sensitive: 'GET /api/v1/users/12345?page=1', group: 'http' },
    { input: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', sensitive: 'Mozilla/5.0', group: 'http' },

    // Database
    { input: 'Server=db-prod-01.internal;Database=CustomerDB;User=admin;', sensitive: 'Server=db-prod-01.internal;Database=CustomerDB', group: 'database' },
    { input: 'mongodb://admin:pass@localhost:27017/mydb', sensitive: 'mongodb://admin:pass@localhost:27017/mydb', group: 'database' },
    { input: 'SELECT * FROM [dbo].[Customers]', sensitive: '[dbo].[Customers]', group: 'database' },

    // Cloud
    { input: 'AWS ARN: arn:aws:s3:us-east-1:123456789012:bucket/test', sensitive: 'arn:aws:s3:us-east-1:123456789012:bucket/test', group: 'cloud' },
    { input: 'Docker Container: abc123def456', sensitive: 'abc123def456', group: 'cloud' },

    // Errors
    { input: 'at MyCompany.Services.UserService.GetUser(UserService.cs:142)', sensitive: 'at MyCompany.Services.UserService.GetUser(UserService.cs:142)', group: 'errors' },
    { input: 'ERROR_CODE_500', sensitive: 'ERROR_CODE_500', group: 'errors' },

    // Business
    { input: 'order_id = "ORD-2024-001234"', sensitive: 'ORD-2024-001234', group: 'business' },
    { input: 'customer_id: "CUST-ABC-12345"', sensitive: 'CUST-ABC-12345', group: 'business' },
    { input: 'sku = "SKU-WIDGET-001"', sensitive: 'SKU-WIDGET-001', group: 'business' },

    // Comments
    { input: '// This is a single line comment', sensitive: 'This is a single line comment', group: 'comments' },
    { input: '/* Multi-line comment */', sensitive: 'Multi-line comment', group: 'comments' },
    { input: '# Python comment', sensitive: 'Python comment', group: 'comments' },
    { input: '-- SQL comment', sensitive: 'SQL comment', group: 'comments' },
];

// ============================================
// RUN TESTS
// ============================================

console.log('=' .repeat(70));
console.log('LINE-BY-LINE PATTERN TEST');
console.log('=' .repeat(70) + '\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const test of testLines) {
    counter = 0;
    Mapper.mappings = {};

    // Apply the specific group
    const result = Patterns.applyGroup(test.group, test.input);

    // Check if sensitive data was removed
    const stillContainsSensitive = result.includes(test.sensitive);
    const wasObfuscated = !stillContainsSensitive;

    if (wasObfuscated) {
        console.log(`✓ [${test.group.padEnd(10)}] ${test.input.slice(0, 50).padEnd(52)} -> OBFUSCATED`);
        passed++;
    } else {
        console.log(`✗ [${test.group.padEnd(10)}] ${test.input.slice(0, 50).padEnd(52)} -> FAILED`);
        console.log(`  Still contains: "${test.sensitive}"`);
        console.log(`  Result: "${result}"`);
        failed++;
        failures.push({ ...test, result });
    }
}

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '=' .repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('=' .repeat(70));

if (failures.length > 0) {
    console.log('\n=== FAILURES DETAIL ===\n');
    for (const f of failures) {
        console.log(`Group: ${f.group}`);
        console.log(`Input: ${f.input}`);
        console.log(`Expected to remove: ${f.sensitive}`);
        console.log(`Result: ${f.result}`);
        console.log('---');
    }
}

process.exit(failed > 0 ? 1 : 0);
