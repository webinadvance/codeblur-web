// CodeBlur Levels
// CONFIGURABLE PIPELINES
// BLUR = Auto-apply ALL patterns, ANON = Aggressive word-by-word, NUKE = Everything

const Levels = {
    // ============================================
    // LEVEL DEFINITIONS
    // ============================================

    // BLUR: Auto-applies ALL patterns from Patterns.GROUPS
    // IMPORTANT: Patterns FIRST, then identifiers (so patterns aren't broken)
    BLUR: [
        'blurAllPatterns',      // FIRST: Detect IPs, emails, GUIDs, etc.
        'blurIdentifiers',      // THEN: Catch remaining code identifiers
        'removeEmptyLines'
    ],

    // ANON: Aggressive - catch everything else
    ANON: [
        'anonNumbers',          // Large numbers
        'anonStrings',          // String contents
        'anonComposites',       // Partially obfuscated words
        'anonRemainingIds'      // Any remaining identifiers
    ],

    // NUKE: Everything - no mercy
    NUKE: [
        'nuke'
    ],

    // ============================================
    // CONFIGURATION
    // ============================================

    ORDER: ['BLUR', 'ANON', 'NUKE'],

    // ============================================
    // EXECUTION
    // ============================================

    execute(levelName, text, options = {}) {
        const pipeline = this[levelName];
        if (!pipeline) return text;

        for (const transformName of pipeline) {
            const fn = Transform[transformName];
            if (fn) {
                text = fn.call(Transform, text, options[transformName]);
            }
        }
        return text;
    },

    next(currentIndex) {
        return this.ORDER[currentIndex] || this.ORDER[0];
    },

    count() {
        return this.ORDER.length;
    },

    // ============================================
    // RUNTIME CONFIGURATION
    // ============================================

    getTransforms(levelName) {
        return this[levelName] || [];
    },

    addTransform(levelName, transformName, position = -1) {
        if (!this[levelName]) return;
        if (position < 0) {
            this[levelName].push(transformName);
        } else {
            this[levelName].splice(position, 0, transformName);
        }
    },

    removeTransform(levelName, transformName) {
        if (!this[levelName]) return;
        const idx = this[levelName].indexOf(transformName);
        if (idx >= 0) this[levelName].splice(idx, 1);
    },

    addLevel(name, transforms, afterLevel = null) {
        this[name] = transforms;
        if (afterLevel) {
            const idx = this.ORDER.indexOf(afterLevel);
            if (idx >= 0) {
                this.ORDER.splice(idx + 1, 0, name);
                return;
            }
        }
        const nukeIdx = this.ORDER.indexOf('NUKE');
        if (nukeIdx >= 0) {
            this.ORDER.splice(nukeIdx, 0, name);
        } else {
            this.ORDER.push(name);
        }
    },

    // ============================================
    // PRESETS - Override BLUR with specific groups
    // ============================================

    PRESETS: {
        // Minimal: Just identifiers and comments
        minimal: {
            BLUR: ['blurIdentifiers', 'blurComments', 'removeEmptyLines']
        },

        // Code only: No log/server patterns
        code: {
            BLUR: ['blurIdentifiers', 'blurComments', 'blurGuids', 'blurPaths', 'blurSecrets', 'removeEmptyLines']
        },

        // Logs only: Focus on server/log patterns
        logs: {
            BLUR: ['blurNetwork', 'blurTimestamps', 'blurSessions', 'blurHttp', 'blurDatabase', 'blurCloud', 'blurErrors', 'blurBusiness', 'removeEmptyLines']
        },

        // Privacy: Focus on PII
        privacy: {
            BLUR: ['blurContact', 'blurPii', 'blurSecrets', 'blurBusiness', 'removeEmptyLines']
        },

        // Full: Auto-apply all (default)
        full: {
            BLUR: ['blurAllPatterns', 'blurIdentifiers', 'removeEmptyLines']
        }
    },

    applyPreset(presetName) {
        const preset = this.PRESETS[presetName];
        if (preset) {
            Object.assign(this, preset);
        }
    }
};
