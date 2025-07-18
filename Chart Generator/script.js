
        let userUploadedFile = false;
        let originalCharts = [];
        let filteredCharts = [];
        let chartInstances = {};
        let rawData = null;
        let dataAnalysis = null;

        document.getElementById('jsonFile').addEventListener('change', handleFileUpload);
        document.getElementById('loadSampleData').addEventListener('click', loadSampleData);
        document.getElementById('resetFilters').addEventListener('click', resetFilters);

        document.querySelector('.file-input-button').addEventListener('click', function () {
            document.getElementById('jsonFile').click();
        });


        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            userUploadedFile = true; 

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    processData(jsonData);
                    showMessage('JSON data analyzed and visualized successfully!', 'success');
                } catch (error) {
                    showMessage('Error parsing JSON file: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }


        function loadSampleData() {
            processData(sampleData);
            showMessage('Sample data loaded and analyzed!', 'success');
        }

        function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = `<div class="${type}-message">${text}</div>`;
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        }

        function processData(data) {
    if (!data.charts || !Array.isArray(data.charts)) {
        showMessage("Uploaded JSON does not contain a valid 'charts' array.", 'error');
        return;
    }

    originalCharts = data.charts;
    filteredCharts = [...originalCharts];

    updateChartTypeFilter();
    generateStats(true);
    generateCharts();

    document.getElementById('controls').style.display = 'block';
    document.getElementById('dashboard').style.display = 'grid';
    document.getElementById('dataPreview').style.display = 'none';

    showMessage(`Loaded ${originalCharts.length} chart(s) from your JSON file.`, 'success');
}

        function analyzeField(data, fieldName) {
            const values = data.map(item => item && item[fieldName]).filter(v => v !== undefined && v !== null);
            const fieldInfo = {
                name: fieldName,
                type: 'mixed',
                values: values,
                uniqueCount: new Set(values).size,
                totalCount: values.length
            };

            if (values.length === 0) return fieldInfo;

            // Determine field type
            const types = values.map(v => typeof v);
            const uniqueTypes = new Set(types);

            if (uniqueTypes.size === 1) {
                fieldInfo.type = types[0];
            }

            // Additional analysis for numbers
            if (fieldInfo.type === 'number') {
                fieldInfo.min = Math.min(...values);
                fieldInfo.max = Math.max(...values);
                fieldInfo.avg = values.reduce((a, b) => a + b, 0) / values.length;
            }

            // Check if it's categorical
            if (fieldInfo.uniqueCount <= Math.min(10, fieldInfo.totalCount / 2)) {
                fieldInfo.isCategorical = true;
                fieldInfo.categories = [...new Set(values)];
            }

            return fieldInfo;
        }

        function createHistogramBuckets(sortedValues, bucketCount) {
            const min = sortedValues[0];
            const max = sortedValues[sortedValues.length - 1];
            const bucketSize = (max - min) / bucketCount;

            const buckets = {
                labels: [],
                counts: []
            };

            for (let i = 0; i < bucketCount; i++) {
                const bucketStart = min + i * bucketSize;
                const bucketEnd = min + (i + 1) * bucketSize;
                const count = sortedValues.filter(v => v >= bucketStart && (i === bucketCount - 1 ? v <= bucketEnd : v < bucketEnd)).length;

                buckets.labels.push(`${bucketStart.toFixed(1)}-${bucketEnd.toFixed(1)}`);
                buckets.counts.push(count);
            }

            return buckets;
        }
        function getDataType(data) {
            if (Array.isArray(data)) return 'array';
            if (data === null) return 'null';
            return typeof data;
        }

        function updateChartTypeFilter() {
            const typeFilter = document.getElementById('chartTypeFilter');
            const types = [...new Set(originalCharts.map(chart => chart.type))];

            // Clear existing options except "All Types"
            typeFilter.innerHTML = '<option value="">All Types</option>';

            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Charts';
                typeFilter.appendChild(option);
            });
        }

        function applyFilters() {
            const typeFilter = document.getElementById('chartTypeFilter').value;
            const searchTerm = document.getElementById('searchChart').value.toLowerCase();
            filteredCharts = originalCharts.filter(chart => {
                const matchesType = !typeFilter || chart.type === typeFilter;
                const matchesSearch = !searchTerm || chart.title.toLowerCase().includes(searchTerm);
                return matchesType && matchesSearch;
            });

            generateStats();
            generateCharts();
        }

        function resetFilters() {
            document.getElementById('chartTypeFilter').value = '';
            document.getElementById('searchChart').value = '';
            filteredCharts = [...originalCharts];
            generateStats();
            generateCharts();
        }

        function generateStats(isPredefined = false) {
            const statsGrid = document.getElementById('statsGrid');
            statsGrid.innerHTML = '';

            const stats = [];

            if (isPredefined) {
                stats.push({ value: originalCharts.length, label: 'Predefined Charts' });
            } else {
                if (!dataAnalysis) return;

                // 1. Record Count
                if (dataAnalysis.structure.isArray) {
                    stats.push({
                        value: dataAnalysis.structure.length,
                        label: 'Total Records'
                    });
                } else {
                    stats.push({
                        value: 1,
                        label: 'Total Objects'
                    });
                }

                // 2. Field Count
                const fieldCount = Object.keys(dataAnalysis.fields).length;
                stats.push({
                    value: fieldCount,
                    label: 'Data Fields'
                });

                // 3. Numerical Fields
                const numFields = Object.values(dataAnalysis.fields).filter(
                    f => f.type === 'number'
                ).length;
                stats.push({
                    value: numFields,
                    label: 'Numerical Fields'
                });

                // 4. Categorical Fields
                const catFields = Object.values(dataAnalysis.fields).filter(
                    f => f.isCategorical
                ).length;
                stats.push({
                    value: catFields,
                    label: 'Categorical Fields'
                });

                // 5. Charts Generated
                stats.push({
                    value: originalCharts.length,
                    label: 'Charts Generated'
                });
            }

            // Render stats cards (common to both paths)
            stats.forEach(stat => {
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
                statsGrid.appendChild(card);
            });
        }
        function generateCharts() {
            const dashboard = document.getElementById('dashboard');
            dashboard.innerHTML = '';

            filteredCharts.forEach((chart, index) => {
                const chartId = `chart-${index}`;

                const container = document.createElement('div');
                container.className = 'chart-container';
                container.innerHTML = `
                    <span class="chart-type-badge">${chart.type} chart</span>
                    <div class="chart-title">${chart.title}</div>
                    <div class="chart-actions">
                        <button class="action-btn" onclick="downloadChart('${chartId}')" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <select class="chart-type-selector" onchange="changeChartType('${chartId}', this.value)">
                            <option value="bar" ${chart.type === 'bar' ? 'selected' : ''}>Bar</option>
                            <option value="line" ${chart.type === 'line' ? 'selected' : ''}>Line</option>
                            <option value="pie" ${chart.type === 'pie' ? 'selected' : ''}>Pie</option>
                            <option value="scatter" ${chart.type === 'scatter' ? 'selected' : ''}>Scatter</option>
                        </select>
                    </div>
                    <div class="chart-wrapper" id="${chartId}"></div>
                `;

                dashboard.appendChild(container);
                renderChart(chartId, chart);
            });
        }

        function renderChart(containerId, chartConfig) {
            const chartDom = document.getElementById(containerId);
            const chart = echarts.init(chartDom);

            // Store the instance for later updates
            chartInstances[containerId] = chart;

            // Prepare chart options
            const options = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                toolbox: {
                    feature: {
                        saveAsImage: { title: 'Save' }
                    }
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                series: []
            };

            // Set title
            options.title = {
                text: chartConfig.title,
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold'
                }
            };

            // Configure based on chart type
            switch (chartConfig.type) {
                case 'bar':
                    options.xAxis = {
                        type: 'category',
                        data: chartConfig.data.labels,
                        axisLabel: {
                            rotate: chartConfig.data.labels.some(l => l.length > 10) ? 45 : 0
                        }
                    };
                    options.yAxis = { type: 'value' };
                    options.series = [{
                        name: chartConfig.title,
                        type: 'bar',
                        data: chartConfig.data.values,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#83bff6' },
                                { offset: 0.5, color: '#188df0' },
                                { offset: 1, color: '#188df0' }
                            ])
                        },
                        emphasis: {
                            itemStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#2378f7' },
                                    { offset: 0.7, color: '#2378f7' },
                                    { offset: 1, color: '#83bff6' }
                                ])
                            }
                        }
                    }];
                    break;

                case 'pie':
                    options.series = [{
                        name: chartConfig.title,
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: false,
                            position: 'center'
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '18',
                                fontWeight: 'bold'
                            }
                        },
                        labelLine: {
                            show: false
                        },
                        data: chartConfig.data.labels.map((label, i) => ({
                            value: chartConfig.data.values[i],
                            name: label
                        }))
                    }];
                    break;

                case 'line':
                    options.xAxis = {
                        type: 'category',
                        data: chartConfig.data.labels,
                        boundaryGap: false
                    };
                    options.yAxis = { type: 'value' };
                    options.series = [{
                        name: chartConfig.title,
                        type: 'line',
                        data: chartConfig.data.values,
                        smooth: true,
                        lineStyle: {
                            width: 4,
                            shadowColor: 'rgba(0,0,0,0.3)',
                            shadowBlur: 10,
                            shadowOffsetY: 8
                        },
                        itemStyle: {
                            color: '#6f42c1'
                        }
                    }];
                    break;

                case 'scatter':
                    options.xAxis = { type: 'value' };
                    options.yAxis = { type: 'value' };
                    options.series = [{
                        name: chartConfig.title,
                        type: 'scatter',
                        data: chartConfig.data.values,
                        symbolSize: 20,
                        itemStyle: {
                            color: '#e74c3c'
                        }
                    }];
                    break;
            }

            chart.setOption(options);

            // Make chart responsive
            window.addEventListener('resize', () => {
                chart.resize();
            });
        }

        function changeChartType(chartId, newType) {
            // Find the chart in our filtered charts
            const chartIndex = filteredCharts.findIndex(
                (_, i) => `chart-${i}` === chartId
            );

            if (chartIndex === -1) return;

            // Update the chart type
            filteredCharts[chartIndex].type = newType;

            // Re-render the chart
            renderChart(chartId, filteredCharts[chartIndex]);
        }

        function downloadChart(chartId) {
            const chart = chartInstances[chartId];
            if (chart) {
                const url = chart.getDataURL({
                    type: 'png',
                    pixelRatio: 2,
                    backgroundColor: '#fff'
                });

                const link = document.createElement('a');
                link.href = url;
                link.download = `chart-${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }

        window.onload = function () {
            console.log("Page loaded — waiting for user action.");
        };
