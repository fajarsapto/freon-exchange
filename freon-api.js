(() => {
  'use strict';

  async function refreshFreonData() {
    try {
      const [historyResponse, rateResponse] = await Promise.all([
        fetch('/api/price-history?range=24h', { cache: 'no-store' }),
        fetch('/api/settings/eth-usd', { cache: 'no-store' })
      ]);

      if (!historyResponse.ok || !rateResponse.ok) {
        throw new Error('API tidak merespons dengan sukses');
      }

      const history = await historyResponse.json();
      const rate = await rateResponse.json();

      window.dispatchEvent(new CustomEvent('freon:history', {
        detail: { range: '24h', history }
      }));

      window.dispatchEvent(new CustomEvent('freon:eth-usd', {
        detail: rate
      }));
    } catch (error) {
      console.error('FREON EXCHANGE:', error.message);
    }
  }

  window.FreonAPI = { refresh: refreshFreonData };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshFreonData);
  } else {
    refreshFreonData();
  }

  window.setInterval(refreshFreonData, 60000);
})();
