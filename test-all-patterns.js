// Comprehensive Pattern Test - ALL 55+ Patterns
// Run with: node test-all-patterns.js

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
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'AS', 'AND', 'OR', 'def', 'pass', 'import'];
        return known.includes(word) || known.includes(word.toLowerCase()) || known.includes(word.toUpperCase());
    }
};

// Load patterns.js
const patternsCode = fs.readFileSync('./js/patterns.js', 'utf8');
const Patterns = new Function('Mapper', 'Config', patternsCode + '\nreturn Patterns;')(Mapper, Config);

// ============================================
// FULL TEST INPUT
// ============================================

const fullTestInput = `
// ============================================
// CODEBLUR PATTERN TEST - ALL 55+ PATTERNS
// ============================================

// === GUIDS & IDs ===
GUID Standard: {12345678-abcd-1234-abcd-123456789abc}
GUID Hex32: 0123456789abcdef0123456789abcdef
UUID No Dashes: 12345678abcd1234abcd123456789abc
MongoDB ObjectId: 507f1f77bcf86cd799439011

// === PATHS & URLs ===
URL HTTPS: https://api.mycompany.com/v1/users/123?token=abc
URL WebSocket: wss://socket.example.io/connect
Windows Path: C:\\Users\\JohnDoe\\Documents\\secret_project\\config.json
UNC Path: \\\\fileserver\\shared\\confidential\\report.xlsx
Unix Path: "/var/log/myapp/error.log"
Relative Path: "./src/components/UserProfile.tsx"

// === NETWORK ===
IPv4: 192.168.1.100
IPv4 with Port: 10.0.0.50:8080
IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
IPv6 Compressed: fe80::1
MAC Address: 00:1A:2B:3C:4D:5E
Hostname: web-prod-01
Hostname 2: db-master-03
Domain: api.internal.mycompany.com

// === CONTACT INFO ===
Email: john.doe@mycompany.com
Email 2: support+ticket123@example.org
Phone US: (555) 123-4567
Phone US 2: 555-987-6543
Phone Intl: +44 20 7123 4567
Phone Intl 2: +1-800-555-0199

// === PII (Personally Identifiable Info) ===
SSN: 123-45-6789
Credit Card: 4111-1111-1111-1111
Credit Card 2: 5500 0000 0000 0004
Passport: AB1234567

// === SECRETS & TOKENS ===
api_key = "sk_test_fakekeyabcdef1234567890"
access_token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
auth_token = 'pat_1234567890abcdefghijklmnop'
secret_key: "super_secret_key_12345678901234"
password = "MyS3cr3tP@ssw0rd!"
password: 'AnotherSecret123'
AWS Key: AKIAIOSFODNN7EXAMPLE
JWT Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.Gfx6VO9tcxwk6xqx9yYzSfebfeakZp5JYIgP_edcw_A
Bearer Token: Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcGkifQ.signature
Base64 Secret: VGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgZW5jb2RlZCBzZWNyZXQgc3RyaW5nIHRoYXQgc2hvdWxkIGJlIG9iZnVzY2F0ZWQ=

// === TIMESTAMPS & DATES ===
ISO Timestamp: 2024-01-15T10:30:00.000Z
Log Timestamp: 2024-01-15 10:30:00,123
Apache Timestamp: [15/Jan/2024:10:30:00 +0000]
Unix Timestamp: 1705315800000
Date Slash: 01/15/2024
Date Dash: 2024-01-15

// === SESSION & REQUEST IDs ===
session_id = "sess_abc123def456ghi789jkl"
session: "user_session_xyz789"
sid = "s:abcd1234efgh5678"
request_id: "req-12345678-abcd-ef01"
x-request-id = "trace-987654321"
correlation_id: "corr-uuid-12345"
trace_id = "span-abcdef123456"
transaction_id: "txn-ORDER-789456"
[thread-42] Processing...
[thread-128] Completed
pid=12345
process_id: 67890

// === HTTP & USER AGENTS ===
GET /api/v1/users/12345?page=1&limit=20
POST /api/v1/orders/create
PUT /api/v1/products/SKU-123/inventory
DELETE /api/v1/sessions/abc123
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15

// === DATABASE ===
Connection String: Server=db-prod-01.internal;Database=CustomerDB;User=app_user;Password=DbP@ss123;
MongoDB URI: mongodb://admin:secretpass@mongo-cluster.internal:27017/production
PostgreSQL: postgresql://user:pass@localhost:5432/mydb
MySQL: mysql://root:password@db.example.com/app_database
SQL Query: SELECT * FROM [dbo].[Customers] WHERE id = 123
SQL Query 2: SELECT name AS customer_name, email AS contact_email FROM users

// === CLOUD & INFRASTRUCTURE ===
AWS ARN: arn:aws:s3:us-east-1:123456789012:bucket/my-secret-bucket
AWS ARN 2: arn:aws:lambda:eu-west-1:987654321098:function:ProcessOrders
AWS Account: 123456789012
Docker Container: abc123def456
Docker Full: abc123def456789012345678901234567890123456789012345678901234
K8s Pod: myapp-deployment-7d8f9b6c4d-x2k9m
K8s Pod 2: api-server-5b4c3d2e1f-abc12
Azure Resource: /subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/prod-rg/providers/Microsoft.Web/sites/myapp

// === ERRORS & STACK TRACES ===
at MyCompany.Services.UserService.GetUser(UserService.cs:142)
at MyCompany.Controllers.ApiController.HandleRequest(ApiController.cs:89)
at MyCompany.Data.Repository.Query(Repository.cs:234)
System.NullReferenceException: Object reference not set
java.lang.NullPointerException: Cannot invoke method on null
ERROR_CODE_500
ERROR_AUTH_FAILED
ERR-DB-CONNECTION-TIMEOUT

// === BUSINESS IDENTIFIERS ===
order_id = "ORD-2024-001234"
order_number: "PO-789456123"
invoice_id = "INV-2024-00567"
invoice_number: "BILL-123456"
customer_id: "CUST-ABC-12345"
client_id = "CLI-987654"
user_id: "USR-001234567"
account_number = "ACCT-9876543210"
account_id: "ACC-123-456-789"
sku = "SKU-WIDGET-001"
product_code: "PROD-ABC-123"
item_code = "ITEM-XYZ-789"

// === CODE IDENTIFIERS ===
class CustomerOrderProcessor {
    private connectionString = "Server=localhost;Database=orders";
    public async processOrder(orderId, customerId) {
        const userEmail = "admin@company.com";
        const apiEndpoint = "https://api.internal/orders";
    }
}
`;

