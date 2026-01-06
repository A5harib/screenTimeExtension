document.addEventListener('DOMContentLoaded', async () => {
  await renderDashboard();
});

async function renderDashboard() {
  const today = new Date().toLocaleDateString('en-CA');
  
  // Fetch last 7 days data
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA'));
  }

  const allData = await chrome.storage.local.get(dates);

  // --- Process Today's Data ---
  const todayData = allData[today] || {};
  let todayTotalSeconds = 0;
  const sites = [];

  for (const [domain, seconds] of Object.entries(todayData)) {
    todayTotalSeconds += seconds;
    sites.push({ domain, seconds });
  }
  
  sites.sort((a, b) => b.seconds - a.seconds);

  // Update Stats Cards
  document.getElementById('todayTotal').textContent = formatTime(todayTotalSeconds);
  if (sites.length > 0) {
    document.getElementById('topSite').textContent = sites[0].domain;
  }

  // Update Table
  const tableBody = document.querySelector('#siteTable tbody');
  tableBody.innerHTML = '';
  sites.slice(0, 20).forEach(site => {
    const row = document.createElement('tr');
    const percentage = todayTotalSeconds > 0 ? ((site.seconds / todayTotalSeconds) * 100).toFixed(1) : 0;
    row.innerHTML = `
      <td>${site.domain}</td>
      <td>${formatTime(site.seconds)}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 100px; height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: var(--primary-color);"></div>
          </div>
          ${percentage}%
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // --- Process Weekly Data for Chart ---
  const dailyTotals = dates.map(date => {
    const dayData = allData[date] || {};
    const total = Object.values(dayData).reduce((a, b) => a + b, 0);
    return total / 3600; // Convert to hours for chart
  });

  const chartLabels = dates.map(date => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  // Render Chart
  const ctx = document.getElementById('usageChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Daily Usage (Hours)',
        data: dailyTotals,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#94a3b8' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#334155' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
