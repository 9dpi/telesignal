/**
 * QuantixEngine.js
 * Core simulation logic for Quantix AI Core V1.0
 */

export const STATES = {
    IDLE: 'IDLE',
    ANALYZING: 'ANALYZING',
    WAITING: 'WAITING_FOR_ENTRY',
    ACTIVE: 'ENTRY_HIT',
    CLOSED_TP: 'CLOSED_TP',
    CLOSED_SL: 'CLOSED_SL',
    CLOSED_TIMEOUT: 'CLOSED_TIMEOUT',
    EXPIRED: 'EXPIRED'
};

export class QuantixEngine {
    constructor(callbacks) {
        this.callbacks = callbacks; // onLog, onStateChange, onPriceUpdate, onSignalUpdate
        this.currentPrice = 1.08450;
        this.priceHistory = Array(20).fill(1.08450); // Store last 20 ticks for sparkline
        this.activeSignal = null;
        this.history = [
            { id: 4102, type: 'BUY', entry: '1.08420', status: STATES.CLOSED_TP, result: 'PROFIT' },
            { id: 4095, type: 'SELL', entry: '1.08510', status: STATES.CLOSED_SL, result: 'LOSS' },
            { id: 4088, type: 'BUY', entry: '1.08380', status: STATES.CLOSED_TP, result: 'PROFIT' },
            { id: 4082, type: 'SELL', entry: '1.08600', status: STATES.CLOSED_TP, result: 'PROFIT' },
            { id: 4075, type: 'BUY', entry: '1.08405', status: STATES.EXPIRED, result: 'CANCELLED' }
        ];
        this.autoMode = false;
        this.simSpeed = 2;
        this.tickCounter = 0;

        // Risk Management Configuration
        this.riskConfig = {
            tpPips: 10,
            slPips: 10,
            entryOffsetPips: 5
        };

        this.stats = {
            total: 5,
            wins: 3,
            losses: 1
        };
    }

    start() {
        this.log("Quantix Engine started.", "sys");
        setInterval(() => this.tick(), 1000 / this.simSpeed);
    }

    setRiskConfig(config) {
        this.riskConfig = { ...this.riskConfig, ...config };
        this.log(`Risk Config Updated: TP=${this.riskConfig.tpPips}, SL=${this.riskConfig.slPips}`, "sys");
    }

    tick() {
        this.tickCounter++;

        // 1. Simulate Price Movement
        const volatility = 0.00005;
        this.currentPrice += (Math.random() - 0.5) * volatility;

        // Update history
        this.priceHistory.push(this.currentPrice);
        if (this.priceHistory.length > 20) this.priceHistory.shift();

        this.callbacks.onPriceUpdate(this.currentPrice.toFixed(5), this.priceHistory);

        // 2. State Machine Logic
        if (this.activeSignal) {
            this.processSignalLifecycle();
        } else if (this.autoMode && this.tickCounter % 50 === 0) {
            this.generateSignal();
        }
    }

    generateSignal() {
        if (this.activeSignal) return;

        this.log("Scanning market structure...", "sys");

        setTimeout(() => {
            const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
            const entryOffset = 0.00001 * this.riskConfig.entryOffsetPips;
            const entry = side === 'BUY' ? this.currentPrice + entryOffset : this.currentPrice - entryOffset;

            const tpDist = 0.00001 * this.riskConfig.tpPips;
            const slDist = 0.00001 * this.riskConfig.slPips;

            const tp = side === 'BUY' ? entry + tpDist : entry - tpDist;
            const sl = side === 'BUY' ? entry - slDist : entry + slDist;

            const confidence = Math.floor(Math.random() * 25) + 70;

            this.activeSignal = {
                id: Math.floor(Math.random() * 9000) + 1000,
                type: side,
                entry: entry,
                tp: tp,
                sl: sl,
                confidence: confidence,
                status: STATES.WAITING,
                createdAt: Date.now(),
                entryTime: null,
                telegramId: 'MSG_' + Math.floor(Math.random() * 100000)
            };

            this.log(`New Signal: ${side} (TP:${this.riskConfig.tpPips}, SL:${this.riskConfig.slPips})`, "success");
            this.callbacks.onSignalUpdate(this.activeSignal);
        }, 800);
    }

    processSignalLifecycle() {
        const sig = this.activeSignal;
        const now = Date.now();
        const ageSec = (now - sig.createdAt) / 1000 * this.simSpeed;

        if (sig.status === STATES.WAITING) {
            // Check for Entry
            const priceReached = sig.type === 'BUY'
                ? this.currentPrice >= sig.entry
                : this.currentPrice <= sig.entry;

            if (priceReached) {
                sig.status = STATES.ACTIVE;
                sig.entryTime = now;
                this.log(`[ID ${sig.id}] Entry Hit! Signal is now ACTIVE.`, "success");
                this.callbacks.onSignalUpdate(sig);
            } else if (ageSec > 30) { // Timeout waiting for entry (30 simulated mins simplified)
                this.closeSignal(STATES.EXPIRED, "Entry window expired.");
            }
        }
        else if (sig.status === STATES.ACTIVE) {
            // Check TP
            const tpReached = sig.type === 'BUY'
                ? this.currentPrice >= sig.tp
                : this.currentPrice <= sig.tp;

            // Check SL
            const slReached = sig.type === 'BUY'
                ? this.currentPrice <= sig.sl
                : this.currentPrice >= sig.sl;

            const activeAge = (now - sig.entryTime) / 1000 * this.simSpeed;

            if (tpReached) {
                this.closeSignal(STATES.CLOSED_TP, "Take Profit reached!");
            } else if (slReached) {
                this.closeSignal(STATES.CLOSED_SL, "Stop Loss hit.");
            } else if (activeAge > 90) { // Max active duration
                this.closeSignal(STATES.CLOSED_TIMEOUT, "Active duration limit exceeded.");
            }
        }
    }

    closeSignal(finalStatus, reason) {
        const sig = this.activeSignal;
        sig.status = finalStatus;
        sig.closedAt = Date.now();

        let result = "CANCELLED";
        if (finalStatus === STATES.CLOSED_TP) {
            result = "PROFIT";
            this.stats.wins++;
            this.log(`[ID ${sig.id}] ${reason}`, "success");
        } else if (finalStatus === STATES.CLOSED_SL) {
            result = "LOSS";
            this.stats.losses++;
            this.log(`[ID ${sig.id}] ${reason}`, "danger");
        } else {
            this.log(`[ID ${sig.id}] ${reason}`, "warning");
        }

        this.stats.total++;
        this.history.unshift({
            id: sig.id,
            type: sig.type,
            entry: sig.entry.toFixed(5),
            result: result,
            status: finalStatus
        });

        this.callbacks.onSignalUpdate(sig);
        this.callbacks.onHistoryUpdate(this.history, this.stats);

        // Clear active after a delay
        setTimeout(() => {
            this.activeSignal = null;
            this.callbacks.onSignalUpdate(null);
        }, 2000);
    }
}
