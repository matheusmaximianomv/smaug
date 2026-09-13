// Smaug – Categorias & Histórico Screens
(function () {
  const { useState } = React;
  const SD = () => window.SmaugData;

  // ── Categorias ───────────────────────────────────────────────
  function Categorias({ data, setData }) {
    const { uuid } = SD();
    const [modal, setModal] = useState(null); // {type:'add'|'edit', payload?}
    const [confirm, setConfirm] = useState(null);
    const [name, setName] = useState('');
    const [err, setErr] = useState('');

    function openAdd() { setName(''); setErr(''); setModal({ type: 'add' }); }
    function openEdit(cat) { setName(cat.name); setErr(''); setModal({ type: 'edit', payload: cat }); }

    function save() {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 100) { setErr('Nome obrigatório (máx. 100 caracteres).'); return; }
      const lower = trimmed.toLowerCase();
      const isDup = data.categories.some(c => c.name.toLowerCase() === lower && (!modal.payload || c.id !== modal.payload.id));
      if (isDup) { setErr('Já existe uma categoria com este nome.'); return; }

      let next;
      if (modal.type === 'add') {
        next = { ...data, categories: [...data.categories, { id: uuid(), name: trimmed }] };
      } else {
        next = { ...data, categories: data.categories.map(c => c.id === modal.payload.id ? { ...c, name: trimmed } : c) };
      }
      setData(next); SD().save(next); setModal(null);
    }

    function deleteCategory(id) {
      const hasExpenses =
        data.avulsasDespesas.some(e => e.categoryId === id) ||
        data.parceladasDespesas.some(p => p.categoryId === id) ||
        data.recorrentesDespesas.some(r => r.versions.some(v => v.categoryId === id));
      if (hasExpenses) { setConfirm({ type: 'blocked', id }); return; }
      setConfirm({ type: 'delete', id });
    }

    function confirmDelete(id) {
      const next = { ...data, categories: data.categories.filter(c => c.id !== id) };
      setData(next); SD().save(next); setConfirm(null);
    }

    // Count expenses per category
    function expenseCount(id) {
      let n = data.avulsasDespesas.filter(e => e.categoryId === id).length;
      n += data.parceladasDespesas.filter(p => p.categoryId === id).length;
      n += data.recorrentesDespesas.filter(r => r.versions.some(v => v.categoryId === id)).length;
      return n;
    }

    return (
      <div className="s-content" data-screen-label="Categorias">
        <SPageHeader
          title="Categorias"
          subtitle="Organize suas despesas por categoria"
          action={<SBtn onClick={openAdd}>+ Nova categoria</SBtn>}
        />

        {data.categories.length === 0 ? (
          <SEmpty
            icon={<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M7 12a5 5 0 0 1 5-5h4l3 4h9a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5V12Z" stroke="var(--border)" strokeWidth="2"/></svg>}
            message="Nenhuma categoria cadastrada."
            action={<SBtn onClick={openAdd}>+ Criar primeira categoria</SBtn>}
          />
        ) : (
          <div className="s-cat-grid">
            {data.categories.map(cat => {
              const count = expenseCount(cat.id);
              return (
                <div key={cat.id} className="s-cat-card">
                  <div className="s-cat-icon">{cat.name.charAt(0).toUpperCase()}</div>
                  <div className="s-cat-info">
                    <div className="s-cat-name">{cat.name}</div>
                    <div className="s-cat-count">{count} despesa{count !== 1 ? 's' : ''} vinculada{count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="s-cat-actions">
                    <button className="s-action-btn" onClick={() => openEdit(cat)} title="Editar">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5 4.5 12H2V9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="s-action-btn danger" onClick={() => deleteCategory(cat.id)} title="Excluir">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modal && (
          <SModal title={modal.type === 'add' ? 'Nova categoria' : 'Editar categoria'} onClose={() => setModal(null)} width={400}>
            <SInput label="Nome da categoria" value={name} onChange={v => { setName(v); setErr(''); }} required error={err} autoFocus placeholder="Ex: Moradia, Alimentação..." />
            <div className="s-modal-ft">
              <SBtn variant="ghost" onClick={() => setModal(null)} type="button">Cancelar</SBtn>
              <SBtn onClick={save}>{modal.type === 'add' ? 'Criar categoria' : 'Salvar'}</SBtn>
            </div>
          </SModal>
        )}

        {confirm?.type === 'delete' && (
          <SConfirm
            message="Tem certeza que deseja excluir esta categoria? Nenhuma despesa está vinculada a ela."
            onConfirm={() => confirmDelete(confirm.id)}
            onCancel={() => setConfirm(null)}
          />
        )}
        {confirm?.type === 'blocked' && (
          <SModal title="Não é possível excluir" onClose={() => setConfirm(null)} width={400}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Esta categoria possui despesas vinculadas e não pode ser excluída.
              Remova ou reclassifique as despesas antes de excluir a categoria.
            </p>
            <div className="s-modal-ft">
              <SBtn onClick={() => setConfirm(null)}>Entendido</SBtn>
            </div>
          </SModal>
        )}
      </div>
    );
  }

  // ── Histórico ────────────────────────────────────────────────
  function Historico({ data }) {
    const { formatCurrency, formatMonthShort, compareMonths } = SD();
    const [filter, setFilter] = useState('all'); // 'all'|'receitas'|'despesas'

    // Build full history entries
    const entries = [];

    // Fixed revenue versions
    data.fixasReceitas.forEach(f => {
      f.versions.forEach(v => {
        entries.push({
          id: v.id,
          entity: 'receita-fixa',
          parentId: f.id,
          modality: f.modality,
          description: v.description,
          amount: v.amount,
          effectiveMonth: v.effectiveMonth,
          effectiveYear: v.effectiveYear,
          color: 'green',
          type: 'Receita Fixa',
        });
      });
    });

    // Recurring expense versions
    data.recorrentesDespesas.forEach(r => {
      r.versions.forEach(v => {
        const cat = data.categories.find(c => c.id === v.categoryId);
        entries.push({
          id: v.id,
          entity: 'despesa-recorrente',
          parentId: r.id,
          description: v.description,
          amount: v.amount,
          effectiveMonth: v.effectiveMonth,
          effectiveYear: v.effectiveYear,
          categoryName: cat?.name,
          color: 'red',
          type: 'Despesa Recorrente',
        });
      });
    });

    const sorted = [...entries].sort((a, b) =>
      compareMonths(b.effectiveMonth, b.effectiveYear, a.effectiveMonth, a.effectiveYear)
    );

    const filtered = sorted.filter(e =>
      filter === 'all' ? true : filter === 'receitas' ? e.entity === 'receita-fixa' : e.entity === 'despesa-recorrente'
    );

    // Group by effectiveYear + effectiveMonth
    const groups = [];
    const seen = new Set();
    filtered.forEach(e => {
      const key = `${e.effectiveYear}-${e.effectiveMonth}`;
      if (!seen.has(key)) { seen.add(key); groups.push({ key, month: e.effectiveMonth, year: e.effectiveYear, items: [] }); }
      groups.find(g => g.key === key).items.push(e);
    });

    return (
      <div className="s-content" data-screen-label="Histórico">
        <SPageHeader
          title="Histórico de versões"
          subtitle="Registro de todas as versões de receitas fixas e despesas recorrentes"
        />

        <div className="s-hist-filters">
          {[['all', 'Todos'], ['receitas', 'Receitas fixas'], ['despesas', 'Despesas recorrentes']].map(([v, l]) => (
            <button key={v} className={`s-filter-btn${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {groups.length === 0 ? (
          <SEmpty
            icon={<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M10 8h20v28H10z" stroke="var(--border)" strokeWidth="2"/><path d="M15 16h10M15 22h7M15 28h5" stroke="var(--border)" strokeWidth="2" strokeLinecap="round"/></svg>}
            message="Nenhum histórico encontrado."
          />
        ) : (
          <div className="s-hist-timeline">
            {groups.map(g => (
              <div key={g.key} className="s-hist-group">
                <div className="s-hist-month-hd">
                  <div className="s-hist-month-dot" />
                  <span className="s-hist-month-label">{formatMonthShort(g.month, g.year)}</span>
                  <div className="s-hist-month-line" />
                </div>
                <div className="s-hist-items">
                  {g.items.map(e => (
                    <div key={e.id} className={`s-hist-item ${e.color}`}>
                      <div className="s-hist-item-left">
                        <div className="s-hist-item-type">{e.type}</div>
                        <div className="s-hist-item-desc">{e.description}</div>
                        {e.categoryName && <div className="s-hist-item-cat">{e.categoryName}</div>}
                      </div>
                      <div className="s-hist-item-right">
                        <span className={`s-amount ${e.color}`}>{formatCurrency(e.amount)}<span style={{ fontWeight: 400, color: 'var(--text-subtle)', fontSize: 11 }}>/mês</span></span>
                        {e.modality && <SBadge type={e.modality} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.SmaugCategorias = Categorias;
  window.SmaugHistorico = Historico;
})();
