// Smaug – Dashboard Screen
(function () {
  const { useState, useMemo } = React;

  function Dashboard({ data }) {
    const { CM, CY, addMonths, compareMonths, formatCurrency, formatMonthLong, formatMonthShort, getRevenuesForMonth, getExpensesForMonth } = window.SmaugData;

    const [selMonth, setSelMonth] = useState(CM);
    const [selYear, setSelYear] = useState(CY);

    const isFuture = compareMonths(selMonth, selYear, CM, CY) > 0;
    const isCurrent = selMonth === CM && selYear === CY;

    const revenues = useMemo(() => getRevenuesForMonth(data, selMonth, selYear), [data, selMonth, selYear]);
    const expenses = useMemo(() => getExpensesForMonth(data, selMonth, selYear), [data, selMonth, selYear]);
    const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalRevenue - totalExpense;

    function navigate(delta) {
      const n = addMonths(selMonth, selYear, delta);
      setSelMonth(n.month);
      setSelYear(n.year);
    }

    // 6-month chart: 3 before current + current + 2 future
    const chartData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
      const b = addMonths(CM, CY, i - 3);
      const rev = getRevenuesForMonth(data, b.month, b.year).reduce((s, r) => s + r.amount, 0);
      const exp = getExpensesForMonth(data, b.month, b.year).reduce((s, e) => s + e.amount, 0);
      return { ...b, rev, exp, isFuture: compareMonths(b.month, b.year, CM, CY) > 0, isSelected: b.month === selMonth && b.year === selYear };
    }), [data, selMonth, selYear]);

    const maxVal = Math.max(...chartData.map(m => Math.max(m.rev, m.exp)), 1);

    const catBreakdown = useMemo(() => {
      const map = {};
      expenses.forEach(e => { const k = e.categoryName || 'Sem categoria'; map[k] = (map[k] || 0) + e.amount; });
      return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    return (
      <div className="s-content" data-screen-label="Dashboard">
        {/* Month Navigator */}
        <div className="s-dash-nav">
          <div className="s-dash-nav-left">
            <button className="s-nav-arrow" onClick={() => navigate(-1)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 13L7 9l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="s-dash-month-label">{formatMonthLong(selMonth, selYear)}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {isCurrent && <span className="s-pill current">Mês vigente</span>}
                {isFuture && <span className="s-pill future">Projeção</span>}
                {!isCurrent && !isFuture && <span className="s-pill past">Passado</span>}
              </div>
            </div>
            <button className="s-nav-arrow" onClick={() => navigate(1)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          {!isCurrent && (
            <button className="s-ghost-btn" onClick={() => { setSelMonth(CM); setSelYear(CY); }}>← Mês atual</button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="s-kpi-grid">
          <div className="s-kpi green">
            <span className="s-kpi-label">{isFuture ? 'Receitas projetadas' : 'Total de receitas'}</span>
            <span className="s-kpi-value">{formatCurrency(totalRevenue)}</span>
            <span className="s-kpi-sub">{revenues.length} lançamento{revenues.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="s-kpi red">
            <span className="s-kpi-label">{isFuture ? 'Despesas projetadas' : 'Total de despesas'}</span>
            <span className="s-kpi-value">{formatCurrency(totalExpense)}</span>
            <span className="s-kpi-sub">{expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={`s-kpi ${balance >= 0 ? 'balance-pos' : 'balance-neg'}`}>
            <span className="s-kpi-label">Saldo do mês</span>
            <span className="s-kpi-value">{formatCurrency(balance)}</span>
            <span className="s-kpi-sub">{balance >= 0 ? 'Superávit' : 'Déficit'}</span>
          </div>
        </div>

        <div className="s-dash-grid">
          {/* Bar Chart */}
          <div className="s-card">
            <h3 className="s-card-title">Visão semestral</h3>
            <div className="s-chart">
              {chartData.map((m, i) => (
                <div key={i}
                  className={`s-chart-col${m.isSelected ? ' selected' : ''}`}
                  onClick={() => { setSelMonth(m.month); setSelYear(m.year); }}
                  title={`${formatMonthShort(m.month, m.year)}: Receitas ${formatCurrency(m.rev)} | Despesas ${formatCurrency(m.exp)}`}
                >
                  <div className="s-bars">
                    <div className="s-bar-slot">
                      <div className={`s-bar rev${m.isFuture ? ' proj' : ''}`} style={{ height: `${Math.max((m.rev / maxVal) * 100, m.rev > 0 ? 2 : 0)}%` }} />
                    </div>
                    <div className="s-bar-slot">
                      <div className={`s-bar exp${m.isFuture ? ' proj' : ''}`} style={{ height: `${Math.max((m.exp / maxVal) * 100, m.exp > 0 ? 2 : 0)}%` }} />
                    </div>
                  </div>
                  <span className={`s-chart-lbl${m.isFuture ? ' muted' : ''}`}>{formatMonthShort(m.month, m.year)}</span>
                </div>
              ))}
            </div>
            <div className="s-chart-legend">
              <span><i className="s-dot rev" />Receitas</span>
              <span><i className="s-dot exp" />Despesas</span>
              <span><i className="s-dot proj" />Projeção</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="s-card">
            <h3 className="s-card-title">Despesas por categoria</h3>
            {catBreakdown.length === 0 ? (
              <p className="s-muted-msg">Nenhuma despesa registrada neste mês.</p>
            ) : catBreakdown.map(([cat, val]) => (
              <div key={cat} className="s-breakdown-row">
                <div className="s-breakdown-top">
                  <span>{cat}</span>
                  <span className="s-breakdown-val">{formatCurrency(val)}</span>
                </div>
                <div className="s-progress-track">
                  <div className="s-progress-fill" style={{ width: `${(val / totalExpense) * 100}%` }} />
                </div>
                <div className="s-breakdown-pct">{((val / totalExpense) * 100).toFixed(0)}% das despesas</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Tables */}
        <div className="s-dash-grid">
          <div className="s-card">
            <h3 className="s-card-title">Receitas do período</h3>
            {revenues.length === 0
              ? <p className="s-muted-msg">Nenhuma receita neste mês.</p>
              : <table className="s-inline-table">
                  <tbody>
                    {revenues.map(r => (
                      <tr key={r.id}>
                        <td>{r.description}</td>
                        <td><SBadge type={r.type} /></td>
                        <td className="s-amount green">{formatCurrency(r.amount)}</td>
                      </tr>
                    ))}
                    <tr className="s-total-row">
                      <td colSpan={2}>Total</td>
                      <td className="s-amount green">{formatCurrency(totalRevenue)}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
          <div className="s-card">
            <h3 className="s-card-title">Despesas do período</h3>
            {expenses.length === 0
              ? <p className="s-muted-msg">Nenhuma despesa neste mês.</p>
              : <table className="s-inline-table">
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div>{e.description}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>{e.categoryName}</div>
                        </td>
                        <td><SBadge type={e.type} /></td>
                        <td className="s-amount red">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                    <tr className="s-total-row">
                      <td colSpan={2}>Total</td>
                      <td className="s-amount red">{formatCurrency(totalExpense)}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
        </div>
      </div>
    );
  }

  window.SmaugDashboard = Dashboard;
})();
