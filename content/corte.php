<div class="mainContent" id="cut-view">
    <style>
        #cut-view {
            background: linear-gradient(180deg, #f6f8fb 0%, #eef2f7 100%);
            padding: 12px;
            border-radius: 14px;
            position: relative;
        }
        #cut-view .subtitulo h2 {
            margin: 0;
            font-size: 1.35rem;
            color: #0f172a;
            letter-spacing: 0.2px;
        }
        #cut-view .cut-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(380px, 460px);
            gap: 6px;
        }
        #cut-view .cut-card {
            background: #ffffff;
            border: 1px solid #d9e0ea;
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 8px 16px rgba(15, 23, 42, 0.05);
        }
        #cut-view .cut-title {
            margin: 0 0 8px 0;
            font-size: 1.02rem;
            color: #0f172a;
        }
        #cut-view .cut-muted {
            color: #475569;
            margin: 0 0 12px 0;
            font-size: 0.92rem;
        }
        #cut-view .cut-toolbar {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin: 10px 0 8px;
        }
        #cut-view .cut-toolbar .cut-toolbar-btn {
            border: 1px solid #b9c8dd;
            background: linear-gradient(180deg, #f5f8fc 0%, #e8eef6 100%);
            color: #1f2937;
            border-radius: 3px;
            padding: 7px 14px;
            font-size: 0.92rem;
            font-weight: 600;
            min-height: 36px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
        }
        #cut-view .cut-toolbar .cut-toolbar-btn:hover {
            background: linear-gradient(180deg, #ffffff 0%, #edf3fb 100%);
            filter: none;
        }
        #cut-view .cut-toolbar .cut-toolbar-btn.cut-toolbar-danger {
            margin-left: auto;
            border-color: #d9b6b6;
            background: linear-gradient(180deg, #fff2f2 0%, #ffe1e1 100%);
            color: #7f1d1d;
        }
        #cut-view .cut-toolbar .cut-toolbar-btn.cut-toolbar-danger:hover {
            background: linear-gradient(180deg, #fff8f8 0%, #ffeaea 100%);
        }
        #cut-view .cut-headline {
            margin: 2px 0 2px;
            color: #1f2937;
            font-size: 2rem;
            font-weight: 500;
            line-height: 1.35;
        }
        #cut-view .cut-session-context {
            margin: 2px 0 0;
            color: #334155;
            font-size: 0.98rem;
            font-weight: 600;
        }
        #cut-view .cut-link-btn {
            border: 0;
            padding: 0;
            margin: 0;
            background: transparent;
            color: #1d4ed8;
            text-decoration: underline;
            cursor: pointer;
            font-weight: 600;
            font-size: inherit;
        }
        #cut-view .cut-link-btn:hover {
            color: #1e40af;
        }
        #cut-view .cut-subheadline {
            margin: 0 0 10px;
            color: #475569;
            font-size: 0.95rem;
        }
        #cut-view .cut-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }
        #cut-view #cut-close-breakdown,
        #cut-view #cut-breakdown {
            margin: 8px 0 0 18px;
            color: #1e293b;
        }
        #cut-view .cut-block {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
            padding: 10px;
            margin-top: 10px;
        }
        #cut-view .cut-block h4 {
            margin: 0;
            color: #0f172a;
            font-size: 0.95rem;
        }
        #cut-view .cut-block .cut-subtitle {
            margin: 2px 0 8px 0;
            color: #475569;
            font-size: 0.82rem;
            text-transform: uppercase;
            letter-spacing: 0.35px;
        }
        #cut-view .cut-kpi-total {
            margin-top: 8px;
            font-weight: 700;
            color: #0f172a;
            text-align: right;
        }
        #cut-view .cut-list {
            margin: 0;
            padding-left: 18px;
            color: #1e293b;
            font-size: 0.9rem;
        }
        #cut-view .cut-list.cut-list-compact {
            margin-top: -2px;
            margin-bottom: 2px;
        }
        #cut-view .cut-list.cut-list-tight {
            margin-top: 4px;
        }
        #cut-view #cut-mixed-ticket-list {
            margin-top: 2px;
            padding-left: 14px;
            font-size: 0.83rem;
        }
        #cut-view #cut-mixed-ticket-list li {
            margin: 0 0 2px 0;
            line-height: 1.2;
        }
        #cut-view #cut-mixed-ticket-total {
            margin-top: 4px;
            font-size: 0.86rem;
        }
        #cut-view .cut-card-cashier {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 18px 18px 20px;
            min-width: 0;
        }
        #cut-view .cut-card-cashier .cut-title {
            font-size: 1.24rem;
        }
        #cut-view .cut-card-cashier .cut-muted {
            font-size: 0.97rem;
        }
        #cut-view .cut-card-cashier .cut-kpi-main {
            font-size: 1.72rem;
        }
        #cut-view .cut-summary-layout {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        #cut-view .cut-summary-main #cut-summary {
            margin: 0;
            font-size: 1.06rem;
        }
        #cut-view .cut-summary-reference {
            display: flex;
            flex-direction: column;
            gap: 10px;
            color: #0f172a;
            font-size: 1.02rem;
            line-height: 1.35;
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 10px;
            padding: 10px 12px;
            background: rgba(248, 250, 252, 0.65);
        }
        #cut-view .cut-summary-reference .cut-ref-top-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
            gap: 10px;
        }
        #cut-view .cut-summary-reference .cut-ref-methods,
        #cut-view .cut-summary-reference .cut-ref-movement-box,
        #cut-view .cut-summary-reference .cut-ref-mixed-box {
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 8px;
            background: #ffffff;
            padding: 8px 10px;
        }
        #cut-view .cut-summary-reference .cut-ref-line {
            color: #1e293b;
            font-weight: 500;
            padding: 3px 0;
        }
        #cut-view .cut-summary-reference .cut-ref-line + .cut-ref-line {
            border-top: 1px solid rgba(148, 163, 184, 0.25);
            margin-top: 3px;
            padding-top: 6px;
        }
        #cut-view .cut-summary-reference .cut-ref-block-title {
            color: #0f172a;
            font-weight: 700;
            letter-spacing: 0.25px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        #cut-view .cut-summary-reference .cut-ref-totals-title {
            color: #0f172a;
            font-weight: 800;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            border-top: 1px solid rgba(148, 163, 184, 0.28);
            padding-top: 8px;
        }
        #cut-view .cut-summary-reference .cut-ref-totals-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
        }
        #cut-view .cut-summary-reference .cut-ref-total-card {
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 8px;
            background: #ffffff;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 94px;
        }
        #cut-view .cut-summary-reference .cut-ref-total-label {
            color: #0f172a;
            font-weight: 700;
            font-size: 1rem;
        }
        #cut-view .cut-summary-reference .cut-ref-total-value {
            color: #0f172a;
            font-weight: 800;
            font-size: 2rem;
            line-height: 1;
            text-align: center;
        }
        #cut-view .cut-summary-legacy {
            display: none !important;
        }
        #cut-view .cut-card-close {
            padding: 12px 12px 14px;
            max-width: 460px;
            justify-self: start;
        }
        #cut-view .cut-card-close .cut-title {
            font-size: 0.94rem;
            margin-bottom: 6px;
        }
        #cut-view .cut-card-close .cut-muted {
            font-size: 0.84rem;
            margin-bottom: 8px;
        }
        #cut-view .cut-card-close #cut-close-breakdown {
            margin-top: 6px;
            margin-left: 16px;
            font-size: 0.86rem;
        }
        #cut-view .cut-card-close .cut-table-wrap {
            max-height: 230px;
            margin-top: 8px;
        }
        #cut-view .cut-card-close .cut-table-wrap .venta-table th,
        #cut-view .cut-card-close .cut-table-wrap .venta-table td {
            font-size: 0.84rem;
        }
        #cut-view .cut-kpi-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        #cut-view .cut-kpi-card {
            border: 1px solid #dbe5f1;
            border-radius: 10px;
            padding: 10px 12px;
            background: linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%);
        }
        #cut-view .cut-kpi-label {
            margin: 0 0 4px 0;
            color: #334155;
            font-size: 0.84rem;
            text-transform: uppercase;
            letter-spacing: 0.35px;
            font-weight: 700;
        }
        #cut-view .cut-kpi-main {
            color: #0f172a;
            font-size: 1.55rem;
            line-height: 1.1;
            font-weight: 700;
        }
        #cut-view .cut-row-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        #cut-view .cut-row-2 .cut-block,
        #cut-view .cut-card-cashier > .cut-block {
            margin-top: 0;
        }
        #cut-view .cut-table-wrap {
            max-height: 300px;
            overflow: auto;
            border: 1px solid #d9e0ea;
            border-radius: 10px;
            background: #fff;
            margin-top: 10px;
        }
        #cut-view .cut-table-wrap .venta-table th {
            position: sticky;
            top: 0;
            background: #eff6ff;
            color: #0f172a;
            z-index: 1;
        }
        #cut-view .cut-table-wrap .venta-table td {
            color: #1e293b;
            font-size: 0.9rem;
        }
        #cut-view .form-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 10px;
        }
        #cut-view .form-row label {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.9rem;
        }
        #cut-view .form-row input {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 0.93rem;
            color: #0f172a;
            background: #fff;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        #cut-view .form-row input:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
        }
        #cut-view .btn {
            border-radius: 10px;
            border: 1px solid #0ea5e9;
            background: #0ea5e9;
            color: #fff;
            padding: 8px 14px;
            font-weight: 600;
            cursor: pointer;
            transition: filter 0.2s ease;
        }
        #cut-view .btn:hover {
            filter: brightness(0.94);
        }
        #cut-view .btn:disabled {
            background: #cbd5e1;
            border-color: #cbd5e1;
            color: #64748b;
            cursor: not-allowed;
            filter: none;
        }
        #cut-view .cut-side-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 8px;
        }
        #cut-view .cut-top-actions {
            display: flex;
            justify-content: flex-end;
            margin: 10px 0 12px 0;
        }
        #cut-view .cut-divider {
            border: 0;
            border-top: 1px solid #e2e8f0;
            margin: 14px 0;
        }
        #cut-view .cut-calc-popup {
            position: absolute;
            top: 112px;
            right: 14px;
            width: min(320px, calc(100% - 24px));
            background: #ffffff;
            border: 1px solid #d9e0ea;
            border-radius: 12px;
            box-shadow: 0 14px 28px rgba(15, 23, 42, 0.2);
            z-index: 40;
            overflow: hidden;
        }
        #cut-view .cut-calc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: linear-gradient(180deg, #f8fbff 0%, #e8f1ff 100%);
            border-bottom: 1px solid #d9e0ea;
            cursor: move;
            user-select: none;
            touch-action: none;
        }
        #cut-view .cut-calc-header strong {
            color: #0f172a;
            font-size: 0.95rem;
            letter-spacing: 0.2px;
        }
        #cut-view .cut-calc-close-btn {
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #334155;
            border-radius: 6px;
            min-width: 28px;
            min-height: 28px;
            cursor: pointer;
            font-weight: 700;
        }
        #cut-view .cut-calc-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #cut-view .cut-calc-display {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 8px;
            background: #fff;
            color: #0f172a;
            padding: 10px 12px;
            font-size: 1.12rem;
            font-weight: 700;
            text-align: right;
            box-sizing: border-box;
        }
        #cut-view .cut-calc-keypad {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 6px;
        }
        #cut-view .cut-calc-keypad button {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
            color: #0f172a;
            min-height: 36px;
            font-weight: 700;
            cursor: pointer;
        }
        #cut-view .cut-calc-keypad button:hover {
            background: #eef5ff;
        }
        #cut-view .cut-calc-keypad .cut-calc-key-op {
            background: #e7f0ff;
            border-color: #bcd2f0;
        }
        #cut-view .cut-calc-keypad .cut-calc-key-action {
            background: #fff6e8;
            border-color: #e7cfaa;
        }
        #cut-view .cut-calc-keypad .cut-calc-key-equals {
            background: #dff5e3;
            border-color: #b4deb9;
        }
        #cut-view .cut-calc-keypad .cut-calc-key-wide {
            grid-column: span 3;
        }
        #cut-view .cut-calc-history {
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        #cut-view .cut-calc-history-title {
            margin: 0 0 6px 0;
            font-size: 0.82rem;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            font-weight: 700;
        }
        #cut-view .cut-calc-history-list {
            margin: 0;
            padding-left: 18px;
            max-height: 120px;
            overflow: auto;
            font-size: 0.86rem;
            color: #0f172a;
        }
        #cut-view .cut-calc-history-list li {
            margin-bottom: 4px;
            line-height: 1.35;
            word-break: break-word;
        }
        #cut-view .cut-calc-history-list .cut-calc-history-empty {
            color: #64748b;
            list-style: none;
            margin-left: -18px;
        }
        @media (max-width: 980px) {
            #cut-view .cut-grid {
                grid-template-columns: 1fr;
            }
            #cut-view .cut-card-close {
                max-width: none;
                width: 100%;
                justify-self: stretch;
            }
            #cut-view .cut-toolbar .cut-toolbar-btn.cut-toolbar-danger {
                margin-left: 0;
            }
            #cut-view .cut-kpi-row,
            #cut-view .cut-row-2 {
                grid-template-columns: 1fr;
            }
            #cut-view .cut-summary-reference .cut-ref-top-grid,
            #cut-view .cut-summary-reference .cut-ref-totals-grid {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            #cut-view .cut-summary-reference .cut-ref-total-value {
                font-size: 1.65rem;
            }
            #cut-history-popup .cut-history-controls,
            #cut-rebuild-popup .cut-rebuild-controls {
                grid-template-columns: 1fr 1fr;
            }
            #cut-history-popup .cut-history-actions-bottom {
                grid-column: 1 / -1;
                grid-row: auto;
                justify-content: flex-end;
            }
            #cut-rebuild-popup .cut-rebuild-actions {
                grid-column: 1 / -1;
                justify-content: flex-end;
            }
            #cut-rebuild-cuts-popup .cut-rebuild-output-controls {
                grid-template-columns: 1fr;
            }
            #cut-view .cut-calc-popup {
                width: min(320px, calc(100% - 20px));
            }
        }
        #cut-close-popup .cut-dialog {
            background: #fff;
            width: min(540px, 92vw);
            border-radius: 14px;
            border: 1px solid #d9e0ea;
            overflow: hidden;
            box-shadow: 0 24px 40px rgba(15, 23, 42, 0.25);
        }
        #cut-close-popup .cut-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 11px 14px;
            background: #eff6ff;
            border-bottom: 1px solid #d9e0ea;
        }
        #cut-close-popup .cut-dialog-header strong {
            color: #0f172a;
        }
        #cut-close-popup .cut-dialog-body {
            padding: 14px;
        }
        #cut-close-popup .form-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 10px;
        }
        #cut-close-popup .form-row label {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.9rem;
        }
        #cut-close-popup .form-row input {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 0.93rem;
            color: #0f172a;
            background: #fff;
            outline: none;
            box-sizing: border-box;
        }
        #cut-close-popup .form-row input:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
        }
        #cut-close-popup .cut-dialog-actions {
            justify-content: flex-end;
            gap: 8px;
        }
        #cut-close-popup .cut-btn-ghost,
        #cut-history-popup .cut-btn-ghost,
        #cut-rebuild-popup .cut-btn-ghost,
        #cut-rebuild-cuts-popup .cut-btn-ghost {
            background: #fff;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        #cut-history-popup .cut-dialog-header,
        #cut-rebuild-popup .cut-dialog-header,
        #cut-rebuild-cuts-popup .cut-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 11px 14px;
            background: #eff6ff;
            border-bottom: 1px solid #d9e0ea;
        }
        #cut-history-popup .cut-dialog-header strong,
        #cut-rebuild-popup .cut-dialog-header strong,
        #cut-rebuild-cuts-popup .cut-dialog-header strong {
            color: #0f172a;
        }
        #cut-history-popup .cut-dialog {
            background: #fff;
            width: min(980px, 95vw);
            border-radius: 10px;
            border: 1px solid #d9e0ea;
            overflow: hidden;
            box-shadow: 0 24px 40px rgba(15, 23, 42, 0.25);
        }
        #cut-history-popup .cut-history-controls {
            display: grid;
            grid-template-columns: 190px 190px 160px 190px auto;
            column-gap: 6px;
            row-gap: 8px;
            padding: 12px 14px 0;
            align-items: end;
        }
        #cut-history-popup .cut-history-controls .form-row {
            margin: 0;
        }
        #cut-history-popup .cut-history-controls input,
        #cut-history-popup .cut-history-controls select {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 7px;
            padding: 7px 9px;
            background: #fff;
            color: #0f172a;
        }
        #cut-history-popup .cut-history-range-toggle {
            display: flex;
            align-items: center;
            padding-bottom: 7px;
        }
        #cut-history-popup .cut-history-range-toggle label {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            font-weight: 600;
            color: #0f172a;
            cursor: pointer;
            margin: 0;
        }
        #cut-history-popup .cut-history-range-toggle input[type="checkbox"] {
            width: 15px;
            height: 15px;
            accent-color: #0ea5e9;
            cursor: pointer;
        }
        #cut-history-popup .cut-history-actions {
            display: flex;
            gap: 6px;
            justify-content: flex-start;
        }
        #cut-history-popup .cut-history-actions-bottom {
            grid-column: 5;
            grid-row: 2;
            justify-content: flex-end;
        }
        #cut-history-popup .cut-history-actions .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-height: 35px;
            padding: 7px 12px;
            border-radius: 8px;
            font-weight: 700;
        }
        #cut-history-popup .cut-history-actions .btn i {
            font-size: 0.82rem;
        }
        #cut-history-popup .cut-history-actions .cut-history-search-btn {
            background: #0ea5e9;
            border-color: #0ea5e9;
            color: #fff;
        }
        #cut-history-popup .cut-history-actions .cut-history-search-btn:hover {
            filter: brightness(0.95);
        }
        #cut-history-popup .cut-history-table-wrap {
            padding: 12px 14px 14px;
            max-height: min(62vh, 520px);
            overflow: auto;
        }
        #cut-history-popup .cut-history-table-wrap .venta-table {
            margin: 0;
        }
        #cut-history-popup .cut-history-table-wrap .venta-table th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #eff6ff;
        }
        #cut-history-popup .cut-history-msg {
            padding: 0 14px 10px;
            color: #475569;
            font-size: 0.9rem;
        }
        #cut-rebuild-popup .cut-dialog,
        #cut-rebuild-cuts-popup .cut-dialog {
            background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            width: min(1120px, 96vw);
            border-radius: 14px;
            border: 1px solid #cfdceb;
            overflow: hidden;
            box-shadow: 0 26px 56px rgba(15, 23, 42, 0.24);
        }
        #cut-rebuild-popup,
        #cut-rebuild-cuts-popup {
            display: none;
            align-items: center;
            justify-content: center;
            padding: 14px;
            box-sizing: border-box;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
        }
        #cut-rebuild-popup .cut-dialog-header,
        #cut-rebuild-cuts-popup .cut-dialog-header {
            background: linear-gradient(180deg, #f8fbff 0%, #edf5ff 100%);
            border-bottom: 1px solid #d7e4f3;
        }
        #cut-rebuild-popup .cut-dialog-header strong,
        #cut-rebuild-cuts-popup .cut-dialog-header strong {
            color: #0b1220;
            font-size: 0.98rem;
            letter-spacing: 0.2px;
        }
        #cut-rebuild-popup .cut-rebuild-controls {
            display: grid;
            grid-template-columns: repeat(4, minmax(150px, 1fr));
            gap: 8px;
            padding: 12px 14px 0;
            align-items: end;
        }
        #cut-rebuild-popup .cut-rebuild-controls .form-row {
            margin: 0;
        }
        #cut-rebuild-popup .cut-rebuild-controls label {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.86rem;
        }
        #cut-rebuild-popup .cut-rebuild-controls input,
        #cut-rebuild-popup .cut-rebuild-controls select {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 7px;
            padding: 7px 9px;
            background: #fff;
            color: #0f172a;
            box-sizing: border-box;
            outline: none;
        }
        #cut-rebuild-popup .cut-rebuild-controls input:focus,
        #cut-rebuild-popup .cut-rebuild-controls select:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.16);
        }
        #cut-rebuild-popup .cut-rebuild-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            grid-column: 1 / -1;
            flex-wrap: wrap;
        }
        #cut-rebuild-popup .cut-rebuild-table-wrap,
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap {
            padding: 12px 14px 14px;
            max-height: min(62vh, 520px);
            overflow: auto;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap {
            max-height: min(52vh, 460px);
        }
        #cut-rebuild-popup .cut-rebuild-table-wrap .venta-table,
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap .venta-table {
            margin: 0;
            min-width: 1020px;
        }
        #cut-rebuild-popup .cut-rebuild-table-wrap .venta-table th,
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap .venta-table th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #e9f1fb;
            color: #0f172a;
            font-weight: 700;
            font-size: 0.82rem;
            border-bottom: 1px solid #cadcf3;
            white-space: nowrap;
        }
        #cut-rebuild-popup .cut-rebuild-table-wrap .venta-table td,
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap .venta-table td {
            vertical-align: middle;
            color: #1f2937;
            font-size: 0.9rem;
        }
        #cut-rebuild-popup .cut-rebuild-table-wrap .venta-table tbody tr:nth-child(even),
        #cut-rebuild-cuts-popup .cut-rebuild-table-wrap .venta-table tbody tr:nth-child(even) {
            background: #f8fbff;
        }
        #cut-rebuild-popup .cut-rebuild-linked-check {
            pointer-events: none;
            accent-color: #0ea5e9;
            width: 14px;
            height: 14px;
        }
        #cut-rebuild-popup .cut-rebuild-msg,
        #cut-rebuild-cuts-popup .cut-rebuild-msg {
            margin: 0;
            padding: 0 14px 10px;
            color: #475569;
            font-size: 0.9rem;
        }
        #cut-rebuild-popup .cut-rebuild-warning,
        #cut-rebuild-cuts-popup .cut-rebuild-warning {
            color: #9a3412;
            font-weight: 600;
            background: #fff7ed;
            border-top: 1px solid #fed7aa;
            border-bottom: 1px solid #fed7aa;
            padding-top: 8px;
            padding-bottom: 8px;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls {
            display: grid;
            grid-template-columns: repeat(3, minmax(160px, 1fr));
            gap: 8px;
            padding: 12px 14px 0;
            align-items: end;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls .form-row {
            margin: 0;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls label {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.86rem;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls input,
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls select {
            width: 100%;
            border: 1px solid #c6d0dd;
            border-radius: 7px;
            padding: 7px 9px;
            background: #fff;
            color: #0f172a;
            box-sizing: border-box;
            outline: none;
        }
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls input:focus,
        #cut-rebuild-cuts-popup .cut-rebuild-output-controls select:focus {
            border-color: #0ea5e9;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.16);
        }
        #cut-rebuild-cuts-popup .cut-rebuild-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 0 14px 14px;
            flex-wrap: wrap;
        }
    </style>

    <div class="sub">
        <div class="subtitulo">
            <h2>Corte</h2>
        </div>
        <div class="cut-toolbar">
            <button class="btn cut-toolbar-btn" id="cut-load-session-btn" data-permission-key="corte_turno" data-permission-mode="disable" onclick="loadCutSummaryForClose('session')"><i class="fas fa-cut" aria-hidden="true"></i> Hacer corte de cajero</button>
            <button class="btn cut-toolbar-btn" id="cut-load-day-btn" data-permission-key="corte_dia" data-permission-mode="disable" onclick="loadCutSummaryForClose('day')"><i class="fas fa-cut" aria-hidden="true"></i> Hacer corte del dia</button>
            <button id="cut-calculator-btn" type="button" class="btn cut-toolbar-btn" onclick="toggleCutCalculatorPopup()"><i class="fas fa-calculator" aria-hidden="true"></i> Calculadora</button>
            <button id="cut-rebuild-btn" type="button" class="btn cut-toolbar-btn hidden" data-admin-sia-only="1" onclick="openCutRebuildPopup()"><i class="fas fa-layer-group" aria-hidden="true"></i> Generar corte manual</button>
            <button id="cut-close-shift-btn" data-permission-key="corte_turno" data-permission-mode="disable" class="btn cut-toolbar-btn cut-toolbar-danger" onclick="openCloseShiftDialog()" disabled>Cerrar turno</button>
            <button id="cut-print-session-btn" data-permission-key="corte_turno" data-permission-mode="disable" class="btn cut-toolbar-btn hidden" onclick="printCurrentCutSessionReport()" disabled><i class="fas fa-print" aria-hidden="true"></i> Imprimir reporte</button>
        </div>
        <p id="cut-session-context" class="cut-session-context hidden">
            de
            <button id="cut-header-cashier-btn" type="button" class="cut-link-btn" onclick="openCutHistoryPopup('cashier')">Administrador De La Tienda</button>
            iniciado el
            <button id="cut-header-date-btn" type="button" class="cut-link-btn" onclick="openCutHistoryPopup('date')">--/--/----</button>
        </p>
        <p class="cut-headline">Corte de caja</p>
        <p id="cut-header-time" class="cut-subheadline">De --:-- a --:--</p>

        <div class="content">
            <div class="cut-grid">
                <section class="cut-card cut-card-cashier">
                    <h3 class="cut-title">Resumen del turno actual</h3>
                    <div class="cut-summary-layout">
                        <div class="cut-summary-main">
                            <p id="cut-summary" class="cut-muted">Sin datos cargados.</p>
                            <div class="cut-summary-reference" aria-label="Distribucion resumen turno">
                                <div class="cut-ref-top-grid">
                                    <div class="cut-ref-methods">
                                        <div id="cut-ref-cash-main" class="cut-ref-line">Efectivo: $0 (0 ventas)</div>
                                        <div id="cut-ref-card-main" class="cut-ref-line">Tarjeta: $0 (0 ventas)</div>
                                        <div id="cut-ref-transfer-main" class="cut-ref-line">Transferencia: $0 (0 ventas)</div>
                                        <div id="cut-ref-mixed-main" class="cut-ref-line">Mixto: $0 (0 ventas)</div>
                                    </div>
                                    <div class="cut-ref-movement-box">
                                        <div class="cut-ref-block-title">Movimientos de caja</div>
                                        <div id="cut-ref-entry-total" class="cut-ref-line">Entradas efectivo: +$0</div>
                                        <div id="cut-ref-exit-total" class="cut-ref-line">Salidas efectivo: -$0</div>
                                    </div>
                                    <div class="cut-ref-mixed-box">
                                        <div class="cut-ref-block-title">Detalle mixto</div>
                                        <div id="cut-ref-mixed-cash" class="cut-ref-line">Efectivo: $0</div>
                                        <div id="cut-ref-mixed-card" class="cut-ref-line">Tarjeta: $0</div>
                                    </div>
                                </div>
                                <div class="cut-ref-totals-title">Totales</div>
                                <div class="cut-ref-totals-grid">
                                    <div class="cut-ref-total-card">
                                        <div class="cut-ref-total-label">Efectivo caja:</div>
                                        <div id="cut-ref-cash-total" class="cut-ref-total-value">$0</div>
                                    </div>
                                    <div class="cut-ref-total-card">
                                        <div class="cut-ref-total-label">Tarjeta:</div>
                                        <div id="cut-ref-card-total" class="cut-ref-total-value">$0</div>
                                    </div>
                                    <div class="cut-ref-total-card">
                                        <div class="cut-ref-total-label">Transferencia:</div>
                                        <div id="cut-ref-transfer-total" class="cut-ref-total-value">$0</div>
                                    </div>
                                </div>
                            </div>
                            <ul id="cut-breakdown" class="cut-list cut-list-compact cut-summary-legacy"></ul>
                            <ul id="cut-mixed-summary-list" class="cut-list cut-list-compact cut-summary-legacy"></ul>
                            <div id="cut-mixed-summary-total" class="cut-kpi-total cut-summary-legacy"></div>
                        </div>
                    </div>

                    <div class="cut-kpi-row">
                        <div class="cut-kpi-card">
                            <p class="cut-kpi-label">Ventas totales</p>
                            <div id="cut-kpi-sales-total" class="cut-kpi-main">$0</div>
                        </div>
                        <div class="cut-kpi-card">
                            <p class="cut-kpi-label">Ganancias totales</p>
                            <div id="cut-kpi-profit-total" class="cut-kpi-main">$0</div>
                        </div>
                    </div>

                    <div class="cut-row-2">
                        <div class="cut-block">
                            <h4>Dinero en caja</h4>
                            <p class="cut-subtitle">Desglose</p>
                            <ul id="cut-cash-detail-list" class="cut-list cut-list-tight"></ul>
                            <div id="cut-cash-total" class="cut-kpi-total"></div>
                        </div>
                        <div class="cut-block">
                            <h4>Ventas</h4>
                            <p class="cut-subtitle">Efectivo / Tarjeta / Devoluciones</p>
                            <ul id="cut-profit-detail-list" class="cut-list cut-list-tight"></ul>
                            <div id="cut-profit-total" class="cut-kpi-total"></div>
                        </div>
                    </div>

                    <div class="cut-row-2">
                        <div class="cut-block">
                            <h4>Detalle de entradas</h4>
                            <ul id="cut-session-income-list" class="cut-list cut-list-tight"></ul>
                        </div>
                        <div class="cut-block">
                            <h4>Detalle de salidas</h4>
                            <ul id="cut-session-expense-list" class="cut-list cut-list-tight"></ul>
                        </div>
                    </div>

                    <div class="cut-row-2">
                        <div class="cut-block">
                            <h4>Ventas por departamento</h4>
                            <ul id="cut-department-list" class="cut-list cut-list-tight"></ul>
                            <div id="cut-department-total" class="cut-kpi-total"></div>
                        </div>
                        <div class="cut-block">
                            <h4>Ventas mixtas por ticket</h4>
                            <p class="cut-subtitle">Efectivo / Tarjeta / Total</p>
                            <ul id="cut-mixed-ticket-list" class="cut-list cut-list-tight"></ul>
                            <div id="cut-mixed-ticket-total" class="cut-kpi-total"></div>
                        </div>
                    </div>
                </section>

                <section class="cut-card cut-card-close">
                    <h3 class="cut-title">Resumen para cierre</h3>
                    <p id="cut-close-scope-info" class="cut-muted">Selecciona una opcion para cargar el resumen de ventas.</p>
                    <ul id="cut-close-breakdown"></ul>

                    <div class="cut-table-wrap">
                        <table class="venta-table" style="margin:0;">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Ticket</th>
                                    <th>Metodo</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody id="cut-close-detail-body"></tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    </div>
    <div id="cut-calculator-popup" class="cut-calc-popup hidden" aria-hidden="true">
        <div id="cut-calculator-drag-handle" class="cut-calc-header">
            <strong>Calculadora</strong>
            <button type="button" class="cut-calc-close-btn" onclick="closeCutCalculatorPopup()" aria-label="Cerrar calculadora">X</button>
        </div>
        <div class="cut-calc-body">
            <input id="cut-calc-display" class="cut-calc-display" type="text" value="0" readonly>
            <div class="cut-calc-keypad">
                <button type="button" class="cut-calc-key-action" data-cut-calc-action="clear">C</button>
                <button type="button" class="cut-calc-key-action" data-cut-calc-action="backspace">&larr;</button>
                <button type="button" class="cut-calc-key-op" data-cut-calc-action="operator" data-cut-calc-value="/">/</button>
                <button type="button" class="cut-calc-key-op" data-cut-calc-action="operator" data-cut-calc-value="*">*</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="7">7</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="8">8</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="9">9</button>
                <button type="button" class="cut-calc-key-op" data-cut-calc-action="operator" data-cut-calc-value="-">-</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="4">4</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="5">5</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="6">6</button>
                <button type="button" class="cut-calc-key-op" data-cut-calc-action="operator" data-cut-calc-value="+">+</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="1">1</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="2">2</button>
                <button type="button" data-cut-calc-action="digit" data-cut-calc-value="3">3</button>
                <button type="button" class="cut-calc-key-equals" data-cut-calc-action="equals">=</button>
                <button type="button" class="cut-calc-key-wide" data-cut-calc-action="digit" data-cut-calc-value="0">0</button>
                <button type="button" data-cut-calc-action="decimal">.</button>
            </div>
            <div class="cut-calc-history">
                <p class="cut-calc-history-title">Memoria (ultimas 5)</p>
                <ul id="cut-calc-history-list" class="cut-calc-history-list"></ul>
            </div>
        </div>
    </div>
</div>

<div id="cut-close-popup" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9998; align-items:center; justify-content:center;">
    <div class="cut-dialog">
        <div class="cut-dialog-header">
            <strong>Cerrar turno</strong>
            <button type="button" class="btn" onclick="closeCloseShiftDialog()" style="min-width:auto; padding:6px 10px;">X</button>
        </div>
        <div class="cut-dialog-body">
            <p id="cut-close-popup-info" style="margin:0 0 10px 0;"></p>
            <div class="form-row">
                <label for="cut-initial-amount">Monto inicial en caja</label>
                <input id="cut-initial-amount" type="number" min="0" step="0.01" value="0" readonly>
            </div>
            <div id="cut-declared-row" class="form-row">
                <label for="cut-declared-amount">Efectivo contado en caja</label>
                <input id="cut-declared-amount" type="number" min="0" step="0.01" value="0" oninput="refreshCloseShiftDifference()">
            </div>
            <div id="cut-declared-card-row" class="form-row">
                <label for="cut-declared-card-amount">Tarjetas declaradas (cierre Redcompra)</label>
                <input id="cut-declared-card-amount" type="number" min="0" step="0.01" value="0" oninput="refreshCloseShiftDifference()">
            </div>
            <div class="form-row">
                <label for="cut-notes">Observaciones</label>
                <input id="cut-notes" type="text" maxlength="255" placeholder="Opcional">
            </div>
            <div id="cut-difference-row" class="form-row">
                <label>Diferencia</label>
                <input id="cut-difference-preview" type="text" readonly>
            </div>
            <div id="cut-card-difference-row" class="form-row">
                <label>Diferencia tarjeta</label>
                <input id="cut-card-difference-preview" type="text" readonly>
            </div>
            <div class="form-row cut-dialog-actions">
                <button class="btn cut-btn-ghost" type="button" onclick="closeCloseShiftDialog()">Cancelar</button>
                <button id="cut-confirm-close-btn" class="btn" type="button" onclick="confirmCloseShiftFromDialog()">Confirmar cierre</button>
            </div>
        </div>
    </div>
</div>

<div id="cut-rebuild-popup" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9998; align-items:center; justify-content:center; display:none;">
    <div class="cut-dialog">
        <div class="cut-dialog-header">
            <strong>Generar corte manual (admin_sia)</strong>
            <button type="button" class="btn" onclick="closeCutRebuildPopup()" style="min-width:auto; padding:6px 10px;">X</button>
        </div>
        <div class="cut-rebuild-controls">
            <div class="form-row">
                <label for="cut-rebuild-from-date">Desde (fecha)</label>
                <input id="cut-rebuild-from-date" type="date">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-to-date">Hasta (fecha)</label>
                <input id="cut-rebuild-to-date" type="date">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-from-time">Desde (hora)</label>
                <input id="cut-rebuild-from-time" type="time" value="00:00">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-to-time">Hasta (hora)</label>
                <input id="cut-rebuild-to-time" type="time" value="23:59">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-box-filter">Caja</label>
                <select id="cut-rebuild-box-filter">
                    <option value="">Todas</option>
                </select>
            </div>
            <div class="form-row">
                <label for="cut-rebuild-cashier-filter">Cajero</label>
                <select id="cut-rebuild-cashier-filter">
                    <option value="">Todos</option>
                </select>
            </div>
            <div class="form-row">
                <label for="cut-rebuild-turn-filter">Turno</label>
                <input id="cut-rebuild-turn-filter" type="number" min="1" step="1" placeholder="Opcional">
            </div>
            <div class="cut-rebuild-actions">
                <button type="button" class="btn cut-btn-ghost" onclick="runCutRebuildPreview()">Buscar</button>
                <button type="button" class="btn cut-btn-ghost" onclick="selectAllCutRebuildSales()">Seleccionar todas</button>
                <button type="button" class="btn cut-btn-ghost" onclick="clearCutRebuildSalesSelection()">Limpiar seleccion</button>
                <button id="cut-rebuild-merge-btn" type="button" class="btn" onclick="mergeSelectedCuts()" disabled>Generar corte</button>
                <button id="cut-rebuild-print-btn" type="button" class="btn" onclick="printCutRebuildReport()" disabled>Generar reporte</button>
                <button type="button" class="btn cut-btn-ghost" onclick="closeCutRebuildPopup()">Cerrar</button>
            </div>
        </div>
        <p id="cut-rebuild-msg" class="cut-rebuild-msg">Filtra ventas por periodo/caja/cajero, selecciona una o varias, y luego pulsa "Generar corte".</p>
        <div class="cut-rebuild-table-wrap">
            <table class="venta-table">
                <thead>
                    <tr>
                        <th style="text-align:center;"><input id="cut-rebuild-sale-select-all" type="checkbox" title="Seleccionar todo"></th>
                        <th>Fecha/Hora</th>
                        <th>Ticket</th>
                        <th>Caja</th>
                        <th>Cajero</th>
                        <th>Turno</th>
                        <th style="text-align:center;">Corte</th>
                        <th>Metodo</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="cut-rebuild-body">
                    <tr><td colspan="9" style="text-align:center;">Sin datos.</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="cut-rebuild-cuts-popup" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9998; align-items:center; justify-content:center; display:none;">
    <div class="cut-dialog">
        <div class="cut-dialog-header">
            <strong>Configuracion final del corte manual</strong>
            <button type="button" class="btn" onclick="closeCutRebuildCutsPopup()" style="min-width:auto; padding:6px 10px;">X</button>
        </div>
        <div class="cut-rebuild-output-controls">
            <div class="form-row">
                <label for="cut-rebuild-output-from-date">Fecha inicio</label>
                <input id="cut-rebuild-output-from-date" type="date">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-output-from-time">Hora inicio</label>
                <input id="cut-rebuild-output-from-time" type="time" value="00:00">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-output-to-date">Fecha fin</label>
                <input id="cut-rebuild-output-to-date" type="date">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-output-to-time">Hora fin</label>
                <input id="cut-rebuild-output-to-time" type="time" value="23:59">
            </div>
            <div class="form-row">
                <label for="cut-rebuild-output-caja">Caja asignada</label>
                <select id="cut-rebuild-output-caja">
                    <option value="">Seleccionar caja</option>
                </select>
            </div>
            <div class="form-row">
                <label for="cut-rebuild-output-cajero">Cajero asignado</label>
                <select id="cut-rebuild-output-cajero">
                    <option value="">Seleccionar cajero</option>
                </select>
            </div>
        </div>
        <p id="cut-rebuild-cuts-msg" class="cut-rebuild-msg">Selecciona cortes previos para reemplazar/unificar, o ninguno para crear un registro nuevo.</p>
        <div class="cut-rebuild-table-wrap">
            <table class="venta-table">
                <thead>
                    <tr>
                        <th>Sel</th>
                        <th>Conservar</th>
                        <th>Corte</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Caja</th>
                        <th>Cajero</th>
                        <th>Estado</th>
                        <th>Ventas</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="cut-rebuild-cuts-body">
                    <tr><td colspan="10" style="text-align:center;">Sin datos.</td></tr>
                </tbody>
            </table>
        </div>
        <div class="cut-rebuild-actions">
            <button id="cut-rebuild-cuts-preview-print-btn" type="button" class="btn cut-btn-ghost" onclick="printCutRebuildPreviewReport()">Imprimir antes de generar</button>
            <button id="cut-rebuild-cuts-generate-btn" type="button" class="btn" onclick="confirmCutRebuildCutsSelection({ printAfter: false })">Generar corte</button>
            <button id="cut-rebuild-cuts-generate-print-btn" type="button" class="btn" onclick="confirmCutRebuildCutsSelection({ printAfter: true })">Generar e imprimir</button>
            <button type="button" class="btn cut-btn-ghost" onclick="closeCutRebuildCutsPopup()">Cancelar</button>
        </div>
    </div>
</div>

<div id="cut-history-popup" class="hidden" style="position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:9998; align-items:center; justify-content:center;">
    <div class="cut-dialog">
        <div class="cut-dialog-header">
            <strong>Historial de cortes</strong>
            <button type="button" class="btn" onclick="closeCutHistoryPopup()" style="min-width:auto; padding:6px 10px;">X</button>
        </div>
        <div class="cut-history-controls">
            <div class="form-row" id="cut-history-single-date-row">
                <label for="cut-history-date-filter">Fecha día</label>
                <input id="cut-history-date-filter" type="date">
            </div>
            <div class="form-row hidden" id="cut-history-range-from-row">
                <label for="cut-history-date-from-filter">Fecha inicio</label>
                <input id="cut-history-date-from-filter" type="date">
            </div>
            <div class="form-row hidden" id="cut-history-range-to-row">
                <label for="cut-history-date-to-filter">Fecha término</label>
                <input id="cut-history-date-to-filter" type="date">
            </div>
            <div class="form-row cut-history-range-toggle">
                <label for="cut-history-range-enabled">
                    <input id="cut-history-range-enabled" type="checkbox">
                    Buscar por rango
                </label>
            </div>
            <div class="form-row">
                <label for="cut-history-box-filter">Caja</label>
                <select id="cut-history-box-filter">
                    <option value="">Todas</option>
                </select>
            </div>
            <div class="form-row hidden" id="cut-history-cashier-row">
                <label for="cut-history-cashier-filter">Cajero</label>
                <select id="cut-history-cashier-filter">
                    <option value="">Todos</option>
                </select>
            </div>
            <div class="cut-history-actions cut-history-actions-bottom">
                <button type="button" class="btn cut-history-search-btn" onclick="reloadCutHistoryPopupData()">
                    <i class="fas fa-search" aria-hidden="true"></i>Buscar
                </button>
            </div>
        </div>
        <p id="cut-history-msg" class="cut-history-msg">Selecciona un corte para verlo en pantalla.</p>
        <div class="cut-history-table-wrap">
            <table class="venta-table">
                <thead>
                    <tr>
                        <th>Caja</th>
                        <th>Cajero</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Ventas</th>
                        <th>Estado</th>
                        <th>Accion</th>
                    </tr>
                </thead>
                <tbody id="cut-history-body"></tbody>
            </table>
        </div>
    </div>
</div>
