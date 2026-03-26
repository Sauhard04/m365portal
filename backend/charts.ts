import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

const width = 800;
const height = 400;

// Transparent background for seamless Word integration
const chartCallback = (ChartJS: any) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
    ChartJS.defaults.font.family = "'Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
};

const canvasRenderService = new ChartJSNodeCanvas({ width, height, chartCallback });

/**
 * Generate a Bar Chart PNG buffer
 */
export async function generateBarChart(labels: string[], data: number[], title: string, xAxisLabel: string = 'Products', yAxisLabel: string = 'Assignments'): Promise<Buffer> {
    const configuration: ChartConfiguration = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Assigned Licenses',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 18 }
                },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: yAxisLabel }
                },
                x: {
                    title: { display: true, text: xAxisLabel },
                    ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 }
                }
            }
        }
    };
    return await canvasRenderService.renderToBuffer(configuration);
}

/**
 * Generate a Pie Chart PNG buffer
 */
export async function generatePieChart(labels: string[], data: number[], title: string, colors?: string[]): Promise<Buffer> {
    const defaultColors = [
        'rgba(75, 192, 192, 0.7)', // Teal
        'rgba(255, 99, 132, 0.7)', // Pink/Red
        'rgba(255, 206, 86, 0.7)', // Yellow
        'rgba(153, 102, 255, 0.7)', // Purple
        'rgba(255, 159, 64, 0.7)'  // Orange
    ];
    
    // Fallback to defaults if specific array not provided
    const bgColors = colors || defaultColors.slice(0, data.length);

    const configuration: ChartConfiguration = {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderColor: bgColors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 18 }
                },
                legend: {
                    position: 'right',
                    labels: { font: { size: 14 } }
                }
            }
        }
    };
    // Make pie charts slightly smaller canvas to avoid excessive white space
    const pieCanvas = new ChartJSNodeCanvas({ width: 600, height: 400, chartCallback });
    return await pieCanvas.renderToBuffer(configuration);
}

/**
 * Generate a Progress Bar (Horizontal Bar Chart) for Secure Score
 */
export async function generateProgressBar(current: number, max: number, title: string): Promise<Buffer> {
    const pct = max > 0 ? (current / max) * 100 : 0;
    const remainder = max > 0 ? 100 - pct : 100;
    
    // Choose color based on health threshold (Low < 40, Med < 75, High >= 75)
    let color = 'rgba(75, 192, 192, 0.8)'; // Green/Teal
    if (pct < 40) color = 'rgba(255, 99, 132, 0.8)'; // Red
    else if (pct < 75) color = 'rgba(255, 206, 86, 0.8)'; // Yellow

    const configuration: ChartConfiguration = {
        type: 'bar',
        data: {
            labels: ['Secure Score'],
            datasets: [
                {
                    label: 'Achieved',
                    data: [pct],
                    backgroundColor: color,
                },
                {
                    label: 'Opportunity',
                    data: [remainder],
                    backgroundColor: 'rgba(200, 200, 200, 0.3)',
                }
            ]
        },
        options: {
            indexAxis: 'y', // Horizontal bar
            plugins: {
                title: {
                    display: true,
                    text: `${title} (${pct.toFixed(1)}%)`,
                    font: { size: 20 }
                },
                legend: { display: false }
            },
            scales: {
                x: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                y: {
                    stacked: true,
                    display: false // Hide y-axis label to look more like a raw progress bar
                }
            }
        }
    };
    
    const barCanvas = new ChartJSNodeCanvas({ width: 800, height: 150, chartCallback });
    return await barCanvas.renderToBuffer(configuration);
}
