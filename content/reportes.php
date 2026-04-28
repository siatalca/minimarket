<div id="reports-panel" class="panel">
    <h1>Reportes</h1>

    <section class="reports-filter-box">
        <h3>Filtros generales</h3>
        <div class="reports-filter-grid">
            <div class="form-row">
                <label for="report-date-from">Desde</label>
                <input id="report-date-from" type="date">
            </div>
            <div class="form-row">
                <label for="report-date-to">Hasta</label>
                <input id="report-date-to" type="date">
            </div>
            <div class="form-row">
                <label for="report-caja-filter">Caja</label>
                <select id="report-caja-filter">
                    <option value="">Todas</option>
                </select>
            </div>
            <div class="form-row">
                <label for="report-cajero-filter">Cajero</label>
                <select id="report-cajero-filter">
                    <option value="">Todos</option>
                </select>
            </div>
            <div class="form-row">
                <label for="report-cashier-period">Ventas por cajero</label>
                <select id="report-cashier-period">
                    <option value="daily">Periodo diario</option>
                    <option value="monthly">Periodo mensual</option>
                </select>
            </div>
            <div class="form-row">
                <label for="report-global-period">Ventas todos cajeros</label>
                <select id="report-global-period">
                    <option value="monthly">Periodo mensual</option>
                    <option value="annual">Periodo anual</option>
                </select>
            </div>
        </div>
        <div class="form-row reports-actions-row">
            <button class="btn" type="button" onclick="applyReportFilters()">Aplicar filtros</button>
        </div>
    </section>

    <section class="reports-chart-grid">
        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Ventas diarias (efectivo y tarjetas)</h3>
                <button class="btn" type="button" onclick="downloadReportChartDetail('daily_payment')">Descargar detalle</button>
            </div>
            <div id="report-chart-daily" class="report-chart-canvas"></div>
        </article>

        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Salidas de dinero</h3>
                <button class="btn" type="button" onclick="exportCashExitsCsv()">Exportar salidas</button>
            </div>
            <div id="report-chart-cash-exits" class="report-chart-canvas"></div>
        </article>

        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Ventas por departamento (montos)</h3>
                <button class="btn" type="button" onclick="downloadReportChartDetail('department_sales')">Descargar detalle</button>
            </div>
            <div id="report-chart-department" class="report-chart-canvas"></div>
        </article>

        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Ventas mensuales (efectivo y tarjetas)</h3>
                <button class="btn" type="button" onclick="downloadReportChartDetail('monthly_payment')">Descargar detalle</button>
            </div>
            <div id="report-chart-monthly" class="report-chart-canvas"></div>
        </article>

        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Ventas por cajero (diario o mensual)</h3>
                <button class="btn" type="button" onclick="downloadReportChartDetail('cashier_sales')">Descargar detalle</button>
            </div>
            <div id="report-chart-cashier" class="report-chart-canvas"></div>
        </article>

        <article class="reports-chart-card">
            <div class="reports-chart-head">
                <h3>Ventas de todos los cajeros (mensual o anual)</h3>
                <button class="btn" type="button" onclick="downloadReportChartDetail('all_cashiers_sales')">Descargar detalle</button>
            </div>
            <div id="report-chart-global" class="report-chart-canvas"></div>
        </article>
    </section>
</div>
