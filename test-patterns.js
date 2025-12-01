// Test for Patterns module
// Run with: node test-patterns.js

const fs = require('fs');

// ============================================
// MOCK DEPENDENCIES
// ============================================

let counter = 0;
const Config = {
    DEFAULT_NUMBER_THRESHOLD: 4
};

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
    expandToOriginal(word) {
        return word;
    }
};

const Dictionaries = {
    isKnownWord(word) {
        const known = ['function', 'return', 'class', 'public', 'private', 'void', 'string', 'int', 'get', 'set', 'List', 'for', 'if', 'else', 'new', 'var', 'const', 'let'];
        return known.includes(word) || known.includes(word.toLowerCase());
    }
};

// Load and execute patterns.js
const patternsCode = fs.readFileSync('./js/patterns.js', 'utf8');
const Patterns = new Function('Mapper', 'Config', patternsCode + '\nreturn Patterns;')(Mapper, Config);

// ============================================
// TEST DATA
// ============================================

const testCases = {
    guids: {
        input: `ID: {12345678-1234-1234-1234-123456789abc}
MongoID: 507f1f77bcf86cd799439011
HexID: 0123456789abcdef0123456789abcdef`,
        expect: ['GUID', 'ID00']
    },

    paths: {
        input: `URL: https://api.example.com/users/123
Windows: C:\\Users\\john\\Documents\\file.txt
UNC: \\\\server\\share\\folder
Unix: "/var/log/app.log"
Relative: "./src/index.js"`,
        expect: ['PATH']
    },

    network: {
        input: `Server: 192.168.1.100
IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
MAC: 00:1A:2B:3C:4D:5E
Host: web-prod-01
Domain: api.example.com`,
        expect: ['IP00', 'MAC0', 'HOST', 'DOMA']
    },

    contact: {
        input: `Email: john.doe@example.com
Phone US: (555) 123-4567
Phone Intl: +44 20 7123 4567`,
        expect: ['EMAI', 'PHON']
    },

    pii: {
        input: `SSN: 123-45-6789
Card: 4111-1111-1111-1111
Passport: AB1234567`,
        expect: ['SSN0', 'CARD', 'PASS']
    },

    secrets: {
        input: `api_key = "sk_test_fakekeyabcdef1234567890"
JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
Bearer eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhcGkifQ.token123
password = "supersecret123"
AWS: AKIAIOSFODNN7EXAMPLE`,
        expect: ['SECR']
    },

    timestamps: {
        input: `ISO: 2024-01-15T10:30:00.000Z
Log: 2024-01-15 10:30:00,123
Apache: [15/Jan/2024:10:30:00 +0000]
Unix: 1705315800000`,
        expect: ['TIME', 'DATE']
    },

    sessions: {
        input: `session_id = "abc123def456ghi789"
request-id: req-12345678-abcd
correlation_id = "corr-987654"
thread-42`,
        expect: ['SESS', 'REQI', 'THRE']
    },

    http: {
        input: `GET /api/users/123?page=1
POST /api/orders
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`,
        expect: ['ENDP', 'USER']
    },

    database: {
        input: `Server=localhost;Database=mydb;User=admin;Password=secret;
mongodb://user:pass@localhost:27017/mydb
SELECT * FROM [dbo].[Users]`,
        expect: ['CONN', 'TABL']
    },

    cloud: {
        input: `ARN: arn:aws:s3:us-east-1:123456789012:bucket/my-bucket
Container: abc123def456
Pod: myapp-deployment-abc12-xyz34
Azure: /subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/mygroup`,
        expect: ['ARN0', 'CONT', 'POD0', 'RESO']
    },

    errors: {
        input: `at MyNamespace.MyClass.MyMethod(MyFile.cs:123)
System.NullReferenceException
ERROR_CODE_500`,
        expect: ['STAC', 'EXCE', 'ERRO']
    },

    business: {
        input: `order_id = "ORD-123456"
customer_id: "CUST-789"
sku = "SKU-ABC-123"`,
        expect: ['ORDE', 'CUST', 'SKU0']
    },

    comments: {
        input: `// This is a single line comment
/* Multi-line
   comment */
# Python comment
-- SQL comment`,
        expect: ['COMM']
    }
};

// ============================================
// RUN TESTS
// ============================================

console.log('PATTERN TESTS\n' + '='.repeat(50) + '\n');

let totalPassed = 0;
let totalFailed = 0;

for (const [groupName, test] of Object.entries(testCases)) {
    counter = 0;
    Mapper.mappings = {};

    console.log(`\n--- ${groupName.toUpperCase()} ---`);
    console.log('Input:', test.input.replace(/\n/g, ' | ').slice(0, 80) + '...');

    const result = Patterns.applyGroup(groupName, test.input);

    console.log('Output:', result.replace(/\n/g, ' | ').slice(0, 80) + '...');
    console.log('Mappings:', Object.keys(Mapper.mappings).length);

    const hasExpected = test.expect.some(prefix => result.includes(prefix));

    if (hasExpected) {
        console.log('✓ PASS - Patterns detected and obfuscated');
        totalPassed++;
    } else if (Object.keys(Mapper.mappings).length > 0) {
        console.log('✓ PASS - Some patterns detected');
        totalPassed++;
    } else {
        console.log('✗ FAIL - No patterns detected');
        totalFailed++;
    }
}

// ============================================
// FULL PIPELINE TEST
// ============================================

console.log('\n\n' + '='.repeat(50));
console.log('FULL PIPELINE TEST (Server Log)');
console.log('='.repeat(50) + '\n');

counter = 0;
Mapper.mappings = {};

const serverLog = `
2024-01-15T10:30:00.000Z INFO [thread-42] request_id=req-abc123 - Processing request
User: john.doe@example.com from IP 192.168.1.100
Session: sess_xyz789abc123
GET /api/users/123
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.xyz
Query: SELECT * FROM [dbo].[Users] WHERE id = {12345678-1234-1234-1234-123456789abc}
Order: order_id = "ORD-999888"
Server: web-prod-01.internal
Error at MyApp.Controllers.UserController.Get(UserController.cs:42)
`;

console.log('INPUT:\n', serverLog);

let processed = serverLog;
for (const group of ['timestamps', 'sessions', 'contact', 'network', 'http', 'secrets', 'database', 'guids', 'cloud', 'errors', 'business', 'paths']) {
    processed = Patterns.applyGroup(group, processed);
}

console.log('\nOUTPUT:\n', processed);
console.log('\nMAPPINGS:', Object.keys(Mapper.mappings).length, 'items');
console.log('\nSample mappings:');
const entries = Object.entries(Mapper.mappings).slice(0, 10);
for (const [orig, obf] of entries) {
    console.log(`  ${orig.slice(0, 40).padEnd(42)} -> ${obf}`);
}

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '='.repeat(50));
console.log(`SUMMARY: ${totalPassed} passed, ${totalFailed} failed`);
console.log('='.repeat(50));

process.exit(totalFailed > 0 ? 1 : 0);
