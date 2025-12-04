// CodeBlur App
// UI ONLY - DOM events, display updates, localStorage

class CodeBlur {
    constructor() {
        this.level = 0;
        this.styleName = Config.DEFAULT_STYLE;
        this.numberThreshold = Config.DEFAULT_NUMBER_THRESHOLD;
        this.undoStack = [];
        this.clearPending = false;
        this.clearTimer = null;

        // DOM refs
        this.editor = document.getElementById('codeEditor');
        this.highlight = document.getElementById('codeHighlight');
        this.blurBtn = document.getElementById('blurBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.meterFill = document.getElementById('meterFill');
        this.percentEl = document.getElementById('obfuscationPercent');
        this.tokenEl = document.getElementById('tokenCount');
        this.dictEl = document.getElementById('dict-count');
        this.styleSelect = document.getElementById('anonStyle');
        this.thresholdSelect = document.getElementById('numberThreshold');
        this.includePrompt = document.getElementById('includePrompt');
        this.fullStringObfuscation = document.getElementById('fullStringObfuscation');

        this.init();
    }

    // ============================================
    // INIT
    // ============================================

    init() {
        this.loadState();
        Mapper.init(this.styleName);
        this.bindEvents();
        this.updateUI();
    }

    loadState() {
        const style = localStorage.getItem('codeblur_style');
        if (style && Config.STYLES[style]) {
            this.styleName = style;
            this.styleSelect.value = style;
        }

        const threshold = localStorage.getItem('codeblur_number_threshold');
        if (threshold !== null) {
            this.numberThreshold = parseInt(threshold, 10);
            this.thresholdSelect.value = threshold;
        }

        const saved = localStorage.getItem('codeblur_mappings');
        if (saved) {
            try { Mapper.load(JSON.parse(saved)); } catch (e) { /* ignore */ }
        }

        const fullStrings = localStorage.getItem('codeblur_full_string_obfuscation');
        if (fullStrings !== null) {
            this.fullStringObfuscation.checked = fullStrings === 'true';
        }
    }

    saveState() {
        localStorage.setItem('codeblur_style', this.styleName);
        localStorage.setItem('codeblur_number_threshold', String(this.numberThreshold));
        localStorage.setItem('codeblur_mappings', JSON.stringify(Mapper.save()));
        localStorage.setItem('codeblur_full_string_obfuscation', String(this.fullStringObfuscation.checked));
    }

    // ============================================
    // EVENTS
    // ============================================

    bindEvents() {
        document.getElementById('blurBtn').onclick = () => this.blur();
        document.getElementById('deobfuscateBtn').onclick = () => this.reveal();
        document.getElementById('clearBtn').onclick = () => this.clear();
        document.getElementById('copyCloseBtn').onclick = () => this.copy();
        document.getElementById('obfuscateStringsBtn').onclick = () => this.blurStrings();
        document.getElementById('undoBtn').onclick = () => this.undo();
        document.getElementById('askClaudeBtn').onclick = () => this.askClaude();

        this.styleSelect.onchange = (e) => {
            this.styleName = e.target.value;
            Mapper.init(this.styleName);
            this.saveState();
            this.toast(`Style: ${this.styleName.toUpperCase()}`);
        };

        this.thresholdSelect.onchange = (e) => {
            this.numberThreshold = parseInt(e.target.value, 10);
            this.saveState();
            this.toast(this.numberThreshold === 0 ? 'Numbers: NEVER' : `Numbers: ${this.numberThreshold}+ digits`);
        };

        this.fullStringObfuscation.onchange = () => {
            this.saveState();
            this.toast(this.fullStringObfuscation.checked ? 'Full string obfuscation: ON' : 'Full string obfuscation: OFF');
        };

        this.editor.addEventListener('paste', () => this.onPaste());
        this.editor.addEventListener('input', (e) => this.onInput(e));
        this.editor.addEventListener('scroll', () => this.syncScroll());
        this.editor.addEventListener('dblclick', () => this.onDblClick());

        document.addEventListener('keydown', (e) => this.onKeydown(e));
        document.addEventListener('click', (e) => {
            if (this.clearPending && !this.clearBtn.contains(e.target)) this.resetClearBtn();
        });

        this.highlight.addEventListener('click', (e) => {
            if (!e.target.classList.contains('clickable-word')) this.editor.focus();
        });
    }

    onPaste() {
        const wasEmpty = !this.editor.value.trim();
        this.saveUndo();
        this.level = 0;
        this.updateBlurBtn();
        setTimeout(() => {
            this.editor.value = Transform.applyMappings(this.editor.value);
            this.updateUI();
            if (wasEmpty) {
                this.editor.scrollTop = 0;
                this.highlight.scrollTop = 0;
            }
        }, 0);
    }

    onInput(e) {
        if (e.inputType === 'insertText' && /[\s\.\,\;\:\(\)\{\}\[\]\n]/.test(e.data)) {
            this.autoReplace();
        }
        this.updateUI();
    }

    onDblClick() {
        const sel = this.editor.value.substring(this.editor.selectionStart, this.editor.selectionEnd).trim();
        if (sel && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sel)) {
            this.saveUndo();
            this.editor.value = Transform.replaceWord(this.editor.value, sel, Mapper.get(sel));
            this.saveState();
            this.updateUI();
            this.toast(`Obfuscated: ${sel}`);
        }
    }

