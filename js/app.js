// CodeBlur App - UI & Orchestration
// Thin controller - uses Config + Obfuscator for logic

class CodeBlur {
    constructor() {
        // State
        this.currentLevel = 0;
        this.currentStyle = Config.DEFAULT_STYLE;
        this.numberThreshold = Config.DEFAULT_NUMBER_THRESHOLD;
        this.mappings = {};
        this.counters = {};
        this.undoStack = [];
        this.patterns = Config.buildPatterns();

        // DOM
        this.editor = document.getElementById('codeEditor');
        this.blurBtn = document.getElementById('blurBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.meterFill = document.getElementById('meterFill');
        this.obfuscationPercent = document.getElementById('obfuscationPercent');
        this.codeHighlight = document.getElementById('codeHighlight');
        this.tokenCount = document.getElementById('tokenCount');
        this.anonStyleSelect = document.getElementById('anonStyle');
        this.numberThresholdSelect = document.getElementById('numberThreshold');
        this.includePromptCheckbox = document.getElementById('includePrompt');

        // Clear button state
        this.clearConfirmPending = false;
        this.clearTimeout = null;

        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    init() {
        this.loadState();
        this.setupEvents();
        this.updateUI();
    }

    loadState() {
        // Style
        const savedStyle = localStorage.getItem('codeblur_style');
        if (savedStyle && Config.STYLES[savedStyle]) {
            this.currentStyle = savedStyle;
            this.anonStyleSelect.value = savedStyle;
        }

        // Number threshold
        const savedThreshold = localStorage.getItem('codeblur_number_threshold');
        if (savedThreshold !== null) {
            this.numberThreshold = parseInt(savedThreshold, 10);
            this.numberThresholdSelect.value = savedThreshold;
        }

        // Mappings
        const saved = localStorage.getItem('codeblur_mappings');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.mappings = data.mappings || {};
                this.counters = data.counters || {};
            } catch (e) { /* ignore */ }
        }

        this.initCounters();
    }

    initCounters() {
        const style = this.getStyle();
        style.prefixes.forEach(p => this.counters[p] = this.counters[p] || 0);
        ['comment', 'guid', 'path', 'func', 'prop', 'field'].forEach(k =>
            this.counters[style[k]] = this.counters[style[k]] || 0
        );
    }

    saveState() {
        localStorage.setItem('codeblur_style', this.currentStyle);
        localStorage.setItem('codeblur_number_threshold', this.numberThreshold.toString());
        localStorage.setItem('codeblur_mappings', JSON.stringify({
            mappings: this.mappings,
            counters: this.counters
        }));
    }

    getStyle() {
        return Config.STYLES[this.currentStyle];
    }

    getState() {
        return {
            mappings: this.mappings,
            counters: this.counters,
            style: this.getStyle(),
            patterns: this.patterns
        };
    }

    // ============================================
    // EVENTS
    // ============================================

