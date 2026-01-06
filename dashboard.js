document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSettings();
  await renderDashboard();
});

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Show section
      const tabId = item.getAttribute('data-tab');
      sections.forEach(s => s.style.display = 'none');
      document.getElementById(`${tabId}-section`).style.display = 'block';
    });
  });
}

function setupSettings() {
  const clearBtn = document.getElementById('clearData');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete all tracking data?')) {
        await chrome.storage.local.clear();
        alert('Data cleared.');
        location.reload();
      }
    });
  }
}

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

  // Helper to render rows
  const renderRows = (containerId, items, limit = null) => {
    const tableBody = document.querySelector(`#${containerId} tbody`);
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const dataToRender = limit ? items.slice(0, limit) : items;
    
    dataToRender.forEach(site => {
      if (site.domain === 'null') return; // Filter out nulls
      
      const row = document.createElement('tr');
      const percentage = todayTotalSeconds > 0 ? ((site.seconds / todayTotalSeconds) * 100).toFixed(1) : 0;
      row.innerHTML = `
        <td>${site.domain}</td>
        <td>${formatTime(site.seconds)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 50px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
              <div style="width: ${percentage}%; height: 100%; background: var(--primary-color);"></div>
            </div>
            <span style="font-size: 0.8em">${percentage}%</span>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
  };

  // Render Analytics Table (Full)
  renderRows('siteTable', sites);

  // Render Mini Table (Top 5)
  renderRows('miniSiteTable', sites, 5);

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
        backgroundColor: '#ef4444',
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
  const s = Math.floor(seconds % 60);
  
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m` + (s > 0 ? ` ${s}s` : '');
  return `${s}s`;
}
