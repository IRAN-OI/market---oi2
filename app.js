// app.js نسخه بهبود یافته با نمایش چند روز و خط روند

// Global variables
let allDaysData = {};
let chartInstance = null;

// Available dates
const AVAILABLE_DATES = [
    { value: '14040726', label: '1404/07/26' },
    { value: '14040727', label: '1404/07/27' },
    { value: '14040728', label: '1404/07/28' },
    { value: '14040729', label: '1404/07/29' },
    { value: '14040730', label: '1404/07/30' }
];

// Load all data files at startup
async function loadAllData() {
    const loadPromises = AVAILABLE_DATES.map(async (date) => {
        try {
            const response = await fetch(`processed_data_${date.value}.json`);
            if (response.ok) {
                const data = await response.json();
                const marketOI = calculateMarketOI(data);
                return {
                    date: date.value,
                    label: date.label,
                    ...marketOI
                };
            }
        } catch (error) {
            console.error(`Error loading ${date.value}:`, error);
        }
        return null;
    });
    
    const results = await Promise.all(loadPromises);
    return results.filter(r => r !== null);
}

// Calculate market OI (همون فرمول قبلی)
function calculateMarketOI(data) {
    let totalBuyOI = 0;
    let totalSellOI = 0;
    let filteredCount = 0;
    
    data.forEach(item => {
        // فیلتر: فقط نمادهایی که حجم 7 روزه >= حجم ماهانه
        if (item.volume_7days >= item.monthly_volume) {
            filteredCount++;
            
            // محاسبه OI خرید با فرمول نهایی
            if (item.buy_ratio < 1) {
                totalBuyOI += (1 - item.buy_ratio) * item.volume_7days;
            } else {
                totalBuyOI -= (item.buy_ratio - 1) * item.volume_7days;
            }
            
            // محاسبه OI فروش با فرمول نهایی
            if (item.sell_ratio > 1) {
                totalSellOI += (item.sell_ratio - 1) * item.volume_7days;
            } else {
                totalSellOI -= (1 - item.sell_ratio) * item.volume_7days;
            }
        }
    });
    
    return {
        buyOI: totalBuyOI,
        sellOI: totalSellOI,
        netOI: totalBuyOI + totalSellOI, // خالص OI
        filteredSymbols: filteredCount,
        totalSymbols: data.length
    };
}