    setupEvents() {
        // Buttons
        document.getElementById('blurBtn').addEventListener('click', () => this.applyLevel());
        document.getElementById('deobfuscateBtn').addEventListener('click', () => this.reveal());
        document.getElementById('clearBtn').addEventListener('click', () => this.handleClear());
        document.getElementById('copyCloseBtn').addEventListener('click', () => this.copy());
        document.getElementById('obfuscateStringsBtn').addEventListener('click', () => this.obfuscateStringsOnly());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('askClaudeBtn').addEventListener('click', () => this.askClaude());

        // Selectors
        this.anonStyleSelect.addEventListener('change', (e) => {
            this.currentStyle = e.target.value;
            this.initCounters();
            this.saveState();
            this.toast(`Style: ${this.currentStyle.toUpperCase()}`, 'info');
        });

        this.numberThresholdSelect.addEventListener('change', (e) => {
            this.numberThreshold = parseInt(e.target.value, 10);
            this.saveState();
            this.toast(this.numberThreshold === 0 ? 'Numbers: NEVER' : `Numbers: ${this.numberThreshold}+ digits`, 'info');
        });

        // Editor events - PASTE
        this.editor.addEventListener('paste', () => {
            const wasEmpty = !this.editor.value.trim();
            this.saveUndo();
            this.currentLevel = 0;
            this.updateLevelBtn();
            setTimeout(() => {
                this.applyExistingMappings();
                this.updateUI();
                if (wasEmpty) {
                    this.editor.scrollTop = 0;
                    this.codeHighlight.scrollTop = 0;
                }
            }, 0);
        });

        // Editor events - INPUT
        this.editor.addEventListener('input', (e) => {
            if (e.inputType === 'insertText' && /[\s\.\,\;\:\(\)\{\}\[\]\n]/.test(e.data)) {
                this.autoObfuscateLastWord();
            }
            this.updateUI();
        });

        this.editor.addEventListener('scroll', () => {
            this.codeHighlight.scrollTop = this.editor.scrollTop;
            this.codeHighlight.scrollLeft = this.editor.scrollLeft;
        });

        // Double-click to obfuscate word
        this.editor.addEventListener('dblclick', () => {
            const sel = this.editor.value.substring(this.editor.selectionStart, this.editor.selectionEnd).trim();
            if (sel && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sel)) this.obfuscateWord(sel);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'c' && document.activeElement !== this.editor) {
                e.preventDefault();
                this.copyToClipboard();
            }
        });

        // Clear button reset
        document.addEventListener('click', (e) => {
            if (this.clearConfirmPending && !this.clearBtn.contains(e.target)) {
                this.resetClearBtn();
            }
        });

        this.codeHighlight.addEventListener('click', (e) => {
            if (!e.target.classList.contains('clickable-word')) this.editor.focus();
        });

        this.updateHighlighting();
    }

    // ============================================
    // OBFUSCATION LEVELS
    // ============================================

    applyLevel() {
        if (this.currentLevel >= Config.LEVELS.length) this.currentLevel = 0;

        this.saveUndo();
        const level = Config.LEVELS[this.currentLevel];
        let text = this.editor.value;
        const state = this.getState();

        switch (level) {
            case 'BLUR':
                text = Obfuscator.obfuscateIdentifiers(text, state);
                text = Obfuscator.removeComments(text, state);
                text = Obfuscator.removeEmptyLines(text);
                break;
            case 'ANON':
                text = Obfuscator.obfuscateGuids(text, state);
                text = Obfuscator.obfuscatePaths(text, state);
                text = Obfuscator.obfuscateNumbers(text, state, this.numberThreshold);
                text = Obfuscator.obfuscateStrings(text, state);
                text = Obfuscator.anonymizeComposites(text, state);
                break;
            case 'NUKE':
                text = Obfuscator.nukeCode(text, state);
                break;
        }

        this.editor.value = text;
        this.currentLevel++;
        this.saveState();
        this.updateUI();
        this.toast(`Applied ${level}`, 'success');
    }

    reveal() {
        this.saveUndo();
        const original = this.editor.value;
        const text = Obfuscator.reveal(original, this.mappings);

        this.editor.value = text;
        this.currentLevel = 0;
        this.updateUI();

        if (text === original) {
            this.toast('Nothing to reveal', 'info');
        } else {
            const percent = Obfuscator.calculatePercent(text, this.patterns);
            this.toast(percent > 0 ? `Revealed (${percent}% remaining)` : 'Fully revealed', 'success');
        }
    }

    obfuscateStringsOnly() {
        this.saveUndo();
        const state = this.getState();
        this.editor.value = Obfuscator.obfuscateStrings(this.editor.value, state);
        this.saveState();
        this.updateUI();
        this.toast('Strings obfuscated', 'success');
    }

    obfuscateWord(word) {
        this.saveUndo();
        const state = this.getState();
        const obf = Obfuscator.getMapping(word, state);
        this.editor.value = Obfuscator.replaceWholeWord(this.editor.value, word, obf);
        this.saveState();
        this.updateUI();
        this.toast(`Obfuscated: ${word}`, 'success');
    }

    applyExistingMappings() {
        if (Object.keys(this.mappings).length === 0) return;
        let text = this.editor.value;
        const sorted = Object.entries(this.mappings).sort((a, b) => b[0].length - a[0].length);
        for (const [original, obf] of sorted) {
            if (!original.startsWith('//') && !original.startsWith('/*') &&
                !original.startsWith('#') && !original.startsWith('--') && !original.includes('\n')) {
                text = Obfuscator.replaceWholeWord(text, original, obf);
            }
        }
        this.editor.value = text;
    }

    autoObfuscateLastWord() {
        const text = this.editor.value;
        const pos = this.editor.selectionStart;
        const before = text.substring(0, pos - 1);
        const match = before.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (!match) return;

        const word = match[1];
        const reverse = Object.fromEntries(Object.entries(this.mappings).map(([k, v]) => [v, k]));
        if (reverse[word]) {
            const original = reverse[word];
            const start = pos - 1 - word.length;
            this.editor.value = text.substring(0, start) + original + text.substring(pos - 1);
            this.editor.selectionStart = this.editor.selectionEnd = start + original.length + 1;
        }
    }

    // ============================================
    // UI UPDATES
    // ============================================

    updateUI() {
        this.updateLevelBtn();
        this.updatePercent();
        this.updateHighlighting();
        this.updateMappingCount();
        this.updateTokenCount();
    }

    updateLevelBtn() {
        const idx = this.currentLevel >= Config.LEVELS.length ? 0 : this.currentLevel;
        const level = Config.LEVELS[idx];
        this.blurBtn.textContent = level;
        this.blurBtn.classList.toggle('btn-nuke', level === 'NUKE');
        this.blurBtn.classList.toggle('btn-accent', level !== 'NUKE');
    }

    updatePercent() {
        const percent = Obfuscator.calculatePercent(this.editor.value, this.patterns);
        this.obfuscationPercent.textContent = `${percent}%`;
        this.meterFill.style.width = `${percent}%`;

        // Color based on percentage
        if (percent < 30) {
            this.meterFill.style.background = 'linear-gradient(90deg, #00d4ff, #00ff88)';
        } else if (percent < 70) {
            this.meterFill.style.background = 'linear-gradient(90deg, #00ff88, #ffaa00)';
        } else {
            this.meterFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff4444)';
        }
    }

    updateHighlighting() {
        const text = this.editor.value;
        if (!text) {
            this.codeHighlight.innerHTML = '';
            return;
        }

        let html = this.escapeHtml(text);

        // Highlight obfuscated identifiers
        const sorted = Object.entries(this.mappings).sort((a, b) => b[1].length - a[1].length);
        for (const [original, obf] of sorted) {
            const escaped = obf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'g');
            html = html.replace(regex, `<span class="highlight-obfuscated clickable-word" data-original="${this.escapeHtml(original)}" title="${this.escapeHtml(original)}">${obf}</span>`);
        }

        this.codeHighlight.innerHTML = html;

        // Click handler for highlighted words
        this.codeHighlight.querySelectorAll('.clickable-word').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const orig = el.dataset.original;
                if (orig) {
                    this.saveUndo();
                    this.editor.value = Obfuscator.replaceWholeWord(this.editor.value, el.textContent, orig);
                    this.updateUI();
                    this.toast(`Revealed: ${orig}`, 'info');
                }
            });
        });
    }

    updateMappingCount() {
        const count = Object.keys(this.mappings).length;
        if (!this.clearConfirmPending) {
            this.clearBtn.textContent = `CLEAR (${count})`;
        }
        document.getElementById('dict-count').textContent = count;
    }

    updateTokenCount() {
        const text = this.editor.value;
        const tokens = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        this.tokenCount.textContent = tokens.length;
    }

    // ============================================
    // UNDO / CLEAR
    // ============================================

    saveUndo() {
        this.undoStack.push({
            text: this.editor.value,
            mappings: JSON.parse(JSON.stringify(this.mappings)),
            counters: JSON.parse(JSON.stringify(this.counters)),
            level: this.currentLevel
        });
        if (this.undoStack.length > 20) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.toast('Nothing to undo', 'error');
            return;
        }
        const state = this.undoStack.pop();
        this.editor.value = state.text;
        this.mappings = state.mappings;
        this.counters = state.counters;
        this.currentLevel = state.level;
        this.saveState();
        this.updateUI();
        this.toast('Undo successful', 'success');
    }

    handleClear() {
        if (!this.clearConfirmPending) {
            this.clearConfirmPending = true;
            this.clearBtn.textContent = 'CONFIRM?';
            this.clearBtn.classList.remove('btn-gray-light');
            this.clearBtn.classList.add('btn-danger');
            this.clearTimeout = setTimeout(() => this.resetClearBtn(), 3000);
        } else {
            this.saveUndo();
            this.mappings = {};
            this.counters = {};
            this.initCounters();
            this.currentLevel = 0;
            this.saveState();
            this.resetClearBtn();
            this.updateUI();
            this.toast('Mappings cleared', 'success');
        }
    }

    resetClearBtn() {
        this.clearConfirmPending = false;
        this.updateMappingCount();
        this.clearBtn.classList.remove('btn-danger');
        this.clearBtn.classList.add('btn-gray-light');
        if (this.clearTimeout) {
            clearTimeout(this.clearTimeout);
            this.clearTimeout = null;
        }
    }

    // ============================================
    // COPY / CLAUDE
    // ============================================

    copy() {
        this.copyToClipboard();
    }

    copyToClipboard() {
        const text = this.editor.value;
        if (!text) {
            this.toast('Nothing to copy', 'error');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            this.toast('Copied to clipboard', 'success');
        }).catch(() => {
            this.toast('Failed to copy', 'error');
        });
    }

    askClaude() {
        const code = this.editor.value;
        if (!code.trim()) {
            this.toast('No code to send', 'error');
            return;
        }

        let prompt = code;
        if (this.includePromptCheckbox.checked) {
            prompt = `/*
 * THIS CODE HAS BEEN OBFUSCATED
 * Variable names, strings, and identifiers have been anonymized.
 * Treat all placeholder names as-is - do not attempt to guess or restore original names.
 */

${code}`;
        }

        navigator.clipboard.writeText(prompt).then(() => {
            window.open('https://claude.ai/new', '_blank');
            this.toast('Code copied - opening Claude', 'success');
        }).catch(() => {
            this.toast('Failed to copy', 'error');
        });
    }

    // ============================================
    // HELPERS
    // ============================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.codeblur = new CodeBlur();
});
