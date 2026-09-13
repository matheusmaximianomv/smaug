// Smaug – Despesas Screen
(function () {
  const { useState, useMemo } = React;
  const SD = () => window.SmaugData;

  // ── Avulsa Despesa Form ──────────────────────────────────────
  function AvulsaDespesaForm({ initial, categories, onSave, onClose }) {
    const { CM, CY, isEligible } = SD();
    const [desc, setDesc] = useState(initial?.description || '');
    const [amount, setAmount] = useState(initial?.amount?.toString() || '');
    const [catId, setCatId] = useState(initial?.categoryId || '');
    const [month, setMonth] = useState(initial?.competenceMonth || CM);
    const [year, setYear] = useState(initial?.competenceYear || CY);
    const [errs, setErrs] = useState({});

    function submit(e) {
      e.preventDefault();
      const v = {};
      if (!desc.trim() || desc.length > 255) v.desc = 'Descrição obrigatória (máx. 255 caracteres).';
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.'))) v.amount = 'Valor inválido.';
      if (!catId) v.cat = 'Selecione uma categoria.';
      if (!isEligible(month, year) && !initial) v.comp = 'Competência passada não permitida.';
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({ description: desc.trim(), amount: n, categoryId: catId, competenceMonth: month, competenceYear: year });
    }

    return (
      <form onSubmit={submit}>
        <SInput label="Descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus placeholder="Ex: Supermercado, consulta médica..." />
        <SInput label="Valor (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
        <SSelect label="Categoria" value={catId} onChange={setCatId} required error={errs.cat}
          options={categories.map(c => ({ value: c.id, label: c.name }))} />
        <SMonthYear label="Competência" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required error={errs.comp} />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit">{initial ? 'Salvar' : 'Adicionar despesa'}</SBtn>
        </div>
      </form>
    );
  }

  // ── Parcelada Form ───────────────────────────────────────────
  function ParceladaForm({ categories, onSave, onClose }) {
    const { CM, CY, isEligible } = SD();
    const [desc, setDesc] = useState('');
    const [total, setTotal] = useState('');
    const [count, setCount] = useState('');
    const [catId, setCatId] = useState('');
    const [month, setMonth] = useState(CM);
    const [year, setYear] = useState(CY);
    const [errs, setErrs] = useState({});

    const installmentAmt = useMemo(() => {
      const t = Math.round(parseFloat(total.replace(',', '.')) * 100);
      const c = parseInt(count);
      if (!t || !c || c < 1 || c > 72) return null;
      return (t / c / 100).toFixed(2);
    }, [total, count]);

    function submit(e) {
      e.preventDefault();
      const v = {};
      if (!desc.trim()) v.desc = 'Descrição obrigatória.';
      const t = parseFloat(total.replace(',', '.'));
      if (isNaN(t) || t <= 0) v.total = 'Valor total inválido.';
      const c = parseInt(count);
      if (isNaN(c) || c < 1 || c > 72) v.count = 'Entre 1 e 72 parcelas.';
      if (!catId) v.cat = 'Selecione uma categoria.';
      if (!isEligible(month, year)) v.comp = 'Competência passada não permitida.';
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({ description: desc.trim(), totalAmount: t, installmentCount: c, categoryId: catId, startMonth: month, startYear: year });
    }

    return (
      <form onSubmit={submit}>
        <SInput label="Descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus placeholder="Ex: Notebook, TV, viagem..." />
        <SRow>
          <SInput label="Valor total (R$)" value={total} onChange={setTotal} type="text" placeholder="0,00" required error={errs.total} />
          <SInput label="Nº de parcelas" value={count} onChange={setCount} type="number" placeholder="1–72" required error={errs.count} min="1" max="72" />
        </SRow>
        {installmentAmt && (
          <div className="s-form-hint accent">Cada parcela: <strong>R$ {installmentAmt}</strong></div>
        )}
        <SSelect label="Categoria" value={catId} onChange={setCatId} required error={errs.cat}
          options={categories.map(c => ({ value: c.id, label: c.name }))} />
        <SMonthYear label="Primeira parcela em" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required error={errs.comp} />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit">Criar parcelamento</SBtn>
        </div>
      </form>
    );
  }

  // ── Recorrente Form ──────────────────────────────────────────
  function RecorrenteForm({ categories, onSave, onClose }) {
    const { CM, CY, isEligible, compareMonths } = SD();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [catId, setCatId] = useState('');
    const [startMonth, setStartMonth] = useState(CM);
    const [startYear, setStartYear] = useState(CY);
    const [hasEnd, setHasEnd] = useState(false);
    const [endMonth, setEndMonth] = useState(CM);
    const [endYear, setEndYear] = useState(CY);
    const [errs, setErrs] = useState({});

    function submit(e) {
      e.preventDefault();
      const v = {};
      if (!desc.trim()) v.desc = 'Descrição obrigatória.';
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n) || n <= 0) v.amount = 'Valor inválido.';
      if (!catId) v.cat = 'Selecione uma categoria.';
      if (!isEligible(startMonth, startYear)) v.start = 'Início não pode ser passado.';
      if (hasEnd && compareMonths(endMonth, endYear, startMonth, startYear) < 0) v.end = 'Término anterior ao início.';
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({ description: desc.trim(), amount: n, categoryId: catId, startMonth, startYear, endMonth: hasEnd ? endMonth : null, endYear: hasEnd ? endYear : null });
    }

    return (
      <form onSubmit={submit}>
        <SInput label="Descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus placeholder="Ex: Aluguel, plano de saúde..." />
        <SRow>
          <SInput label="Valor mensal (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
          <SSelect label="Categoria" value={catId} onChange={setCatId} required error={errs.cat}
            options={categories.map(c => ({ value: c.id, label: c.name }))} />
        </SRow>
        <SMonthYear label="Início da vigência" month={startMonth} year={startYear} onMonthChange={setStartMonth} onYearChange={setStartYear} required error={errs.start} />
        <div className="s-field">
          <label className="s-label">
            <input type="checkbox" checked={hasEnd} onChange={e => setHasEnd(e.target.checked)} style={{ marginRight: 6 }} />
            Definir data de término
          </label>
        </div>
        {hasEnd && <SMonthYear label="Término" month={endMonth} year={endYear} onMonthChange={setEndMonth} onYearChange={setEndYear} error={errs.end} />}
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit">Criar despesa recorrente</SBtn>
        </div>
      </form>
    );
  }

  // ── Recorrente Version Form ──────────────────────────────────
  function RecVersionForm({ recurringId, categories, onSave, onClose }) {
    const { CM, CY, isEligible } = SD();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [catId, setCatId] = useState('');
    const [month, setMonth] = useState(CM);
    const [year, setYear] = useState(CY);
    const [errs, setErrs] = useState({});

    function submit(e) {
      e.preventDefault();
      const v = {};
      if (!desc.trim()) v.desc = 'Descrição obrigatória.';
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n) || n <= 0) v.amount = 'Valor inválido.';
      if (!catId) v.cat = 'Selecione uma categoria.';
      if (!isEligible(month, year)) v.eff = 'Vigência não pode ser passada.';
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({ recurringId, description: desc.trim(), amount: n, categoryId: catId, effectiveMonth: month, effectiveYear: year });
    }

    return (
      <form onSubmit={submit}>
        <p className="s-form-hint">A alteração valerá a partir do mês selecionado. O histórico anterior é preservado.</p>
        <SInput label="Nova descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus />
        <SRow>
          <SInput label="Novo valor (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
          <SSelect label="Categoria" value={catId} onChange={setCatId} required error={errs.cat}
            options={categories.map(c => ({ value: c.id, label: c.name }))} />
        </SRow>
        <SMonthYear label="Vigência a partir de" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required error={errs.eff} />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit">Criar nova versão</SBtn>
        </div>
      </form>
    );
  }

  // ── End Recorrente Form ──────────────────────────────────────
  function EndRecForm({ recurringId, onSave, onClose }) {
    const { CM, CY } = SD();
    const [month, setMonth] = useState(CM);
    const [year, setYear] = useState(CY);
    return (
      <form onSubmit={e => { e.preventDefault(); onSave({ recurringId, endMonth: month, endYear: year }); }}>
        <p className="s-form-hint">A despesa recorrente será encerrada ao final do mês selecionado.</p>
        <SMonthYear label="Mês de encerramento" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit" variant="danger">Encerrar despesa</SBtn>
        </div>
      </form>
    );
  }

  // ── Main Screen ──────────────────────────────────────────────
  function Despesas({ data, setData }) {
    const { uuid, formatCurrency, formatMonthShort, compareMonths, getActiveVersion, CM, CY } = SD();
    const [tab, setTab] = useState('avulsas');
    const [modal, setModal] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const cats = data.categories;

    // ── Avulsa handlers ──
    function addAvulsa(vals) { const n = { ...data, avulsasDespesas: [...data.avulsasDespesas, { id: uuid(), ...vals }] }; setData(n); SD().save(n); setModal(null); }
    function editAvulsa(id, vals) { const n = { ...data, avulsasDespesas: data.avulsasDespesas.map(r => r.id === id ? { ...r, ...vals } : r) }; setData(n); SD().save(n); setModal(null); }
    function deleteAvulsa(id) { const n = { ...data, avulsasDespesas: data.avulsasDespesas.filter(r => r.id !== id) }; setData(n); SD().save(n); setConfirm(null); }

    // ── Parcelada handlers ──
    function addParcelada(vals) {
      const centTotal = Math.round(vals.totalAmount * 100);
      const base = Math.floor(centTotal / vals.installmentCount);
      const rem = centTotal - base * vals.installmentCount;
      const installments = Array.from({ length: vals.installmentCount }, (_, i) => {
        const { month, year } = SD().addMonths(vals.startMonth, vals.startYear, i);
        return { id: uuid(), installmentNumber: i + 1, amount: (base + (i === 0 ? rem : 0)) / 100, competenceMonth: month, competenceYear: year };
      });
      const n = { ...data, parceladasDespesas: [...data.parceladasDespesas, { id: uuid(), ...vals, installments }] };
      setData(n); SD().save(n); setModal(null);
    }
    function deleteParcelada(id) { const n = { ...data, parceladasDespesas: data.parceladasDespesas.filter(p => p.id !== id) }; setData(n); SD().save(n); setConfirm(null); }

    // ── Recorrente handlers ──
    function addRecorrente(vals) {
      const r = { id: uuid(), startMonth: vals.startMonth, startYear: vals.startYear, endMonth: vals.endMonth, endYear: vals.endYear, versions: [{ id: uuid(), categoryId: vals.categoryId, description: vals.description, amount: vals.amount, effectiveMonth: vals.startMonth, effectiveYear: vals.startYear }] };
      const n = { ...data, recorrentesDespesas: [...data.recorrentesDespesas, r] };
      setData(n); SD().save(n); setModal(null);
    }
    function addRecVersion(vals) {
      const n = { ...data, recorrentesDespesas: data.recorrentesDespesas.map(r => r.id === vals.recurringId ? { ...r, versions: [...r.versions, { id: uuid(), categoryId: vals.categoryId, description: vals.description, amount: vals.amount, effectiveMonth: vals.effectiveMonth, effectiveYear: vals.effectiveYear }] } : r) };
      setData(n); SD().save(n); setModal(null);
    }
    function endRecorrente(vals) {
      const n = { ...data, recorrentesDespesas: data.recorrentesDespesas.map(r => r.id === vals.recurringId ? { ...r, endMonth: vals.endMonth, endYear: vals.endYear } : r) };
      setData(n); SD().save(n); setModal(null);
    }
    function deleteRecorrente(id) { const n = { ...data, recorrentesDespesas: data.recorrentesDespesas.filter(r => r.id !== id) }; setData(n); SD().save(n); setConfirm(null); }

    const sortedAvulsas = useMemo(() =>
      [...data.avulsasDespesas].sort((a, b) => compareMonths(b.competenceMonth, b.competenceYear, a.competenceMonth, a.competenceYear)),
      [data.avulsasDespesas]
    );

    const tabButtons = {
      avulsas: 'Nova despesa avulsa',
      parceladas: 'Novo parcelamento',
      recorrentes: 'Nova despesa recorrente',
    };

    return (
      <div className="s-content" data-screen-label="Despesas">
        <SPageHeader
          title="Despesas"
          subtitle="Gerencie suas despesas avulsas, parceladas e recorrentes"
          action={<SBtn onClick={() => setModal({ type: `add-${tab}` })}>+ {tabButtons[tab]}</SBtn>}
        />

        <STabs active={tab} onChange={setTab} tabs={[
          { id: 'avulsas', label: 'Avulsas', count: data.avulsasDespesas.length },
          { id: 'parceladas', label: 'Parceladas', count: data.parceladasDespesas.length },
          { id: 'recorrentes', label: 'Recorrentes', count: data.recorrentesDespesas.length },
        ]} />

        {tab === 'avulsas' && (
          <div className="s-tab-content">
            <STable
              columns={[
                { key: 'description', label: 'Descrição' },
                { key: 'category', label: 'Categoria', render: r => cats.find(c => c.id === r.categoryId)?.name || '—' },
                { key: 'competence', label: 'Competência', render: r => formatMonthShort(r.competenceMonth, r.competenceYear) },
                { key: 'amount', label: 'Valor', style: { textAlign: 'right' }, render: r => <span className="s-amount red">{formatCurrency(r.amount)}</span> },
              ]}
              rows={sortedAvulsas}
              onEdit={r => setModal({ type: 'edit-avulsas', payload: r })}
              onDelete={r => setConfirm({ type: 'del-avulsa', id: r.id, label: r.description })}
              emptyMessage="Nenhuma despesa avulsa cadastrada."
            />
          </div>
        )}

        {tab === 'parceladas' && (
          <div className="s-tab-content">
            {data.parceladasDespesas.length === 0
              ? <SEmpty icon={<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="5" y="9" width="30" height="22" rx="3" stroke="var(--border)" strokeWidth="2"/><path d="M5 15h30" stroke="var(--border)" strokeWidth="2"/><circle cx="13" cy="26" r="2" fill="var(--border)"/><circle cx="20" cy="26" r="2" fill="var(--border)"/><circle cx="27" cy="26" r="2" fill="var(--border)"/></svg>} message="Nenhum parcelamento cadastrado." action={<SBtn onClick={() => setModal({ type: 'add-parceladas' })}>+ Criar parcelamento</SBtn>} />
              : <div className="s-fixed-list">
                  {data.parceladasDespesas.map(p => {
                    const cat = cats.find(c => c.id === p.categoryId);
                    const paidCount = p.installments.filter(i => compareMonths(i.competenceMonth, i.competenceYear, CM, CY) < 0).length;
                    return (
                      <div key={p.id} className="s-fixed-card">
                        <div className="s-fixed-card-hd">
                          <div>
                            <div className="s-fixed-card-name">{p.description}</div>
                            <div className="s-fixed-card-meta">
                              <SBadge type="parcelada" />
                              {cat && <span className="s-pill cat">{cat.name}</span>}
                            </div>
                          </div>
                          <div className="s-fixed-card-right">
                            <span className="s-fixed-card-amount red">{formatCurrency(p.installments[0]?.amount)}<span className="s-fixed-card-per">/parcela</span></span>
                            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{formatCurrency(p.totalAmount)} total</span>
                          </div>
                        </div>
                        <div className="s-fixed-card-dates">
                          {p.installmentCount}× · {formatMonthShort(p.startMonth, p.startYear)} → {formatMonthShort(...(() => { const e = SD().addMonths(p.startMonth, p.startYear, p.installmentCount - 1); return [e.month, e.year]; })())}
                          <span style={{ marginLeft: 12, color: 'var(--text-subtle)' }}>{paidCount}/{p.installmentCount} pagas</span>
                        </div>
                        <div className="s-parcel-bar">
                          <div className="s-parcel-fill" style={{ width: `${(paidCount / p.installmentCount) * 100}%` }} />
                        </div>
                        <div className="s-fixed-card-actions">
                          <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'view-parcelas', payload: p })}>Ver parcelas</SBtn>
                          <SBtn variant="ghost" size="sm" onClick={() => setConfirm({ type: 'del-parcelada', id: p.id, label: p.description })}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </SBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {tab === 'recorrentes' && (
          <div className="s-tab-content">
            {data.recorrentesDespesas.length === 0
              ? <SEmpty icon={<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 8a12 12 0 1 1-8.485 3.515" stroke="var(--border)" strokeWidth="2" strokeLinecap="round"/><path d="M20 8v6l4 2" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>} message="Nenhuma despesa recorrente cadastrada." action={<SBtn onClick={() => setModal({ type: 'add-recorrentes' })}>+ Criar recorrente</SBtn>} />
              : <div className="s-fixed-list">
                  {data.recorrentesDespesas.map(r => {
                    const cv = getActiveVersion(r.versions, CM, CY);
                    const cat = cats.find(c => c.id === cv?.categoryId);
                    const isEnded = r.endMonth != null && compareMonths(r.endMonth, r.endYear, CM, CY) < 0;
                    return (
                      <div key={r.id} className={`s-fixed-card${isEnded ? ' ended' : ''}`}>
                        <div className="s-fixed-card-hd">
                          <div>
                            <div className="s-fixed-card-name">{cv?.description || '—'}</div>
                            <div className="s-fixed-card-meta">
                              <SBadge type="recorrente" />
                              {cat && <span className="s-pill cat">{cat.name}</span>}
                              {isEnded && <span className="s-pill past">Encerrada</span>}
                            </div>
                          </div>
                          <div className="s-fixed-card-right">
                            <span className="s-fixed-card-amount red">{formatCurrency(cv?.amount || 0)}<span className="s-fixed-card-per">/mês</span></span>
                          </div>
                        </div>
                        <div className="s-fixed-card-dates">
                          Vigência: {formatMonthShort(r.startMonth, r.startYear)} → {r.endMonth ? formatMonthShort(r.endMonth, r.endYear) : 'em aberto'}
                          <span style={{ marginLeft: 12, color: 'var(--text-subtle)' }}>{r.versions.length} versão{r.versions.length !== 1 ? 'ões' : ''}</span>
                        </div>
                        <div className="s-fixed-card-actions">
                          {!isEnded && <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'add-rec-version', payload: { recurringId: r.id } })}>+ Nova versão</SBtn>}
                          {!isEnded && <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'end-recorrente', payload: { recurringId: r.id } })}>Encerrar</SBtn>}
                          <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'view-rec-versions', payload: r })}>Ver histórico</SBtn>
                          <SBtn variant="ghost" size="sm" onClick={() => setConfirm({ type: 'del-recorrente', id: r.id, label: cv?.description })}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </SBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* Modals */}
        {modal?.type === 'add-avulsas' && <SModal title="Nova despesa avulsa" onClose={() => setModal(null)}><AvulsaDespesaForm categories={cats} onSave={addAvulsa} onClose={() => setModal(null)} /></SModal>}
        {modal?.type === 'edit-avulsas' && <SModal title="Editar despesa avulsa" onClose={() => setModal(null)}><AvulsaDespesaForm initial={modal.payload} categories={cats} onSave={v => editAvulsa(modal.payload.id, v)} onClose={() => setModal(null)} /></SModal>}
        {modal?.type === 'add-parceladas' && <SModal title="Novo parcelamento" onClose={() => setModal(null)} width={520}><ParceladaForm categories={cats} onSave={addParcelada} onClose={() => setModal(null)} /></SModal>}
        {modal?.type === 'add-recorrentes' && <SModal title="Nova despesa recorrente" onClose={() => setModal(null)} width={520}><RecorrenteForm categories={cats} onSave={addRecorrente} onClose={() => setModal(null)} /></SModal>}
        {modal?.type === 'add-rec-version' && <SModal title="Nova versão da despesa" onClose={() => setModal(null)} width={520}><RecVersionForm recurringId={modal.payload.recurringId} categories={cats} onSave={addRecVersion} onClose={() => setModal(null)} /></SModal>}
        {modal?.type === 'end-recorrente' && <SModal title="Encerrar despesa recorrente" onClose={() => setModal(null)}><EndRecForm recurringId={modal.payload.recurringId} onSave={endRecorrente} onClose={() => setModal(null)} /></SModal>}

        {modal?.type === 'view-parcelas' && (
          <SModal title={`Parcelas — ${modal.payload.description}`} onClose={() => setModal(null)} width={520}>
            <div className="s-version-list">
              {modal.payload.installments.map(inst => {
                const isPast = compareMonths(inst.competenceMonth, inst.competenceYear, CM, CY) < 0;
                const isCur = inst.competenceMonth === CM && inst.competenceYear === CY;
                return (
                  <div key={inst.id} className={`s-version-row${isPast ? ' muted' : ''}`}>
                    <span className="s-version-date">{formatMonthShort(inst.competenceMonth, inst.competenceYear)}</span>
                    <span>{inst.installmentNumber}/{modal.payload.installmentCount}</span>
                    {isPast && <span className="s-pill past" style={{ fontSize: 10 }}>Pago</span>}
                    {isCur && <span className="s-pill current" style={{ fontSize: 10 }}>Atual</span>}
                    <span className="s-version-amount red" style={{ marginLeft: 'auto' }}>{formatCurrency(inst.amount)}</span>
                  </div>
                );
              })}
            </div>
          </SModal>
        )}

        {modal?.type === 'view-rec-versions' && (
          <SModal title="Histórico de versões" onClose={() => setModal(null)} width={520}>
            <div className="s-version-list">
              {[...modal.payload.versions].sort((a, b) => compareMonths(b.effectiveMonth, b.effectiveYear, a.effectiveMonth, a.effectiveYear)).map(v => {
                const cat = cats.find(c => c.id === v.categoryId);
                return (
                  <div key={v.id} className="s-version-row">
                    <span className="s-version-date">A partir de {formatMonthShort(v.effectiveMonth, v.effectiveYear)}</span>
                    <div style={{ flex: 1 }}>
                      <div className="s-version-desc">{v.description}</div>
                      {cat && <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{cat.name}</div>}
                    </div>
                    <span className="s-version-amount red">{formatCurrency(v.amount)}/mês</span>
                  </div>
                );
              })}
            </div>
          </SModal>
        )}

        {confirm?.type === 'del-avulsa' && <SConfirm message={`Excluir a despesa "${confirm.label}"?`} onConfirm={() => deleteAvulsa(confirm.id)} onCancel={() => setConfirm(null)} />}
        {confirm?.type === 'del-parcelada' && <SConfirm message={`Excluir todo o parcelamento "${confirm.label}"? Todas as parcelas serão removidas.`} onConfirm={() => deleteParcelada(confirm.id)} onCancel={() => setConfirm(null)} />}
        {confirm?.type === 'del-recorrente' && <SConfirm message={`Excluir a despesa recorrente "${confirm.label}"?`} onConfirm={() => deleteRecorrente(confirm.id)} onCancel={() => setConfirm(null)} />}
      </div>
    );
  }

  window.SmaugDespesas = Despesas;
})();
