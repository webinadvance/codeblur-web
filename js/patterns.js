// CodeBlur Patterns
// DECLARATIVE PATTERN DEFINITIONS - fully configurable
// Add new patterns here, no code changes needed elsewhere

const Patterns = {
    // ============================================
    // PATTERN DEFINITIONS
    // Each pattern: regex, type (for Mapper), optional filter
    // ============================================

    DEFINITIONS: {
        // ==========================================
        // GUIDS & UNIQUE IDS
        // ==========================================
        guid_standard: {
            regex: /\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?/g,
            type: 'guid'
        },
        guid_hex32: {
            regex: /\b[0-9a-fA-F]{32}\b/g,
            type: 'guid',
            filter: m => !m.startsWith('0x')
        },
        uuid_no_dashes: {
            regex: /\b[0-9a-fA-F]{8}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{4}[0-9a-fA-F]{12}\b/g,
            type: 'guid'
        },
        object_id: {
            // MongoDB ObjectId (24 hex chars)
            regex: /\b[0-9a-fA-F]{24}\b/g,
            type: 'id'
        },

        // ==========================================
        // PATHS & URLs
        // ==========================================
        url: {
            regex: /(https?|ftp|file|ws|wss):\/\/[^\s"'<>]+/g,
            type: 'path'
        },
        path_windows: {
            regex: /[A-Za-z]:\\[^\s"'<>:*?|]+/g,
            type: 'path'
        },
        path_unc: {
            regex: /\\\\[^\s"'<>:*?|]+/g,
            type: 'path'
        },
        path_unix: {
            regex: /(?<=['"`])\/[a-zA-Z][^\s"'<>]*(?=['"`])/g,
            type: 'path'
        },
        path_relative: {
            regex: /(?<=['"`])\.\.?\/[^\s"'<>]+(?=['"`])/g,
            type: 'path'
        },

        // ==========================================
        // NETWORK
        // ==========================================
        ip_v4: {
            regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            type: 'ip'
        },
        ip_v4_port: {
            regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):\d{1,5}\b/g,
            type: 'ip'
        },
        ip_v6: {
            regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
            type: 'ip'
        },
        ip_v6_compressed: {
            regex: /\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b/g,
            type: 'ip'
        },
        mac_address: {
            regex: /\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
            type: 'mac'
        },
        hostname: {
            // server names like server-01, web-prod-03, db-master
            regex: /\b[a-z]+-[a-z0-9]+-?\d*\b/gi,
            type: 'host'
        },
        domain: {
            regex: /\b[a-zA-Z0-9][-a-zA-Z0-9]*\.(com|org|net|io|dev|co|app|cloud|local|internal)\b/g,
            type: 'domain'
        },

        // ==========================================
        // CONTACT
        // ==========================================
        email: {
            regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
            type: 'email'
        },
        phone_us: {
            regex: /(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
            type: 'phone'
        },
        phone_intl: {
            // +44 20 7123 4567 or +44-20-7123-4567 etc
            regex: /\+[0-9]{1,3}[-.\s][0-9]{1,4}[-.\s][0-9]{1,4}[-.\s]?[0-9]{1,9}/g,
            type: 'phone'
        },

        // ==========================================
        // PII (Personally Identifiable Info)
        // ==========================================
        ssn: {
            regex: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
            type: 'ssn'
        },
        credit_card: {
            regex: /\b(?:[0-9]{4}[-\s]?){3}[0-9]{4}\b/g,
            type: 'card'
        },
        passport: {
            regex: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
            type: 'passport'
        },

        // ==========================================
        // STRINGS
        // ==========================================
        string_double: {
            regex: /"([^"\\]|\\.)*"/g,
            type: 'string',
            transform: 'stringContent'
        },
        string_single: {
            regex: /'([^'\\]|\\.)*'/g,
            type: 'string',
            transform: 'stringContent',
            filter: m => m.length > 4
        },
        string_template: {
            regex: /`([^`\\]|\\.)*`/g,
            type: 'string',
            transform: 'templateContent'
        },

        // ==========================================
        // COMMENTS
        // ==========================================
        comment_block: {
            regex: /\/\*([\s\S]*?)\*\//g,
            type: 'comment',
            wrap: ['/* ', ' */']
        },
        comment_xml: {
            regex: /\/\/\/(.*)$/gm,
            type: 'comment',
            wrap: ['/// ', '']
        },
        comment_single: {
            regex: /\/\/(?!\/)(.*)$/gm,
            type: 'comment',
            wrap: ['// ', '']
        },
        comment_python: {
            regex: /(?<!['"])#(?!['"])(.*)$/gm,
            type: 'comment',
            wrap: ['# ', ''],
            filter: m => !m.match(/^#[0-9a-fA-F]{3,8}$/)
        },
        comment_sql: {
            regex: /--(.*)$/gm,
            type: 'comment',
            wrap: ['-- ', '']
        },

        // ==========================================
        // SECRETS & TOKENS
        // ==========================================
        api_key_assignment: {
            regex: /(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|secret[_-]?key)['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{16,})['"]?/gi,
            type: 'secret',
            captureGroup: 1
        },
        jwt: {
            regex: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
            type: 'secret'
        },
        bearer_token: {
            regex: /Bearer\s+([a-zA-Z0-9._-]+)/g,
            type: 'secret',
            captureGroup: 1
        },
        base64_long: {
            regex: /\b[A-Za-z0-9+/]{50,}={0,2}\b/g,
            type: 'secret'
        },
        private_key: {
            regex: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
            type: 'secret'
        },
        password_assignment: {
            regex: /(?:password|passwd|pwd)['"]?\s*[:=]\s*['"]?([^\s'"]{4,})['"]?/gi,
            type: 'secret',
            captureGroup: 1
        },

        // ==========================================
        // TIMESTAMPS & DATES
        // ==========================================
        timestamp_iso: {
            // 2024-01-15T10:30:00.000Z
            regex: /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?\b/g,
            type: 'timestamp'
        },
        timestamp_log: {
            // [2024-01-15 10:30:00] or 2024-01-15 10:30:00,123
            regex: /\b\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:[,.:]\d{1,3})?\b/g,
            type: 'timestamp'
        },
        timestamp_apache: {
            // [15/Jan/2024:10:30:00 +0000]
            regex: /\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]/g,
            type: 'timestamp'
        },
        timestamp_unix: {
            // Unix timestamps (10 or 13 digits)
            regex: /\b1[4-9]\d{8,11}\b/g,
            type: 'timestamp'
        },
        date_slash: {
            // 01/15/2024 or 15/01/2024
            regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
            type: 'date'
        },
        date_dash: {
            // 2024-01-15
            regex: /\b\d{4}-\d{2}-\d{2}\b/g,
            type: 'date'
        },

        // ==========================================
        // LOG-SPECIFIC
        // ==========================================
        session_id: {
            // session=abc123def456, sid=xxx
            regex: /(?:session[_-]?id|session|sid|sess)['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{8,})['"]?/gi,
            type: 'session',
            captureGroup: 1
        },
        request_id: {
            // requestId, req-id, x-request-id, correlation-id
            regex: /(?:request[_-]?id|req[_-]?id|x-request-id|correlation[_-]?id|trace[_-]?id)['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{8,})['"]?/gi,
            type: 'reqid',
            captureGroup: 1
        },
        transaction_id: {
            regex: /(?:transaction[_-]?id|txn[_-]?id|tx[_-]?id)['"]?\s*[:=]\s*['"]?([a-zA-Z0-9_-]{6,})['"]?/gi,
            type: 'txn',
            captureGroup: 1
        },
        user_agent: {
            // Mozilla/5.0... style user agents
            regex: /Mozilla\/[\d.]+\s+\([^)]+\)[^\n]*/g,
            type: 'useragent'
        },
        thread_id: {
            // [thread-123] or thread=abc
            regex: /\[?thread[-_]?\d+\]?/gi,
            type: 'thread'
        },
        process_id: {
            // pid=1234, PID: 5678
            regex: /(?:pid|process[_-]?id)['"]?\s*[:=]\s*(\d+)/gi,
            type: 'pid',
            captureGroup: 1
        },
        http_method_path: {
            // GET /api/users/123
            regex: /(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/[^\s]*/g,
            type: 'endpoint'
        },

        // ==========================================
        // DATABASE
        // ==========================================
        connection_string: {
            // Server=xxx;Database=xxx;User=xxx;Password=xxx
            regex: /(?:Server|Host|Data Source)=[^;]+;[^\n]+/gi,
            type: 'connstring'
        },
        connection_string_url: {
            // postgresql://user:pass@host/db
            regex: /(?:postgresql|mysql|mongodb|redis|sqlserver|mssql):\/\/[^\s"']+/gi,
            type: 'connstring'
        },
        table_reference: {
            // [dbo].[TableName] or schema.table
            regex: /\[?[a-zA-Z_][a-zA-Z0-9_]*\]?\.\[?[a-zA-Z_][a-zA-Z0-9_]*\]?/g,
            type: 'table',
            filter: m => !m.includes('..') && m.length > 3
        },
        column_alias: {
            // AS column_name, as "Column Name"
            regex: /\bAS\s+['"]?([a-zA-Z_][a-zA-Z0-9_]*)['"]?/gi,
            type: 'column',
            captureGroup: 1
        },

        // ==========================================
        // CLOUD & INFRASTRUCTURE
        // ==========================================
        aws_arn: {
            // arn:aws:service:region:account:resource
            regex: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[^\s"']+/g,
            type: 'arn'
        },
        aws_account: {
            // 12-digit AWS account ID
            regex: /\b\d{12}\b/g,
            type: 'account',
            filter: m => m.startsWith('0') || m.startsWith('1') || m.startsWith('2') || m.startsWith('3')
        },
        aws_access_key: {
            regex: /\bAKIA[A-Z0-9]{16}\b/g,
            type: 'secret'
        },
        docker_container_id: {
            // 12 or 64 char hex
            regex: /\b[0-9a-f]{12}(?:[0-9a-f]{52})?\b/g,
            type: 'container',
            filter: m => m.length === 12 || m.length === 64
        },
        k8s_pod_name: {
            // deployment-name-abc123-xyz456
            regex: /\b[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{5,10}-[a-z0-9]{5}\b/g,
            type: 'pod'
        },
        azure_resource_id: {
            regex: /\/subscriptions\/[a-f0-9-]+\/resourceGroups\/[^\s"']+/gi,
            type: 'resource'
        },

        // ==========================================
        // ERROR & STACK TRACES
        // ==========================================
        stack_frame: {
            // at Namespace.Class.Method(File.cs:123)
            regex: /at\s+[\w.]+\([^)]*:\d+\)/g,
            type: 'stackframe'
        },
        exception_type: {
            // System.NullReferenceException, java.lang.NullPointerException
            regex: /\b[A-Z][a-z]+(?:\.[A-Z][a-z]+)+Exception\b/g,
            type: 'exception'
        },
        error_code: {
            // ERROR_CODE_123, ERR-456
            regex: /\b(?:ERROR|ERR)[_-][A-Z0-9_-]+\b/g,
            type: 'errorcode'
        },

        // ==========================================
        // MISC IDENTIFIERS
        // ==========================================
        order_id: {
            regex: /(?:order[_-]?id|order[_-]?number|order[_-]?no)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{6,})['"]?/gi,
            type: 'order',
            captureGroup: 1
        },
        invoice_id: {
            regex: /(?:invoice[_-]?id|invoice[_-]?number|inv[_-]?no)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{6,})['"]?/gi,
            type: 'invoice',
            captureGroup: 1
        },
        customer_id: {
            regex: /(?:customer[_-]?id|cust[_-]?id|client[_-]?id)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{4,})['"]?/gi,
            type: 'customer',
            captureGroup: 1
        },
        user_id: {
            regex: /(?:user[_-]?id|usr[_-]?id|uid)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{4,})['"]?/gi,
            type: 'user',
            captureGroup: 1
        },
        account_number: {
            regex: /(?:account[_-]?number|acct[_-]?no|account[_-]?id)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{6,})['"]?/gi,
            type: 'account',
            captureGroup: 1
        },
        sku: {
            regex: /(?:sku|product[_-]?code|item[_-]?code)['"]?\s*[:=]\s*['"]?([A-Z0-9_-]{4,})['"]?/gi,
            type: 'sku',
            captureGroup: 1
        }
    },

    // ============================================
    // GROUPS - patterns grouped by category
    // ============================================

    GROUPS: {
        // Core groups
        guids: ['guid_standard', 'guid_hex32', 'uuid_no_dashes', 'object_id'],
        paths: ['url', 'path_windows', 'path_unc', 'path_unix', 'path_relative'],
        network: ['ip_v4', 'ip_v4_port', 'ip_v6', 'ip_v6_compressed', 'mac_address', 'hostname', 'domain'],
        contact: ['email', 'phone_us', 'phone_intl'],
        secrets: ['api_key_assignment', 'jwt', 'bearer_token', 'base64_long', 'private_key', 'password_assignment', 'aws_access_key'],
        pii: ['ssn', 'credit_card', 'passport'],
        strings: ['string_double', 'string_single'],
        comments: ['comment_block', 'comment_xml', 'comment_single', 'comment_python', 'comment_sql'],

        // Log-specific groups
        timestamps: ['timestamp_iso', 'timestamp_log', 'timestamp_apache', 'timestamp_unix', 'date_slash', 'date_dash'],
        sessions: ['session_id', 'request_id', 'transaction_id', 'thread_id', 'process_id'],
        http: ['http_method_path', 'user_agent'],
        errors: ['stack_frame', 'exception_type', 'error_code'],

        // Database groups
        database: ['connection_string', 'connection_string_url', 'table_reference', 'column_alias'],

        // Cloud/Infra groups
        cloud: ['aws_arn', 'aws_account', 'docker_container_id', 'k8s_pod_name', 'azure_resource_id'],

        // Business identifiers
        business: ['order_id', 'invoice_id', 'customer_id', 'user_id', 'account_number', 'sku'],

        // Combo groups for convenience
        all_ids: ['guid_standard', 'guid_hex32', 'uuid_no_dashes', 'object_id', 'session_id', 'request_id', 'transaction_id'],
        all_sensitive: ['ssn', 'credit_card', 'passport', 'email', 'phone_us', 'phone_intl'],
        logs: ['timestamp_iso', 'timestamp_log', 'timestamp_apache', 'session_id', 'request_id', 'thread_id', 'process_id', 'user_agent', 'http_method_path']
    },

    // ============================================
    // APPLY METHODS
    // ============================================

    apply(patternName, text, options = {}) {
        const p = this.DEFINITIONS[patternName];
        if (!p) return text;

        return text.replace(p.regex, (match, ...args) => {
            if (p.filter && !p.filter(match)) return match;

            let value = p.captureGroup !== undefined ? args[p.captureGroup - 1] : match;

            if (p.transform === 'stringContent') {
                return this.transformString(match, p.type, options);
            }
            if (p.transform === 'templateContent') {
                return this.transformTemplate(match, p.type, options);
            }

            if (p.wrap) {
                const content = args[0];
                return `${p.wrap[0]}${Mapper.get(content, p.type)}${p.wrap[1]}`;
            }

            if (p.captureGroup !== undefined) {
                return match.replace(value, Mapper.get(value, p.type));
            }

            return Mapper.get(match, p.type);
        });
    },

    applyGroup(groupName, text, options = {}) {
        const patternNames = this.GROUPS[groupName];
        if (!patternNames) return text;

        for (const name of patternNames) {
            text = this.apply(name, text, options);
        }
        return text;
    },

    applyGroups(groupNames, text, options = {}) {
        for (const group of groupNames) {
            text = this.applyGroup(group, text, options);
        }
        return text;
    },

    // ============================================
    // STRING TRANSFORMS
    // ============================================

    transformString(match, type, options) {
        const quote = match[0];
        const content = match.slice(1, -1);

        if (!content || content.trim() === '') return match;
        if (content.includes('{') && content.includes('}')) return match;
        if (Mapper.isFullyObfuscated(content)) return match;

        return `${quote}${Mapper.get(content, type)}${quote}`;
    },

    transformTemplate(match, type, options) {
        const content = match.slice(1, -1);
        if (!content || Mapper.isFullyObfuscated(content)) return match;
        if (content.includes('${')) return match;

        return `\`${Mapper.get(content, type)}\``;
    },

    // ============================================
    // UTILITIES
    // ============================================

    list() { return Object.keys(this.DEFINITIONS); },
    listGroups() { return Object.keys(this.GROUPS); },
    getGroup(groupName) { return this.GROUPS[groupName] || []; },
    has(patternName) { return patternName in this.DEFINITIONS; },

    addPattern(name, definition) {
        this.DEFINITIONS[name] = definition;
    },

    addToGroup(groupName, patternName) {
        if (!this.GROUPS[groupName]) this.GROUPS[groupName] = [];
        if (!this.GROUPS[groupName].includes(patternName)) {
            this.GROUPS[groupName].push(patternName);
        }
    },

    // Create a new group from existing patterns
    createGroup(groupName, patternNames) {
        this.GROUPS[groupName] = patternNames.filter(n => this.has(n));
    }
};
