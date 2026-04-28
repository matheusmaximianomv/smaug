// Smaug – Data Layer & Utilities
(function () {
  const STORAGE_KEY = 'smaug_v1';
  const CM = 4, CY = 2026; // current: April 2026

  function addMonths(month, year, n) {
    const d = new Date(year, month - 1 + n, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  function compareMonths(m1, y1, m2, y2) {
    return y1 !== y2 ? y1 - y2 : m1 - m2;
  }

  function isEligible(month, year) {
    return compareMonths(month, year, CM, CY) >= 0;
  }

  function isActiveInMonth(item, month, year) {
    if (compareMonths(item.startMonth, item.startYear, month, year) > 0) return false;
    if (item.endMonth != null && compareMonths(item.endMonth, item.endYear, month, year) < 0) return false;
    return true;
  }

  function getActiveVersion(versions, month, year) {
    const eligible = versions.filter(v =>
      compareMonths(v.effectiveMonth, v.effectiveYear, month, year) <= 0
    );
    if (!eligible.length) return null;
    return eligible.sort((a, b) =>
      compareMonths(b.effectiveMonth, b.effectiveYear, a.effectiveMonth, a.effectiveYear)
    )[0];
  }

  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  function formatMonthLong(month, year) {
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function formatMonthShort(month, year) {
    const NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${NAMES[month - 1]}/${String(year).slice(-2)}`;
  }

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }

  // Generate notebook installments: 12x R$400 starting Feb 2026
  const notebookInstallments = Array.from({ length: 12 }, (_, i) => {
    const { month, year } = addMonths(2, 2026, i);
    return { id: `nb-i${i + 1}`, installmentNumber: i + 1, amount: 400, competenceMonth: month, competenceYear: year };
  });

  const DEFAULT_DATA = {
    categories: [
      { id: 'c1', name: 'Moradia' },
      { id: 'c2', name: 'Alimentação' },
      { id: 'c3', name: 'Transporte' },
      { id: 'c4', name: 'Lazer' },
      { id: 'c5', name: 'Saúde' },
      { id: 'c6', name: 'Educação' },
    ],
    avulsasReceitas: [
      { id: 'ar1', description: 'Freelance – Design', amount: 2500, competenceMonth: 4, competenceYear: 2026 },
      { id: 'ar2', description: 'Freelance – Dev', amount: 1800, competenceMonth: 2, competenceYear: 2026 },
      { id: 'ar3', description: 'Bônus semestral', amount: 3000, competenceMonth: 1, competenceYear: 2026 },
    ],
    fixasReceitas: [
      {
        id: 'fr1', modality: 'alterable',
        startMonth: 1, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'frv1', description: 'Salário', amount: 8500, effectiveMonth: 1, effectiveYear: 2026 },
          { id: 'frv2', description: 'Salário (reajuste)', amount: 9200, effectiveMonth: 4, effectiveYear: 2026 },
        ],
      },
      {
        id: 'fr2', modality: 'unalterable',
        startMonth: 3, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'frv3', description: 'Aluguel recebido', amount: 1200, effectiveMonth: 3, effectiveYear: 2026 },
        ],
      },
    ],
    avulsasDespesas: [
      { id: 'ad1', categoryId: 'c2', description: 'Supermercado extra', amount: 320.50, competenceMonth: 4, competenceYear: 2026 },
      { id: 'ad2', categoryId: 'c4', description: 'Cinema + jantar', amount: 185, competenceMonth: 4, competenceYear: 2026 },
      { id: 'ad3', categoryId: 'c5', description: 'Farmácia', amount: 67.90, competenceMonth: 4, competenceYear: 2026 },
      { id: 'ad4', categoryId: 'c2', description: 'Delivery fim de semana', amount: 142, competenceMonth: 3, competenceYear: 2026 },
      { id: 'ad5', categoryId: 'c4', description: 'Teatro', amount: 90, competenceMonth: 2, competenceYear: 2026 },
    ],
    parceladasDespesas: [
      {
        id: 'pd1', categoryId: 'c6', description: 'Notebook Pro',
        totalAmount: 4800, installmentCount: 12, startMonth: 2, startYear: 2026,
        installments: notebookInstallments,
      },
    ],
    recorrentesDespesas: [
      {
        id: 'rd1', startMonth: 1, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'rdv1', categoryId: 'c1', description: 'Aluguel', amount: 2200, effectiveMonth: 1, effectiveYear: 2026 },
        ],
      },
      {
        id: 'rd2', startMonth: 1, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'rdv2', categoryId: 'c3', description: 'Combustível', amount: 450, effectiveMonth: 1, effectiveYear: 2026 },
          { id: 'rdv3', categoryId: 'c3', description: 'Combustível', amount: 480, effectiveMonth: 4, effectiveYear: 2026 },
        ],
      },
      {
        id: 'rd3', startMonth: 1, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'rdv4', categoryId: 'c4', description: 'Academia', amount: 120, effectiveMonth: 1, effectiveYear: 2026 },
        ],
      },
      {
        id: 'rd4', startMonth: 1, startYear: 2026, endMonth: null, endYear: null,
        versions: [
          { id: 'rdv5', categoryId: 'c5', description: 'Plano de saúde', amount: 380, effectiveMonth: 1, effectiveYear: 2026 },
        ],
      },
    ],
  };

  function load() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_DATA));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function reset() {
    const d = JSON.parse(JSON.stringify(DEFAULT_DATA));
    save(d);
    return d;
  }

  function getRevenuesForMonth(data, month, year) {
    const out = [];
    data.avulsasReceitas.forEach(r => {
      if (r.competenceMonth === month && r.competenceYear === year)
        out.push({ ...r, type: 'avulsa' });
    });
    data.fixasReceitas.forEach(f => {
      if (isActiveInMonth(f, month, year)) {
        const v = getActiveVersion(f.versions, month, year);
        if (v) out.push({ id: f.id, type: 'fixa', modality: f.modality, description: v.description, amount: v.amount, version: v, fixedId: f.id });
      }
    });
    return out;
  }

  function getExpensesForMonth(data, month, year) {
    const out = [];
    data.avulsasDespesas.forEach(e => {
      if (e.competenceMonth === month && e.competenceYear === year) {
        const cat = data.categories.find(c => c.id === e.categoryId);
        out.push({ ...e, type: 'avulsa', categoryName: cat?.name || '—' });
      }
    });
    data.parceladasDespesas.forEach(p => {
      const cat = data.categories.find(c => c.id === p.categoryId);
      p.installments.forEach(inst => {
        if (inst.competenceMonth === month && inst.competenceYear === year)
          out.push({ id: inst.id, type: 'parcelada', categoryId: p.categoryId, categoryName: cat?.name || '—', description: `${p.description} (${inst.installmentNumber}/${p.installmentCount})`, amount: inst.amount, parentId: p.id });
      });
    });
    data.recorrentesDespesas.forEach(r => {
      if (isActiveInMonth(r, month, year)) {
        const v = getActiveVersion(r.versions, month, year);
        if (v) {
          const cat = data.categories.find(c => c.id === v.categoryId);
          out.push({ id: r.id, type: 'recorrente', categoryId: v.categoryId, categoryName: cat?.name || '—', description: v.description, amount: v.amount, version: v, recurringId: r.id });
        }
      }
    });
    return out;
  }

  window.SmaugData = {
    CM, CY, uuid,
    load, save, reset,
    addMonths, compareMonths, isEligible, isActiveInMonth, getActiveVersion,
    formatCurrency, formatMonthLong, formatMonthShort,
    getRevenuesForMonth, getExpensesForMonth,
    MONTH_NAMES: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    MONTH_NAMES_FULL: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  };
})();
