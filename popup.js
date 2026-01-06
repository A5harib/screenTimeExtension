document.addEventListener('DOMContentLoaded', async () => {
  const date = new Date().toLocaleDateString('en-CA');
  const data = await chrome.storage.local.get(date);
  const dailyData = data[date] || {};

  // Calculate total time
  let totalSeconds = 0;
  const sites = [];

  for (const [domain, seconds] of Object.entries(dailyData)) {
    totalSeconds += seconds;
    sites.push({ domain, seconds });
  }

  // Sort by time desc
  sites.sort((a, b) => b.seconds - a.seconds);

  // Display Total Time
  document.getElementById('totalTime').textContent = formatTime(totalSeconds);

  // Display Top 5 Sites
  const topSitesContainer = document.getElementById('topSites');
  topSitesContainer.innerHTML = '';
  
  if (sites.length === 0) {
    topSitesContainer.innerHTML = '<div style="text-align:center; color: #94a3b8; padding: 10px;">No activity today</div>';
  } else {
    sites.slice(0, 5).forEach(site => {
      const row = document.createElement('div');
      row.className = 'site-row';
      row.innerHTML = `
        <div class="site-name">${site.domain}</div>
        <div class="site-time">${formatTime(site.seconds)}</div>
      `;
      topSitesContainer.appendChild(row);
    });
  }

  // Open Dashboard
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'dashboard.html' });
  });
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  // const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  } else {
    return `${m}m`;
  }
}
