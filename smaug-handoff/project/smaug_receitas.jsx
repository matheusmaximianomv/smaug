// Smaug – Receitas Screen
(function () {
  const { useState, useMemo } = React;
  const SD = () => window.SmaugData;

  // ── Avulsa Form ──────────────────────────────────────────────
  function AvulsaForm({ initial, onSave, onClose }) {
    const { CM, CY, MONTH_NAMES_FULL, isEligible } = SD();
    const [desc, setDesc] = useState(initial?.description || '');
    const [amount, setAmount] = useState(initial?.amount?.toString() || '');
    const [month, setMonth] = useState(initial?.competenceMonth || CM);
    const [year, setYear] = useState(initial?.competenceYear || CY);
    const [errs, setErrs] = useState({});

    function validate() {
      const e = {};
      if (!desc.trim() || desc.length > 255) e.desc = 'Descrição obrigatória (máx. 255 caracteres).';
      const n = parseFloat(amount);
      if (isNaN(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.'))) e.amount = 'Valor inválido. Use número positivo com até 2 casas decimais.';
      if (!isEligible(month, year) && !initial) e.comp = 'Não é permitido criar receitas em competências passadas.';
      return e;
    }

    function submit(e) {
      e.preventDefault();
      const v = validate();
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({ description: desc.trim(), amount: parseFloat(amount.replace(',', '.')), competenceMonth: month, competenceYear: year });
    }

    const years = [2025, 2026, 2027, 2028];
    return (
      <form onSubmit={submit}>
        <SInput label="Descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus placeholder="Ex: Freelance, bônus..." />
        <SInput label="Valor (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
        <SMonthYear label="Competência" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required error={errs.comp} />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit" variant="primary">{initial ? 'Salvar alterações' : 'Adicionar receita'}</SBtn>
        </div>
      </form>
    );
  }

  // ── Fixa Form ────────────────────────────────────────────────
  function FixaForm({ onSave, onClose }) {
    const { CM, CY, isEligible } = SD();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [modality, setModality] = useState('alterable');
    const [startMonth, setStartMonth] = useState(CM);
    const [startYear, setStartYear] = useState(CY);
    const [hasEnd, setHasEnd] = useState(false);
    const [endMonth, setEndMonth] = useState(CM);
    const [endYear, setEndYear] = useState(CY);
    const [errs, setErrs] = useState({});

    function validate() {
      const e = {};
      if (!desc.trim() || desc.length > 255) e.desc = 'Descrição obrigatória.';
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n) || n <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.'))) e.amount = 'Valor inválido.';
      if (!isEligible(startMonth, startYear)) e.start = 'Início não pode ser em competência passada.';
      if (hasEnd && window.SmaugData.compareMonths(endMonth, endYear, startMonth, startYear) < 0) e.end = 'Término não pode ser anterior ao início.';
      return e;
    }

    function submit(ev) {
      ev.preventDefault();
      const v = validate();
      if (Object.keys(v).length) { setErrs(v); return; }
      onSave({
        modality,
        startMonth, startYear,
        endMonth: hasEnd ? endMonth : null,
        endYear: hasEnd ? endYear : null,
        initialDescription: desc.trim(),
        initialAmount: parseFloat(amount.replace(',', '.')),
      });
    }

    return (
      <form onSubmit={submit}>
        <SInput label="Descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus placeholder="Ex: Salário, aluguel recebido..." />
        <SInput label="Valor mensal (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
        <SSelect
          label="Modalidade"
          value={modality} onChange={setModality}
          required
          options={[{ value: 'alterable', label: 'Alterável – pode ser reajustada com histórico' }, { value: 'unalterable', label: 'Inalterável – somente encerramento' }]}
        />
        <SMonthYear label="Início da vigência" month={startMonth} year={startYear} onMonthChange={setStartMonth} onYearChange={setStartYear} required error={errs.start} />
        <div className="s-field">
          <label className="s-label">
            <input type="checkbox" checked={hasEnd} onChange={e => setHasEnd(e.target.checked)} style={{ marginRight: 6 }} />
            Definir data de término
          </label>
        </div>
        {hasEnd && <SMonthYear label="Término da vigência" month={endMonth} year={endYear} onMonthChange={setEndMonth} onYearChange={setEndYear} error={errs.end} />}
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit" variant="primary">Criar receita fixa</SBtn>
        </div>
      </form>
    );
  }

  // ── New Version Form ─────────────────────────────────────────
  function VersionForm({ fixedId, onSave, onClose }) {
    const { CM, CY, isEligible } = SD();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(CM);
    const [year, setYear] = useState(CY);
    const [errs, setErrs] = useState({});

    function submit(ev) {
      ev.preventDefault();
      const e = {};
      if (!desc.trim()) e.desc = 'Descrição obrigatória.';
      const n = parseFloat(amount.replace(',', '.'));
      if (isNaN(n) || n <= 0) e.amount = 'Valor inválido.';
      if (!isEligible(month, year)) e.eff = 'Vigência não pode ser em mês passado.';
      if (Object.keys(e).length) { setErrs(e); return; }
      onSave({ fixedId, description: desc.trim(), amount: n, effectiveMonth: month, effectiveYear: year });
    }

    return (
      <form onSubmit={submit}>
        <p className="s-form-hint">A nova versão será aplicada a partir do mês selecionado. Meses anteriores preservam o valor antigo.</p>
        <SInput label="Nova descrição" value={desc} onChange={setDesc} required error={errs.desc} autoFocus />
        <SInput label="Novo valor (R$)" value={amount} onChange={setAmount} type="text" placeholder="0,00" required error={errs.amount} />
        <SMonthYear label="Vigência a partir de" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required error={errs.eff} />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit" variant="primary">Criar nova versão</SBtn>
        </div>
      </form>
    );
  }

  // ── End Fixed Form ───────────────────────────────────────────
  function EndFixaForm({ fixedId, onSave, onClose }) {
    const { CM, CY } = SD();
    const [month, setMonth] = useState(CM);
    const [year, setYear] = useState(CY);
    const [errs, setErrs] = useState({});

    function submit(ev) {
      ev.preventDefault();
      onSave({ fixedId, endMonth: month, endYear: year });
    }

    return (
      <form onSubmit={submit}>
        <p className="s-form-hint">A receita fixa será encerrada ao final do mês selecionado. Meses anteriores permanecem intactos.</p>
        <SMonthYear label="Mês de encerramento" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} required />
        <div className="s-modal-ft">
          <SBtn variant="ghost" onClick={onClose} type="button">Cancelar</SBtn>
          <SBtn type="submit" variant="danger">Encerrar receita</SBtn>
        </div>
      </form>
    );
  }

  // ── Main Screen ──────────────────────────────────────────────
  function Receitas({ data, setData }) {
    const { uuid, formatCurrency, formatMonthShort, compareMonths, CM, CY } = SD();
    const [tab, setTab] = useState('avulsas');
    const [modal, setModal] = useState(null); // {type, payload}
    const [confirm, setConfirm] = useState(null);

    // ── Avulsas Handlers ──
    function addAvulsa(vals) {
      const next = { ...data, avulsasReceitas: [...data.avulsasReceitas, { id: uuid(), ...vals }] };
      setData(next); window.SmaugData.save(next); setModal(null);
    }

    function editAvulsa(id, vals) {
      const next = { ...data, avulsasReceitas: data.avulsasReceitas.map(r => r.id === id ? { ...r, ...vals } : r) };
      setData(next); window.SmaugData.save(next); setModal(null);
    }

    function deleteAvulsa(id) {
      const next = { ...data, avulsasReceitas: data.avulsasReceitas.filter(r => r.id !== id) };
      setData(next); window.SmaugData.save(next); setConfirm(null);
    }

    // ── Fixas Handlers ──
    function addFixa(vals) {
      const newFixed = {
        id: uuid(), modality: vals.modality,
        startMonth: vals.startMonth, startYear: vals.startYear,
        endMonth: vals.endMonth, endYear: vals.endYear,
        versions: [{ id: uuid(), description: vals.initialDescription, amount: vals.initialAmount, effectiveMonth: vals.startMonth, effectiveYear: vals.startYear }],
      };
      const next = { ...data, fixasReceitas: [...data.fixasReceitas, newFixed] };
      setData(next); window.SmaugData.save(next); setModal(null);
    }

    function addVersion(vals) {
      const next = {
        ...data,
        fixasReceitas: data.fixasReceitas.map(f =>
          f.id === vals.fixedId ? { ...f, versions: [...f.versions, { id: uuid(), description: vals.description, amount: vals.amount, effectiveMonth: vals.effectiveMonth, effectiveYear: vals.effectiveYear }] } : f
        ),
      };
      setData(next); window.SmaugData.save(next); setModal(null);
    }

    function endFixa(vals) {
      const next = {
        ...data,
        fixasReceitas: data.fixasReceitas.map(f =>
          f.id === vals.fixedId ? { ...f, endMonth: vals.endMonth, endYear: vals.endYear } : f
        ),
      };
      setData(next); window.SmaugData.save(next); setModal(null);
    }

    function deleteFixa(id) {
      const next = { ...data, fixasReceitas: data.fixasReceitas.filter(f => f.id !== id) };
      setData(next); window.SmaugData.save(next); setConfirm(null);
    }

    // Sort avulsas by competence desc
    const sortedAvulsas = useMemo(() =>
      [...data.avulsasReceitas].sort((a, b) => compareMonths(b.competenceMonth, b.competenceYear, a.competenceMonth, a.competenceYear)),
      [data.avulsasReceitas]
    );

    return (
      <div className="s-content" data-screen-label="Receitas">
        <SPageHeader
          title="Receitas"
          subtitle="Gerencie suas receitas avulsas e fixas"
          action={
            <SBtn onClick={() => setModal({ type: tab === 'avulsas' ? 'add-avulsa' : 'add-fixa' })}>
              + {tab === 'avulsas' ? 'Nova receita avulsa' : 'Nova receita fixa'}
            </SBtn>
          }
        />

        <STabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'avulsas', label: 'Avulsas', count: data.avulsasReceitas.length },
            { id: 'fixas', label: 'Fixas', count: data.fixasReceitas.length },
          ]}
        />

        {tab === 'avulsas' && (
          <div className="s-tab-content">
            <STable
              columns={[
                { key: 'description', label: 'Descrição' },
                { key: 'competence', label: 'Competência', render: r => formatMonthShort(r.competenceMonth, r.competenceYear) },
                { key: 'amount', label: 'Valor', style: { textAlign: 'right' }, render: r => <span className="s-amount green">{formatCurrency(r.amount)}</span> },
              ]}
              rows={sortedAvulsas}
              onEdit={r => setModal({ type: 'edit-avulsa', payload: r })}
              onDelete={r => setConfirm({ type: 'del-avulsa', id: r.id, label: r.description })}
              emptyMessage="Nenhuma receita avulsa cadastrada."
            />
          </div>
        )}

        {tab === 'fixas' && (
          <div className="s-tab-content">
            {data.fixasReceitas.length === 0
              ? <SEmpty icon={<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="8" width="28" height="26" rx="3" stroke="var(--border)" strokeWidth="2"/><path d="M13 16h14M13 22h8" stroke="var(--border)" strokeWidth="2" strokeLinecap="round"/></svg>} message="Nenhuma receita fixa cadastrada." action={<SBtn onClick={() => setModal({ type: 'add-fixa' })}>+ Criar primeira receita fixa</SBtn>} />
              : (
                <div className="s-fixed-list">
                  {data.fixasReceitas.map(f => {
                    const cv = window.SmaugData.getActiveVersion(f.versions, CM, CY);
                    const isEnded = f.endMonth != null && compareMonths(f.endMonth, f.endYear, CM, CY) < 0;
                    return (
                      <div key={f.id} className={`s-fixed-card${isEnded ? ' ended' : ''}`}>
                        <div className="s-fixed-card-hd">
                          <div>
                            <div className="s-fixed-card-name">{cv?.description || f.versions[0]?.description}</div>
                            <div className="s-fixed-card-meta">
                              <SBadge type="fixa" />
                              <SBadge type={f.modality} />
                              {isEnded && <span className="s-pill past">Encerrada</span>}
                            </div>
                          </div>
                          <div className="s-fixed-card-right">
                            <span className="s-fixed-card-amount green">{formatCurrency(cv?.amount || 0)}<span className="s-fixed-card-per">/mês</span></span>
                          </div>
                        </div>
                        <div className="s-fixed-card-dates">
                          Vigência: {formatMonthShort(f.startMonth, f.startYear)} → {f.endMonth ? formatMonthShort(f.endMonth, f.endYear) : 'em aberto'}
                          <span style={{ marginLeft: 12, color: 'var(--text-subtle)' }}>{f.versions.length} versão{f.versions.length !== 1 ? 'ões' : ''}</span>
                        </div>
                        <div className="s-fixed-card-actions">
                          {f.modality === 'alterable' && !isEnded && (
                            <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'add-version', payload: { fixedId: f.id } })}>+ Nova versão</SBtn>
                          )}
                          {!isEnded && (
                            <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'end-fixa', payload: { fixedId: f.id } })}>Encerrar</SBtn>
                          )}
                          <SBtn variant="ghost" size="sm" onClick={() => setModal({ type: 'view-versions', payload: f })}>Ver histórico</SBtn>
                          <SBtn variant="ghost" size="sm" onClick={() => setConfirm({ type: 'del-fixa', id: f.id, label: cv?.description })}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.75 8h6.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </SBtn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* Modals */}
        {modal?.type === 'add-avulsa' && (
          <SModal title="Nova receita avulsa" onClose={() => setModal(null)}>
            <AvulsaForm onSave={addAvulsa} onClose={() => setModal(null)} />
          </SModal>
        )}
        {modal?.type === 'edit-avulsa' && (
          <SModal title="Editar receita avulsa" onClose={() => setModal(null)}>
            <AvulsaForm initial={modal.payload} onSave={v => editAvulsa(modal.payload.id, v)} onClose={() => setModal(null)} />
          </SModal>
        )}
        {modal?.type === 'add-fixa' && (
          <SModal title="Nova receita fixa" onClose={() => setModal(null)} width={520}>
            <FixaForm onSave={addFixa} onClose={() => setModal(null)} />
          </SModal>
        )}
        {modal?.type === 'add-version' && (
          <SModal title="Nova versão da receita fixa" onClose={() => setModal(null)}>
            <VersionForm fixedId={modal.payload.fixedId} onSave={addVersion} onClose={() => setModal(null)} />
          </SModal>
        )}
        {modal?.type === 'end-fixa' && (
          <SModal title="Encerrar receita fixa" onClose={() => setModal(null)}>
            <EndFixaForm fixedId={modal.payload.fixedId} onSave={endFixa} onClose={() => setModal(null)} />
          </SModal>
        )}
        {modal?.type === 'view-versions' && (
          <SModal title="Histórico de versões" onClose={() => setModal(null)} width={520}>
            <div className="s-version-list">
              {[...modal.payload.versions].sort((a, b) => window.SmaugData.compareMonths(b.effectiveMonth, b.effectiveYear, a.effectiveMonth, a.effectiveYear)).map(v => (
                <div key={v.id} className="s-version-row">
                  <div className="s-version-meta">
                    <span className="s-version-date">A partir de {formatMonthShort(v.effectiveMonth, v.effectiveYear)}</span>
                  </div>
                  <div className="s-version-desc">{v.description}</div>
                  <div className="s-version-amount green">{formatCurrency(v.amount)}/mês</div>
                </div>
              ))}
            </div>
          </SModal>
        )}

        {confirm?.type === 'del-avulsa' && (
          <SConfirm
            message={`Tem certeza que deseja excluir a receita "${confirm.label}"? Esta ação não pode ser desfeita.`}
            onConfirm={() => deleteAvulsa(confirm.id)}
            onCancel={() => setConfirm(null)}
          />
        )}
        {confirm?.type === 'del-fixa' && (
          <SConfirm
            message={`Tem certeza que deseja excluir permanentemente a receita fixa "${confirm.label}"?`}
            onConfirm={() => deleteFixa(confirm.id)}
            onCancel={() => setConfirm(null)}
          />
        )}
      </div>
    );
  }

  window.SmaugReceitas = Receitas;
})();