    onKeydown(e) {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
        if (e.ctrlKey && e.key === 'c' && document.activeElement !== this.editor) { e.preventDefault(); this.copy(); }
    }

    syncScroll() {
        this.highlight.scrollTop = this.editor.scrollTop;
        this.highlight.scrollLeft = this.editor.scrollLeft;
    }

    autoReplace() {
        const text = this.editor.value;
        const pos = this.editor.selectionStart;
        const match = text.substring(0, pos - 1).match(/\b([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (!match) return;

        const reverse = Mapper.getReverse();
        if (reverse[match[1]]) {
            const original = reverse[match[1]];
            const start = pos - 1 - match[1].length;
            this.editor.value = text.substring(0, start) + original + text.substring(pos - 1);
            this.editor.selectionStart = this.editor.selectionEnd = start + original.length + 1;
        }
    }

    // ============================================
    // ACTIONS - Uses Levels pipeline
    // ============================================

    blur() {
        if (this.level >= Levels.count()) this.level = 0;
        this.saveUndo();

        const levelName = Levels.next(this.level);
        const options = {
            anonNumbers: this.numberThreshold,
            fullStringObfuscation: this.fullStringObfuscation.checked
        };

        this.editor.value = Levels.execute(levelName, this.editor.value, options);
        this.level++;
        this.saveState();
        this.updateUI();
        this.toast(`Applied ${levelName}`);
    }

    reveal() {
        this.saveUndo();
        const before = this.editor.value;
        const after = Transform.reveal(before);

        this.editor.value = after;
        this.level = 0;
        this.updateUI();

        if (after === before) {
            this.toast('Nothing to reveal');
        } else {
            const pct = Mapper.calcPercent(after);
            this.toast(pct > 0 ? `Revealed (${pct}% remaining)` : 'Fully revealed');
        }
    }

    blurStrings() {
        this.saveUndo();
        this.editor.value = Transform.anonStrings(this.editor.value);
        this.saveState();
        this.updateUI();
        this.toast('Strings obfuscated');
    }

    copy() {
        const text = this.editor.value;
        if (!text) return this.toast('Nothing to copy', 'error');
        navigator.clipboard.writeText(text)
            .then(() => this.toast('Copied to clipboard'))
            .catch(() => this.toast('Failed to copy', 'error'));
    }

    askClaude() {
        const code = this.editor.value;
        if (!code.trim()) return this.toast('No code to send', 'error');

        let prompt = code;
        if (this.includePrompt.checked) {
            prompt = `/*\n * THIS CODE HAS BEEN OBFUSCATED\n * Variable names, strings, and identifiers have been anonymized.\n * Treat all placeholder names as-is - do not attempt to guess or restore original names.\n */\n\n${code}`;
        }

        navigator.clipboard.writeText(prompt)
            .then(() => { window.open('https://claude.ai/new', '_blank'); this.toast('Code copied - opening Claude'); })
            .catch(() => this.toast('Failed to copy', 'error'));
    }

    // ============================================
    // UNDO / CLEAR
    // ============================================

    saveUndo() {
        this.undoStack.push({
            text: this.editor.value,
            mappings: JSON.parse(JSON.stringify(Mapper.mappings)),
            counters: JSON.parse(JSON.stringify(Mapper.counters)),
            level: this.level
        });
        if (this.undoStack.length > 20) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return this.toast('Nothing to undo', 'error');
        const state = this.undoStack.pop();
        this.editor.value = state.text;
        Mapper.mappings = state.mappings;
        Mapper.counters = state.counters;
        this.level = state.level;
        this.saveState();
        this.updateUI();
        this.toast('Undo successful');
    }

    clear() {
        if (!this.clearPending) {
            this.clearPending = true;
            this.clearBtn.textContent = 'CONFIRM?';
            this.clearBtn.classList.replace('btn-gray-light', 'btn-danger');
            this.clearTimer = setTimeout(() => this.resetClearBtn(), 3000);
        } else {
            this.saveUndo();
            Mapper.clear();
            this.level = 0;
            this.saveState();
            this.resetClearBtn();
            this.updateUI();
            this.toast('Mappings cleared');
        }
    }

    resetClearBtn() {
        this.clearPending = false;
        this.clearBtn.textContent = `CLEAR (${Mapper.count()})`;
        this.clearBtn.classList.replace('btn-danger', 'btn-gray-light');
        if (this.clearTimer) { clearTimeout(this.clearTimer); this.clearTimer = null; }
    }

    // ============================================
    // UI UPDATES
    // ============================================

    updateUI() {
        this.updateBlurBtn();
        this.updatePercent();
        this.updateHighlight();
        this.updateCounts();
    }

    updateBlurBtn() {
        const name = Levels.next(this.level >= Levels.count() ? 0 : this.level);
        this.blurBtn.textContent = name;
        this.blurBtn.classList.toggle('btn-nuke', name === 'NUKE');
        this.blurBtn.classList.toggle('btn-accent', name !== 'NUKE');
    }

    updatePercent() {
        const pct = Mapper.calcPercent(this.editor.value);
        this.percentEl.textContent = `${pct}%`;
        this.meterFill.style.width = `${pct}%`;
        const colors = pct < 30 ? '#00d4ff, #00ff88' : pct < 70 ? '#00ff88, #ffaa00' : '#ffaa00, #ff4444';
        this.meterFill.style.background = `linear-gradient(90deg, ${colors})`;
    }

    updateHighlight() {
        const text = this.editor.value;
        if (!text) { this.highlight.innerHTML = ''; return; }

        let html = this.escapeHtml(text);
        const entries = Object.entries(Mapper.mappings);

        if (entries.length > 0) {
            // Build reverse lookup: obfuscated -> original
            const reverseLookup = Object.fromEntries(entries.map(([orig, obf]) => [obf, orig]));

            // Sort by length descending to match longer tokens first (STR001 before STR00)
            const sortedObfs = entries.map(([, obf]) => obf).sort((a, b) => b.length - a.length);
            const escapedObfs = sortedObfs.map(obf => obf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

            // No word boundaries - allows matching consecutive tokens like G001STR001
            const combinedPattern = new RegExp(`(${escapedObfs.join('|')})`, 'g');

            html = html.replace(combinedPattern, (match) => {
                const original = reverseLookup[match];
                if (original) {
                    const escaped = this.escapeHtml(original);
                    return `<span class="highlight-obfuscated clickable-word" data-original="${escaped}" title="${escaped}">${match}</span>`;
                }
                return match;
            });
        }

        this.highlight.innerHTML = html;

        this.highlight.querySelectorAll('.clickable-word').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                if (el.dataset.original) {
                    this.saveUndo();
                    this.editor.value = Transform.replaceWord(this.editor.value, el.textContent, el.dataset.original);
                    this.updateUI();
                    this.toast(`Revealed: ${el.dataset.original}`);
                }
            };
        });
    }

    updateCounts() {
        const count = Mapper.count();
        if (!this.clearPending) this.clearBtn.textContent = `CLEAR (${count})`;
        this.dictEl.textContent = count;
        this.tokenEl.textContent = (this.editor.value.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []).length;
    }

    // ============================================
    // HELPERS
    // ============================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toast(msg, type = 'success') {
        const el = document.getElementById('toast');
        el.textContent = msg;
        el.className = `toast toast-${type} show`;
        setTimeout(() => el.classList.remove('show'), 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => window.codeblur = new CodeBlur());