// ============================================
// PATTERNS TO CHECK
// ============================================

const patternsToCheck = [
    // GUIDs
    { name: 'GUID Standard', pattern: /\{12345678-abcd-1234-abcd-123456789abc\}/, shouldMatch: false },
    { name: 'GUID Hex32', pattern: /0123456789abcdef0123456789abcdef/, shouldMatch: false },
    { name: 'MongoDB ObjectId', pattern: /507f1f77bcf86cd799439011/, shouldMatch: false },

    // Network
    { name: 'IPv4', pattern: /192\.168\.1\.100/, shouldMatch: false },
    { name: 'IPv4 with Port', pattern: /10\.0\.0\.50:8080/, shouldMatch: false },
    { name: 'IPv6', pattern: /2001:0db8:85a3:0000:0000:8a2e:0370:7334/, shouldMatch: false },
    { name: 'MAC Address', pattern: /00:1A:2B:3C:4D:5E/, shouldMatch: false },

    // Contact
    { name: 'Email', pattern: /john\.doe@mycompany\.com/, shouldMatch: false },
    { name: 'Email 2', pattern: /support\+ticket123@example\.org/, shouldMatch: false },
    { name: 'Phone US', pattern: /\(555\) 123-4567/, shouldMatch: false },
    { name: 'Phone Intl', pattern: /\+44 20 7123 4567/, shouldMatch: false },

    // PII
    { name: 'SSN', pattern: /123-45-6789/, shouldMatch: false },
    { name: 'Credit Card', pattern: /4111-1111-1111-1111/, shouldMatch: false },

    // Secrets
    { name: 'API Key', pattern: /sk_test_fakekeyabcdef1234567890/, shouldMatch: false },
    { name: 'AWS Key', pattern: /AKIAIOSFODNN7EXAMPLE/, shouldMatch: false },
    { name: 'JWT Token', pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/, shouldMatch: false },
    { name: 'Password', pattern: /MyS3cr3tP@ssw0rd!/, shouldMatch: false },

    // Timestamps
    { name: 'ISO Timestamp', pattern: /2024-01-15T10:30:00\.000Z/, shouldMatch: false },
    { name: 'Apache Timestamp', pattern: /\[15\/Jan\/2024:10:30:00 \+0000\]/, shouldMatch: false },
    { name: 'Unix Timestamp', pattern: /1705315800000/, shouldMatch: false },

    // Sessions
    { name: 'Session ID', pattern: /sess_abc123def456ghi789jkl/, shouldMatch: false },
    { name: 'Request ID', pattern: /req-12345678-abcd-ef01/, shouldMatch: false },
    { name: 'Thread ID', pattern: /\[thread-42\]/, shouldMatch: false },

    // HTTP
    { name: 'HTTP GET', pattern: /GET \/api\/v1\/users\/12345/, shouldMatch: false },
    { name: 'User Agent', pattern: /Mozilla\/5\.0.*Chrome/, shouldMatch: false },

    // Database
    { name: 'Connection String', pattern: /Server=db-prod-01\.internal;Database=CustomerDB/, shouldMatch: false },
    { name: 'MongoDB URI', pattern: /mongodb:\/\/admin:secretpass@mongo-cluster/, shouldMatch: false },
    { name: 'Table Reference', pattern: /\[dbo\]\.\[Customers\]/, shouldMatch: false },

    // Cloud
    { name: 'AWS ARN', pattern: /arn:aws:s3:us-east-1:123456789012/, shouldMatch: false },
    { name: 'Docker Container', pattern: /abc123def456(?!7)/, shouldMatch: false },
    { name: 'Azure Resource', pattern: /\/subscriptions\/12345678-1234-1234-1234-123456789abc/, shouldMatch: false },

    // Errors
    { name: 'Stack Frame', pattern: /at MyCompany\.Services\.UserService\.GetUser\(UserService\.cs:142\)/, shouldMatch: false },
    { name: 'Error Code', pattern: /ERROR_CODE_500/, shouldMatch: false },

    // Business
    { name: 'Order ID', pattern: /ORD-2024-001234/, shouldMatch: false },
    { name: 'Customer ID', pattern: /CUST-ABC-12345/, shouldMatch: false },
    { name: 'SKU', pattern: /SKU-WIDGET-001/, shouldMatch: false },

    // Paths
    { name: 'URL HTTPS', pattern: /https:\/\/api\.mycompany\.com/, shouldMatch: false },
    { name: 'Windows Path', pattern: /C:\\Users\\JohnDoe/, shouldMatch: false },
    { name: 'UNC Path', pattern: /\\\\fileserver\\shared/, shouldMatch: false },
];

