// Global variables
let allData = [];
let currentDate = null;

// Load data for a specific date
async function loadData(dateStr) {
    try {
        const response = await fetch(`processed_data_${dateStr}.json`);
        if (!response.ok) throw new Error('فایل یافت نشد');
        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

// Calculate market OI based on money flow logic
function calculateMarketOI(data) {
    let totalBuyOI = 0;
    let totalSellOI = 0;
    let filteredCount = 0;
    
    data.forEach(item => {
        // فیلتر: فقط نمادهایی که حجم 7 روزه >= حجم ماهانه
        if (item.volume_7days >= item.monthly_volume) {
            filteredCount++;
            
            // محاسبه OI خرید
            if (item.buy_ratio < 1) {
                // خرید قوی - میله سبز به بالا
                totalBuyOI += (1 - item.buy_ratio) * item.volume_7days;
            } else {
                // عدم خرید - میله سبز به پایین
                totalBuyOI -= (item.buy_ratio - 1) * item.volume_7days;
            }
            
            // محاسبه OI فروش
            if (item.sell_ratio > 1) {
                // فروش قوی - میله قرمز به بالا
                totalSellOI += (item.sell_ratio - 1) * item.volume_7days;
            } else {
                // عدم فروش - میله قرمز به پایین
                totalSellOI -= (1 - item.sell_ratio) * item.volume_7days;
            }
        }
    });
    
    console.log(`تعداد نمادهای فیلتر شده: ${filteredCount} از ${data.length}`);
    
    return {
        buyOI: totalBuyOI,
        sellOI: totalSellOI,
        filteredSymbols: filteredCount,
        totalSymbols: data.length
    };
}

// Draw market OI chart
function drawMarketOIChart(marketData) {
    const ctx = document.getElementById('marketOIChart').getContext('2d');
    
    // Clear previous chart if exists
    if (window.marketChart) {
        window.marketChart.destroy();
    }
    
    window.marketChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['OI خرید (Buy)', 'OI فروش (Sell)'],
            datasets: [{
                label: 'Open Interest کل بازار',
                data: [marketData.buyOI, marketData.sellOI],
                backgroundColor: [
                    marketData.buyOI >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
                    marketData.sellOI >= 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    marketData.buyOI >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                    marketData.sellOI >= 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: {
                            size: 14,
                            family: 'Vazirmatn'
                        }
                    }
                },
                title: {
                    display: true,
                    text: `نمودار OI کل بازار - ${currentDate ? persianDate(currentDate) : ''}`,
                    font: {
                        size: 16,
                        family: 'Vazirmatn',
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const label = context.label;
                            const direction = value >= 0 ? 'مثبت' : 'منفی';
                            return [
                                `${label}: ${Math.abs(value).toFixed(2)}`,
                                `جهت: ${direction}`,
                                value >= 0 ? 
                                    (label.includes('خرید') ? '🟢 تمایل به خرید' : '🔴 تمایل به فروش') :
                                    (label.includes('خرید') ? '📉 عدم خرید' : '📈 عدم فروش')
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'مقدار OI (وزن‌دار با حجم)',
                        font: {
                            family: 'Vazirmatn'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 14,
                            family: 'Vazirmatn'
                        }
                    }
                }
            }
        }
    });
    
    // نمایش آمار در کنار نمودار
    updateMarketStats(marketData);
}

// Update market statistics
function updateMarketStats(marketData) {
    const statsDiv = document.getElementById('marketStats');
    if (!statsDiv) return;
    
    const buyStrength = Math.abs(marketData.buyOI);
    const sellStrength = Math.abs(marketData.sellOI);
    const netOI = marketData.buyOI + marketData.sellOI;
    
    statsDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item ${marketData.buyOI >= 0 ? 'positive' : 'negative'}">
                <span class="stat-label">قدرت خرید:</span>
                <span class="stat-value">${buyStrength.toFixed(2)}</span>
                <span class="stat-direction">${marketData.buyOI >= 0 ? '↑' : '↓'}</span>
            </div>
            <div class="stat-item ${marketData.sellOI >= 0 ? 'negative' : 'positive'}">
                <span class="stat-label">قدرت فروش:</span>
                <span class="stat-value">${sellStrength.toFixed(2)}</span>
                <span class="stat-direction">${marketData.sellOI >= 0 ? '↑' : '↓'}</span>
            </div>
            <div class="stat-item ${netOI >= 0 ? 'positive' : 'negative'}">
                <span class="stat-label">خالص OI:</span>
                <span class="stat-value">${Math.abs(netOI).toFixed(2)}</span>
                <span class="stat-direction">${netOI >= 0 ? '⬆️' : '⬇️'}</span>
            </div>
            <div class="stat-item neutral">
                <span class="stat-label">نمادهای فعال:</span>
                <span class="stat-value">${marketData.filteredSymbols} از ${marketData.totalSymbols}</span>
            </div>
        </div>
    `;
}

// Convert date format
function persianDate(dateStr) {
    // تبدیل 144040730 به 1404/07/30
    if (!dateStr) return '';
    const cleaned = dateStr.replace('14', '');
    return `${cleaned.slice(0,4)}/${cleaned.slice(4,6)}/${cleaned.slice(6,8)}`;
}

// Initialize date selector
function initDateSelector() {
    const selector = document.getElementById('dateSelector');
    
    // لیست تاریخ‌های موجود
    const availableDates = [
        { value: '14040726', label: '1404/07/26' },
        { value: '14040727', label: '1404/07/27' },
        { value: '14040728', label: '1404/07/28' },
        { value: '14040729', label: '1404/07/29' },
        { value: '14040730', label: '1404/07/30' }
    ];
    
    selector.innerHTML = '<option value="">-- تاریخ را انتخاب کنید --</option>';
    availableDates.forEach(date => {
        selector.innerHTML += `<option value="${date.value}">${date.label}</option>`;
    });
    
    selector.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        if (!selectedDate) return;
        
        currentDate = selectedDate;
        const data = await loadData(selectedDate);
        
        if (data) {
            allData = data;
            const marketOI = calculateMarketOI(data);
            drawMarketOIChart(marketOI);
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDateSelector();
});
