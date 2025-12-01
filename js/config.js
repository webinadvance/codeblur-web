// CodeBlur Configuration
// PURE CONSTANTS ONLY - styles and defaults

const Config = {
    STYLES: {
        corporate: {
            prefixes: ['PERSON', 'ENTITY', 'ORG', 'ITEM', 'NAME', 'ID', 'REF'],
            comment: 'COMMENT', guid: 'GUID', path: 'PATH', func: 'FUNC', prop: 'PROP', field: 'FIELD', number: 'NUM', string: 'STR'
        },
        hacker: {
            prefixes: ['X0R', 'H4CK', 'PH1SH', 'CR4CK', 'R00T', 'SH3LL', 'BYT3'],
            comment: 'N0T3', guid: 'H4SH', path: 'L0C', func: 'X3C', prop: 'V4R', field: 'D4T', number: 'NUM', string: 'STR'
        },
        military: {
            prefixes: ['ALPHA', 'BRAVO', 'DELTA', 'ECHO', 'FOXTROT', 'TANGO', 'SIERRA'],
            comment: 'INTEL', guid: 'TARGET', path: 'COORD', func: 'OP', prop: 'ASSET', field: 'RECON', number: 'NUM', string: 'STR'
        },
        minimal: {
            prefixes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
            comment: 'CMT', guid: 'UID', path: 'PTH', func: 'FN', prop: 'P', field: 'F', number: 'NUM', string: 'STR'
        }
    },

    DEFAULT_STYLE: 'minimal',
    DEFAULT_NUMBER_THRESHOLD: 4
};
