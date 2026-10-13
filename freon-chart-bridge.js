(() => {
  'use strict';

  let currentRange = '1h';
  let latestHistory = [];
  let latestRate = null;
  let loading = false;

  async function refresh() {
    if (loading) return;
    loading = true;

    try {
      const [historyResponse, rateResponse] = await Promise.all([
        fetch('/api/price-history?range=' + currentRange, {
          cache: 'no-store'
        }),
        fetch('/api/settings/eth-usd', {
          cache: 'no-store'
        })
      ]);

      if (!historyResponse.ok || !rateResponse.ok) {
        throw new Error('API harga tidak tersedia');
      }

      const historyData = await historyResponse.json();
      latestRate = await rateResponse.json();

      latestHistory = Array.isArray(historyData)
        ? historyData
        : historyData.data || historyData.history || [];

      window.dispatchEvent(new CustomEvent('freon:history', {
        detail: {
          range: currentRange,
          history: latestHistory
        }
      }));

      window.dispatchEvent(new CustomEvent('freon:eth-usd', {
        detail: latestRate
      }));

      console.info(
        '[FREON] Data grafik diterima:',
        latestHistory.length,
        'baris'
      );
    } catch (error) {
      console.error('[FREON]', error.message);
    } finally {
      loading = false;
    }
  }

  window.FreonServerHistory = () => latestHistory;
  window.FreonServerRate = () => latestRate;

window.FreonChartBridge = {
    refresh,
    setRange(value) {
      if (!['1h', '24h'].includes(value)) return;
      currentRange = value;
      refresh();
    },
    getHistory: () => latestHistory,
    getRate: () => latestRate
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('#chart1hBtn, #chart24hBtn');
    if (!button) return;

    currentRange = button.id === 'chart1hBtn' ? '1h' : '24h';
    refresh();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  window.setInterval(refresh, 60000);
})();


/* FREON_HISTORY_ADAPTER */
(() => {
  const key = 'freon_frn_price_history_v1';

  window.addEventListener('freon:history', (event) => {
    const payload = event.detail;
    const rows = Array.isArray(payload)
      ? payload
      : (payload && (payload.data || payload.history));

    if (!Array.isArray(rows)) return;

    const points = rows.map(row => {
      const t = new Date(row.recorded_at || row.t || row.timestamp).getTime();
      const ethUsd = Number(row.eth_price_usd);
      const usd = Number(row.frn_price_usd);
      const p = Number(row.p ?? (ethUsd > 0 ? usd / ethUsd : NaN));
      return {t, p};
    }).filter(x => Number.isFinite(x.t) &&
                   Number.isFinite(x.p) && x.p > 0)
      .sort((a, b) => a.t - b.t);

    if (!points.length) return;

    try {
      localStorage.setItem(key, JSON.stringify(points));
      if (typeof window.drawPriceChart === 'function') {
        window.drawPriceChart();
      }
    } catch (e) {
      console.error('FREON chart adapter:', e);
    }
  });
})();
