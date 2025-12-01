// CodeBlur Configuration
// Pure data - no logic

const Config = {
    // Obfuscation levels
    LEVELS: ['BLUR', 'ANON', 'NUKE'],

    // Style presets for different naming conventions
    STYLES: {
        corporate: {
            prefixes: ['PERSON', 'ENTITY', 'ORG', 'ITEM', 'NAME', 'ID', 'REF'],
            comment: 'COMMENT', guid: 'GUID', path: 'PATH', func: 'FUNC', prop: 'PROP', field: 'FIELD'
        },
        hacker: {
            prefixes: ['X0R', 'H4CK', 'PH1SH', 'CR4CK', 'R00T', 'SH3LL', 'BYT3'],
            comment: 'N0T3', guid: 'H4SH', path: 'L0C', func: 'X3C', prop: 'V4R', field: 'D4T'
        },
        military: {
            prefixes: ['ALPHA', 'BRAVO', 'DELTA', 'ECHO', 'FOXTROT', 'TANGO', 'SIERRA'],
            comment: 'INTEL', guid: 'TARGET', path: 'COORD', func: 'OP', prop: 'ASSET', field: 'RECON'
        },
        minimal: {
            prefixes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
            comment: 'CMT', guid: 'UID', path: 'PTH', func: 'FN', prop: 'P', field: 'F'
        }
    },

    // Default settings
    DEFAULT_STYLE: 'minimal',
    DEFAULT_NUMBER_THRESHOLD: 4,

    // Build detection patterns from all styles
    buildPatterns() {
        const allPrefixes = [];
        Object.values(this.STYLES).forEach(style => {
            style.prefixes.forEach(p => allPrefixes.push(p));
            allPrefixes.push(style.comment, style.guid, style.path, style.func, style.prop, style.field);
        });
        allPrefixes.sort((a, b) => b.length - a.length);
        const pattern = allPrefixes.join('|');
        return {
            contains: new RegExp(`(${pattern})\\d{2,}`),      // has PREFIX + 2+ digits
            fully: new RegExp(`^(${pattern})\\d+$`)           // ONLY PREFIX + digits
        };
    }
};