// Draw combined chart with trend line
function drawCombinedChart(daysData) {
    const ctx = document.getElementById('marketOIChart').getContext('2d');
    
    // Destroy previous chart if exists
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Prepare data for chart
    const labels = daysData.map(d => d.label);
    const buyData = daysData.map(d => d.buyOI);
    const sellData = daysData.map(d => d.sellOI);
    const netTrend = daysData.map(d => d.netOI);
    
    // Calculate trend line (moving average)
    const trendLine = calculateTrendLine(netTrend);
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'OI خرید',
                    data: buyData,
                    backgroundColor: buyData.map(v => v >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
                    borderColor: buyData.map(v => v >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'),
                    borderWidth: 2,
                    order: 2
                },
                {
                    label: 'OI فروش',
                    data: sellData,
                    backgroundColor: sellData.map(v => v >= 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.7)'),
                    borderColor: sellData.map(v => v >= 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'),
                    borderWidth: 2,
                    order: 2
                },
                {
                    label: 'روند خالص OI',
                    data: netTrend,
                    type: 'line',
                    borderColor: 'rgba(251, 191, 36, 1)',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    order: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'خط روند',
                    data: trendLine,
                    type: 'line',
                    borderColor: 'rgba(156, 163, 175, 0.8)',
                    borderDash: [10, 5],
                    borderWidth: 2,
                    fill: false,
                    order: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            family: 'Vazirmatn'
                        },
                        usePointStyle: true,
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: 'مقایسه OI بازار در روزهای مختلف',
                    font: {
                        size: 18,
                        family: 'Vazirmatn',
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleFont: {
                        size: 14,
                        family: 'Vazirmatn'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Vazirmatn'
                    },
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const datasetLabel = context.dataset.label;
                            
                            if (datasetLabel.includes('روند')) {
                                return `${datasetLabel}: ${value.toFixed(2)}`;
                            }
                            
                            const direction = value >= 0 ? 'مثبت' : 'منفی';
                            let emoji = '';
                            
                            if (datasetLabel === 'OI خرید') {
                                emoji = value >= 0 ? '🟢' : '🔻';
                            } else if (datasetLabel === 'OI فروش') {
                                emoji = value >= 0 ? '🔴' : '🔻';
                            }
                            
                            return `${emoji} ${datasetLabel}: ${Math.abs(value).toFixed(2)} (${direction})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Vazirmatn'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'مقدار OI (وزن‌دار با حجم)',
                        font: {
                            family: 'Vazirmatn',
                            size: 13
                        }
                    },
                    ticks: {
                        font: {
                            family: 'Vazirmatn'
                        },
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
    
    // Update statistics
    updateCombinedStats(daysData);
}

// Calculate trend line (simple moving average)
function calculateTrendLine(data) {
    const trendLine = [];
    const window = 2; // میانگین متحرک 2 روزه
    
    for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
            trendLine.push(data[i]);
        } else {
            let sum = 0;
            for (let j = 0; j < window; j++) {
                sum += data[i - j];
            }
            trendLine.push(sum / window);
        }
    }
    
    return trendLine;
}

// Update combined statistics
function updateCombinedStats(daysData) {
    const statsDiv = document.getElementById('marketStats');
    if (!statsDiv || daysData.length === 0) return;
    
    // محاسبه آمار کلی
    const latestDay = daysData[daysData.length - 1];
    const firstDay = daysData[0];
    
    const buyChange = ((latestDay.buyOI - firstDay.buyOI) / Math.abs(firstDay.buyOI) * 100).toFixed(1);
    const sellChange = ((latestDay.sellOI - firstDay.sellOI) / Math.abs(firstDay.sellOI) * 100).toFixed(1);
    const netChange = latestDay.netOI - firstDay.netOI;
    
    // محاسبه میانگین
    const avgBuy = daysData.reduce((sum, d) => sum + d.buyOI, 0) / daysData.length;
    const avgSell = daysData.reduce((sum, d) => sum + d.sellOI, 0) / daysData.length;
    
    statsDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item ${latestDay.buyOI >= 0 ? 'positive' : 'negative'}">
                <span class="stat-label">آخرین OI خرید:</span>
                <span class="stat-value">${Math.abs(latestDay.buyOI).toFixed(2)}</span>
                <span class="stat-change ${buyChange >= 0 ? 'up' : 'down'}">
                    ${buyChange > 0 ? '+' : ''}${buyChange}%
                </span>
            </div>
            <div class="stat-item ${latestDay.sellOI >= 0 ? 'negative' : 'positive'}">
                <span class="stat-label">آخرین OI فروش:</span>
                <span class="stat-value">${Math.abs(latestDay.sellOI).toFixed(2)}</span>
                <span class="stat-change ${sellChange >= 0 ? 'up' : 'down'}">
                    ${sellChange > 0 ? '+' : ''}${sellChange}%
                </span>
            </div>
            <div class="stat-item ${latestDay.netOI >= 0 ? 'positive' : 'negative'}">
                <span class="stat-label">خالص OI:</span>
                <span class="stat-value">${Math.abs(latestDay.netOI).toFixed(2)}</span>
                <span class="stat-direction">${latestDay.netOI >= 0 ? '⬆️' : '⬇️'}</span>
            </div>
            <div class="stat-item neutral">
                <span class="stat-label">تغییر از ابتدا:</span>
                <span class="stat-value">${Math.abs(netChange).toFixed(2)}</span>
                <span class="stat-direction">${netChange >= 0 ? '📈' : '📉'}</span>
            </div>
            <div class="stat-item neutral">
                <span class="stat-label">میانگین OI خرید:</span>
                <span class="stat-value">${Math.abs(avgBuy).toFixed(2)}</span>
            </div>
            <div class="stat-item neutral">
                <span class="stat-label">میانگین OI فروش:</span>
                <span class="stat-value">${Math.abs(avgSell).toFixed(2)}</span>
            </div>
        </div>
    `;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading
    const