// ============================================
// RUN TEST
// ============================================

console.log('=' .repeat(60));
console.log('COMPREHENSIVE PATTERN TEST');
console.log('=' .repeat(60));

// Apply all pattern groups (simulating blurAllPatterns)
let result = fullTestInput;
const skipGroups = ['strings', 'all_ids', 'all_sensitive', 'logs'];

for (const groupName of Patterns.listGroups()) {
    if (skipGroups.includes(groupName)) continue;
    result = Patterns.applyGroup(groupName, result);
}

console.log('\nPROCESSED OUTPUT:\n');
console.log(result);

console.log('\n' + '=' .repeat(60));
console.log('PATTERN VERIFICATION');
console.log('=' .repeat(60) + '\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const check of patternsToCheck) {
    const found = check.pattern.test(result);
    const success = found === check.shouldMatch;

    if (success) {
        console.log(`✓ ${check.name}: OBFUSCATED`);
        passed++;
    } else {
        console.log(`✗ ${check.name}: NOT OBFUSCATED <<<< FAIL`);
        failed++;
        failures.push(check.name);
    }
}

console.log('\n' + '=' .repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('=' .repeat(60));

if (failures.length > 0) {
    console.log('\nFAILED PATTERNS:');
    failures.forEach(f => console.log(`  - ${f}`));
}

console.log('\nMAPPINGS CREATED:', Object.keys(Mapper.mappings).length);

process.exit(failed > 0 ? 1 : 0);
