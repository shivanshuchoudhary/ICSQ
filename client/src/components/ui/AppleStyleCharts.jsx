import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { capitalizeFirstLetter } from '../../Constants';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Apple-style WebChart for light backgrounds
export const AppleWebChart = ({ detailedScores }) => {
  const labels = Object.keys(detailedScores || {});
  const dataPoints = Object.values(detailedScores || {});

  // Helper to wrap label text and add score
  function wrapLabelWithScore(label, score, maxLen = 14) {
    let baseLabel = label.length <= maxLen ? capitalizeFirstLetter(label) : (() => {
      const words = label.split(' ');
      let lines = [];
      let currentLine = '';
      for (let word of words) {
        if ((currentLine + ' ' + word).trim().length > maxLen) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += ' ' + word;
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      return lines.map(line => capitalizeFirstLetter(line)).join('\n');
    })();
    // Add score on a new line for clarity
    return `${baseLabel}\n(${score !== undefined && score !== null ? score.toFixed(2) : 0}%)`;
  }

  const data = {
    labels: labels.map((label, idx) => wrapLabelWithScore(label, dataPoints[idx])),
    datasets: [
      {
        label: 'Score',
        data: dataPoints,
        backgroundColor: 'rgba(71, 85, 105, 0.15)', // slate-600 with transparency
        borderColor: 'rgba(51, 65, 85, 0.8)', // slate-700
        pointBackgroundColor: 'rgba(15, 23, 42, 1)', // slate-900
        pointBorderColor: 'rgba(148, 163, 184, 0.5)', // slate-400
        pointHoverBackgroundColor: 'rgba(51, 65, 85, 1)', // slate-700
        pointHoverBorderColor: 'rgba(15, 23, 42, 1)', // slate-900
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    layout: {
      padding: 10,
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
          color: '#64748b', // slate-500 for light background
          font: {
            size: 10,
            weight: '300',
          },
        },
        grid: {
          color: 'rgba(71, 85, 105, 0.15)', // slate-600 with transparency
          lineWidth: 1,
        },
        angleLines: {
          color: 'rgba(71, 85, 105, 0.2)', // slate-600
          lineWidth: 1,
        },
        pointLabels: {
          font: {
            size: 11,
            weight: '400',
          },
          color: '#334155', // slate-700 - dark text for light background
          callback: function(value) {
            return value.split('\n');
          }
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // slate-900
        titleColor: '#f1f5f9', // slate-100
        bodyColor: '#e2e8f0', // slate-200
        borderColor: '#475569', // slate-600
        borderWidth: 1,
        padding: 12,
        bodyFont: {
          size: 13,
          weight: '400',
        },
        titleFont: {
          size: 14,
          weight: '500',
        },
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.formattedValue}%`;
          },
        },
      },
    },
  };

  return (
    <div className="flex justify-center items-center w-full bg-transparent">
      <Radar data={data} options={options} />
    </div>
  );
};

// Apple-style WebChart for dark backgrounds with higher contrast - Enhanced with multiple datasets
export const AppleWebChartDark = ({ detailedScores, businessAvg, businessTarget }) => {
  const labels = Object.keys(detailedScores || {});
  const departmentDataPoints = Object.values(detailedScores || {});

  // Create business average and target arrays with same values for all categories
  const businessAvgPoints = labels.map(() => businessAvg || 0);
  const businessTargetPoints = labels.map(() => businessTarget || 85);

  function wrapLabel(label, maxLen = 14) {
    let baseLabel = label.length <= maxLen ? capitalizeFirstLetter(label) : (() => {
      const words = label.split(' ');
      let lines = [];
      let currentLine = '';
      for (let word of words) {
        if ((currentLine + ' ' + word).trim().length > maxLen) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += ' ' + word;
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      return lines.map(line => capitalizeFirstLetter(line)).join('\n');
    })();
    return baseLabel;
  }

  const data = {
    labels: labels.map(label => wrapLabel(label)),
    datasets: [
      {
        label: 'Business Target',
        data: businessTargetPoints,
        backgroundColor: 'rgba(249, 115, 22, 0.1)', // vibrant orange with low opacity
        borderColor: 'rgba(249, 115, 22, 0.9)', // orange-500
        pointBackgroundColor: 'rgba(249, 115, 22, 1)',
        pointBorderColor: 'rgba(234, 88, 12, 1)', // orange-600
        pointHoverBackgroundColor: 'rgba(251, 146, 60, 1)', // orange-400
        pointHoverBorderColor: 'rgba(234, 88, 12, 1)',
        borderWidth: 3,
        borderDash: [5, 5], // Dashed line for target
        pointRadius: 5,
      },
      {
        label: 'Business Average',
        data: businessAvgPoints,
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // emerald green with low opacity
        borderColor: 'rgba(16, 185, 129, 0.9)', // emerald-500
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointBorderColor: 'rgba(5, 150, 105, 1)', // emerald-600
        pointHoverBackgroundColor: 'rgba(52, 211, 153, 1)', // emerald-400
        pointHoverBorderColor: 'rgba(5, 150, 105, 1)',
        borderWidth: 3,
        pointRadius: 5,
      },
      {
        label: 'Department Average',
        data: departmentDataPoints,
        backgroundColor: 'rgba(6, 182, 212, 0.15)', // bright cyan with low opacity
        borderColor: 'rgba(6, 182, 212, 0.9)', // cyan-500
        pointBackgroundColor: 'rgba(6, 182, 212, 1)',
        pointBorderColor: 'rgba(8, 145, 178, 1)', // cyan-600
        pointHoverBackgroundColor: 'rgba(34, 211, 238, 1)', // cyan-400
        pointHoverBorderColor: 'rgba(8, 145, 178, 1)',
        borderWidth: 3,
        pointRadius: 5,
      },
    ],
  };

  // Custom plugin to show only Department Average values (cleanest approach)
  const dataLabelsPlugin = {
    id: 'dataLabelsPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      
      // Only show labels for Department Average dataset (last one)
      const departmentDatasetIndex = chart.data.datasets.length - 1;
      const dataset = chart.data.datasets[departmentDatasetIndex];
      const meta = chart.getDatasetMeta(departmentDatasetIndex);
      
      meta.data.forEach((element, index) => {
        const value = dataset.data[index];
        const { x, y } = element.tooltipPosition();
        
        // Calculate position offset from center
        const centerX = chart.width / 2;
        const centerY = chart.height / 2;
        const angle = Math.atan2(y - centerY, x - centerX);
        
        // Position label outside the point
        const offsetDistance = 35;
        const labelX = x + Math.cos(angle) * offsetDistance;
        const labelY = y + Math.sin(angle) * offsetDistance;
        
        ctx.save();
        
        // Cyan color for Department Average
        const bgColor = 'rgba(6, 182, 212, 0.95)';
        const textColor = '#ffffff';
        const borderColor = 'rgba(8, 145, 178, 1)';
        
        // Compact badge
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        const text = `${Math.round(value)}%`;
        const textWidth = ctx.measureText(text).width;
        const padding = 6;
        const rectWidth = textWidth + padding * 2;
        const rectHeight = 20;
        const rectX = labelX - rectWidth / 2;
        const rectY = labelY - rectHeight / 2;
        const radius = 5;
        
        // Draw shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Draw background with rounded corners
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + rectWidth - radius, rectY);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius);
        ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
        ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight);
        ctx.lineTo(rectX + radius, rectY + rectHeight);
        ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.fillText(text, labelX, labelY);
        
        ctx.restore();
      });
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    layout: { padding: 45 },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'transparent',
          color: '#e2e8f0', // slate-200
          font: { size: 10, weight: '300' },
        },
        grid: {
          color: 'rgba(241, 245, 249, 0.15)', // slate-100
          lineWidth: 1,
        },
        angleLines: {
          color: 'rgba(241, 245, 249, 0.2)',
          lineWidth: 1,
        },
        pointLabels: {
          font: { size: 11, weight: '500' },
          color: '#f1f5f9', // slate-100
          callback: function(value) { return value.split('\n'); }
        },
      },
    },
    plugins: {
      legend: { 
        display: true,
        position: 'bottom',
        labels: {
          color: '#e2e8f0',
          font: { size: 12, weight: '500' },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      tooltip: {
        backgroundColor: 'rgba(2, 6, 23, 0.95)', // slate-950
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 13, weight: '500' },
        callbacks: {
          label: function (context) { 
            return `${context.dataset.label}: ${context.formattedValue}%`; 
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col justify-center items-center w-full h-full bg-transparent">
      <Radar data={data} options={options} plugins={[dataLabelsPlugin]} />
    </div>
  );
};

// Apple-style BarChart for light backgrounds
export const AppleBarChart = ({ data, height = 300, width = "100%" }) => {
  const maxValue = Math.max(...data.map((item) => item.score || 0))
  const containerHeight = typeof height === 'number' ? height : 300

  return (
    <div style={{ height: `${containerHeight}px`, width }} className="relative">
      <div className="flex h-full justify-center items-end gap-6 px-4">
        {data.map((item, index) => {
          // Calculate bar height in pixels
          const barHeight = Math.max((item.score / maxValue) * (containerHeight * 0.6), 20)
          
          return (
            <div key={index} className="flex flex-col justify-end items-center flex-1 max-w-28">
              {/* Score value above bar */}
              <div className="text-sm font-light text-slate-900 mb-2">
                {item.score}%
              </div>
              
              {/* Bar with gradient */}
              <div
                className="bg-gradient-to-t from-slate-700 to-slate-600 rounded-t-lg transition-all duration-300 hover:from-slate-800 hover:to-slate-700 shadow-sm"
                style={{ 
                  height: `${barHeight}px`,
                  width: '40px'
                }}
              ></div>
              
              {/* Label below bar */}
              <div className="text-xs font-light text-slate-600 text-center mt-2 leading-tight px-1">
                {item.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
};

// Apple-style BarChart for dark backgrounds with color-coded bars
export const AppleBarChartDark = ({ data, height = 300, width = "100%", showReferenceLine = false }) => {
  const maxValue = Math.max(...data.map((item) => item.score || 0))
  const containerHeight = typeof height === 'number' ? height : 300

  // Color mapping to match radar chart colors
  const getBarColors = (name) => {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('target')) {
      // Vibrant Orange for Business Target
      return {
        gradient: 'from-orange-500 to-orange-400',
        hover: 'hover:from-orange-400 hover:to-orange-300',
        shadow: 'shadow-lg shadow-orange-500/30'
      };
    } else if (nameLower.includes('business') && nameLower.includes('avg')) {
      // Emerald Green for Business Average
      return {
        gradient: 'from-emerald-500 to-emerald-400',
        hover: 'hover:from-emerald-400 hover:to-emerald-300',
        shadow: 'shadow-lg shadow-emerald-500/30'
      };
    } else if (nameLower.includes('department')) {
      // Bright Cyan for Department Average
      return {
        gradient: 'from-cyan-500 to-cyan-400',
        hover: 'hover:from-cyan-400 hover:to-cyan-300',
        shadow: 'shadow-lg shadow-cyan-500/30'
      };
    }
    
    // Default fallback
    return {
      gradient: 'from-slate-300 to-slate-200',
      hover: 'hover:from-slate-200 hover:to-slate-100',
      shadow: 'shadow'
    };
  };

  // Calculate bar heights for reference lines
  const barHeights = data.map((item) => Math.max((item.score / maxValue) * (containerHeight * 0.6), 20));
  
  // Calculate gaps between consecutive bars
  const gaps = [];
  for (let i = 0; i < data.length - 1; i++) {
    gaps.push({
      gap: Math.abs(data[i].score - data[i + 1].score),
      start: i,
      end: i + 1,
      startScore: data[i].score,
      endScore: data[i + 1].score
    });
  }

  // Get Business Target and Business Avg values for reference lines
  const businessTargetValue = data.find(item => item.name.toLowerCase().includes('target'))?.score;
  const businessAvgValue = data.find(item => item.name.toLowerCase().includes('business') && item.name.toLowerCase().includes('avg'))?.score;

  // Calculate base offset (label height at bottom + margin + legend height)
  // mt-3 = 12px, text height ~20px = 32px
  // pb-8 = 32px (padding on bars container)
  // legend height ~24px
  const bottomOffset = 64; // Height of label text, padding, and legend at bottom
  
  return (
    <div style={{ height: `${containerHeight}px`, width }} className="relative">
      {/* Horizontal reference lines without labels */}
      {showReferenceLine && businessTargetValue && (
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{
            bottom: `${(businessTargetValue / maxValue) * (containerHeight * 0.6) + bottomOffset}px`,
            height: '0px'
          }}
        >
          <div 
            className="absolute left-0 right-0" 
            style={{ 
              borderTop: '3px dashed #f97316',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.4)'
            }}
          ></div>
        </div>
      )}
      
      {showReferenceLine && businessAvgValue && (
        <div 
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{
            bottom: `${(businessAvgValue / maxValue) * (containerHeight * 0.6) + bottomOffset}px`,
            height: '0px'
          }}
        >
          <div 
            className="absolute left-0 right-0" 
            style={{ 
              borderTop: '3px dashed #10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
            }}
          ></div>
        </div>
      )}

      {/* Legend labels at the bottom */}
      {showReferenceLine && (businessTargetValue || businessAvgValue) && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 pb-2">
          {businessTargetValue && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-orange-500" style={{ boxShadow: '0 0 8px rgba(249, 115, 22, 0.5)' }}></div>
              <span className="text-xs font-bold text-orange-400">
                Business Goal ({businessTargetValue}%)
              </span>
            </div>
          )}
          {businessAvgValue && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-emerald-500" style={{ boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }}></div>
              <span className="text-xs font-bold text-emerald-400">
                Business Avg ({businessAvgValue.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex h-full justify-center items-end gap-8 px-4 pb-8">
        {data.map((item, index) => {
          const barHeight = barHeights[index];
          const colors = getBarColors(item.name);

          return (
            <div key={index} className="flex flex-col justify-end items-center flex-1 max-w-32">
              <div className="text-sm font-semibold text-slate-100 mb-2">
                {item.score}%
              </div>
              <div
                className={`bg-gradient-to-t ${colors.gradient} rounded-t-xl transition-all duration-300 ${colors.hover} ${colors.shadow}`}
                style={{ 
                  height: `${barHeight}px`,
                  width: '50px'
                }}
              ></div>
              <div className="text-xs font-medium text-slate-300 text-center mt-3 leading-tight px-1">
                {item.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
};

