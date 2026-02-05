import { QuantixEngine, STATES } from './simulation.js';

// DOM Elements
const elPrice = document.getElementById('curr-price');
const elLogs = document.getElementById('simulation-logs');
const elHistory = document.getElementById('history-body');
const elWinRate = document.getElementById('win-rate');
const elTotalSignals = document.getElementById('total-signals');
const elBtnTrigger = document.getElementById('btn-trigger-signal');
const elAutoCheck = document.getElementById('auto-mode');
const elSparkline = document.getElementById('eurusd-sparkline');
const elCfgTp = document.getElementById('cfg-tp');
const elCfgSl = document.getElementById('cfg-sl');
const elTabs = document.querySelectorAll('.nav-tab');
const elMonitorGrid = document.querySelector('.monitor-grid');

// Safety checks and initialization
const elHistorySection = elMonitorGrid ? elMonitorGrid.children[0] : null;
const elTerminalSection = elMonitorGrid ? elMonitorGrid.children[1] : null;

// Initialize Engine
const engine = new QuantixEngine({
    onLog: (msg, type) => addLog(msg, type),
    onPriceUpdate: (price, history) => {
        if (elPrice) elPrice.textContent = price;
        renderSparkline(history);
    },
    onSignalUpdate: (signal) => renderActiveRow(),
    onHistoryUpdate: (history, stats) => renderHistory(history, stats)
});

// Start Engine
engine.start();

// Tab Switching Logic
elTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        elTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabText = tab.textContent.trim();
        addLog(`Switching view to: ${tabText}`, 'sys');

        if (!elMonitorGrid || !elHistorySection || !elTerminalSection) return;

        if (tabText === "Live Signals Monitor") {
            elMonitorGrid.style.display = 'grid';
            elHistorySection.style.display = 'flex';
            elTerminalSection.style.display = 'flex';
        } else if (tabText === "System Logs") {
            elMonitorGrid.style.display = 'block';
            elHistorySection.style.display = 'none';
            elTerminalSection.style.display = 'flex';
            elTerminalSection.style.height = '100%';
        } else if (tabText === "Risk Config") {
            elMonitorGrid.style.display = 'block';
            elHistorySection.style.display = 'none';
            elTerminalSection.style.display = 'none';
            addLog("Risk Management Quick-Panel is active in the navigation bar.", "sys");
        }
    });
});

// Event Listeners
if (elBtnTrigger) {
    elBtnTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        addLog("Manual Analysis Triggered...", "sys");
        elBtnTrigger.innerText = "ANALYZING...";
        elBtnTrigger.disabled = true;

        engine.generateSignal();

        setTimeout(() => {
            elBtnTrigger.innerText = "GENERATE SIGNAL";
            elBtnTrigger.disabled = false;
        }, 1200);
    });
}

if (elAutoCheck) {
    elAutoCheck.addEventListener('change', (e) => {
        engine.autoMode = e.target.checked;
        addLog(`Auto Engine: ${engine.autoMode ? 'ACTIVE' : 'STANDBY'}`, engine.autoMode ? 'success' : 'sys');
    });
}

[elCfgTp, elCfgSl].forEach(el => {
    if (el) {
        el.addEventListener('change', () => {
            engine.setRiskConfig({
                tpPips: parseInt(elCfgTp.value) || 10,
                slPips: parseInt(elCfgSl.value) || 10
            });
        });
    }
});

// Helpers
function renderSparkline(history) {
    if (!history || history.length < 2 || !elSparkline) return;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = (max - min) || 0.0001;
    const points = history.map((val, i) => {
        const x = (i / (history.length - 1)) * 60;
        const y = 20 - ((val - min) / range) * 20;
        return `${x},${y}`;
    }).join(' ');
    elSparkline.innerHTML = `<polyline points="${points}" />`;
}

function addLog(msg, type) {
    if (!elLogs) return;
    const div = document.createElement('div');
    const logClass = type === 'success' ? 'log-success' : (type === 'danger' ? 'log-danger' : 'log-sys');
    div.className = `log-entry ${logClass}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    elLogs.appendChild(div);
    elLogs.scrollTop = elLogs.scrollHeight;
}

function renderActiveRow() { refreshTable(); }

function refreshTable() {
    renderHistory(engine.history, engine.stats);
    if (engine.activeSignal && elHistory) {
        const sig = engine.activeSignal;
        const tr = document.createElement('tr');
        tr.style.background = 'rgba(0, 242, 254, 0.05)';
        tr.innerHTML = `
            <td>#${sig.id}</td>
            <td class="type-${sig.type.toLowerCase()}">${sig.type}</td>
            <td class="price-mono">${stateToPrice(sig.entry)}</td>
            <td class="price-mono" style="color:#10b981">${stateToPrice(sig.tp)}</td>
            <td class="price-mono" style="color:#ef4444">${stateToPrice(sig.sl)}</td>
            <td><span class="pill pill-teal">${sig.status.replace(/_/g, ' ')}</span></td>
            <td><span class="pill pill-dark">PENDING</span></td>
        `;
        elHistory.insertBefore(tr, elHistory.firstChild);
    }
}

function stateToPrice(val) { return typeof val === 'number' ? val.toFixed(5) : val; }

function renderHistory(history, stats) {
    if (!elHistory) return;
    elHistory.innerHTML = '';
    history.forEach(item => {
        const tr = document.createElement('tr');
        const pillClass = item.result === 'PROFIT' ? 'pill-green' : (item.result === 'LOSS' ? 'pill-dark' : 'pill-dark');
        tr.innerHTML = `
            <td>#${item.id}</td>
            <td class="type-${item.type.toLowerCase()}">${item.type}</td>
            <td class="price-mono">${item.entry}</td>
            <td>-</td><td>-</td>
            <td><span class="pill pill-dark">${item.status.replace(/_/g, ' ')}</span></td>
            <td><span class="pill ${pillClass}">${item.result}</span></td>
        `;
        elHistory.appendChild(tr);
    });
    if (elTotalSignals) elTotalSignals.textContent = stats.total;
    if (elWinRate) elWinRate.textContent = `${(stats.total > 0 ? (stats.wins / stats.total * 100) : 0).toFixed(1)}%`;
    if (window.lucide) lucide.createIcons();
}

// Initial Sync
setTimeout(() => { refreshTable(); addLog("Quantix Terminal Ready.", "success"); }, 200);
