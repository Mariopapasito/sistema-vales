import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import '../styles/SearchFilters.css';

export interface FilterValues {
  busqueda: string;
  estado: string;
  prioridad: string;
  tipo: string;
  estacion: string;
  fechaDesde: string;
  fechaHasta: string;
}

interface SearchFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  showTipoFilter?: boolean;
  resultCount: number;
}

const emptyFilters: FilterValues = {
  busqueda: '',
  estado: '',
  prioridad: '',
  tipo: '',
  estacion: '',
  fechaDesde: '',
  fechaHasta: '',
};

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onExportExcel,
  onExportPDF,
  showTipoFilter = false,
  resultCount,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchText, setSearchText] = useState(filters.busqueda);

  useEffect(() => {
    setSearchText(filters.busqueda);
  }, [filters.busqueda]);

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== '');
  const activeCount = Object.values(filters).filter(v => v !== '').length;

  const set = (key: keyof FilterValues, value: string) =>
    onChange({ ...filters, [key]: value });

  const applySearch = () => {
    onChange({ ...filters, busqueda: searchText });
  };

  const clearAll = () => onChange(emptyFilters);

  return (
    <div className="search-filters-wrapper">
      {/* Search bar row */}
      <div className="search-row">
        <div className="search-input-wrap">
          <MagnifyingGlassIcon className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por folio, descripción, estación..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applySearch();
            }}
            className="search-input"
          />
          {searchText && (
            <button className="clear-btn" onClick={() => {
              setSearchText('');
              onChange({ ...filters, busqueda: '' });
            }}>
              <XMarkIcon style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        <button
          className={`filter-toggle-btn ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Filtros avanzados"
        >
          <FunnelIcon style={{ width: 18, height: 18 }} />
          {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
        </button>

        <div className="export-buttons">
          <button className="export-btn excel" onClick={onExportExcel} title="Exportar Excel">
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
            Excel
          </button>
          <button className="export-btn pdf" onClick={onExportPDF} title="Exportar PDF">
            <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
            PDF
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Estado</label>
              <select value={filters.estado} onChange={e => set('estado', e.target.value)}>
                <option value="">Todos</option>
                <option value="Sin iniciar">Sin iniciar</option>
                <option value="En proceso">En proceso</option>
                <option value="Completada">Completada</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Prioridad</label>
              <select value={filters.prioridad} onChange={e => set('prioridad', e.target.value)}>
                <option value="">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Baja">Baja</option>
                <option value="Paro">Paro</option>
                <option value="Correctivo">Correctivo</option>
              </select>
            </div>

            {showTipoFilter && (
              <div className="filter-group">
                <label>Tipo</label>
                <select value={filters.tipo} onChange={e => set('tipo', e.target.value)}>
                  <option value="">Todos</option>
                  <option value="sistemas">Sistemas</option>
                  <option value="compras">Compras</option>
                </select>
              </div>
            )}

            <div className="filter-group">
              <label>Estación</label>
              <input
                type="text"
                placeholder="Ej: Estacion Norte"
                value={filters.estacion}
                onChange={e => set('estacion', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Fecha desde</label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={e => set('fechaDesde', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Fecha hasta</label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={e => set('fechaHasta', e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filters-footer">
              <span className="results-count">{resultCount} resultados</span>
              <button className="clear-all-btn" onClick={clearAll}>
                <XMarkIcon style={{ width: 14, height: 14 }} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && !showAdvanced && (
        <div className="filter-chips">
          {filters.busqueda && <span className="chip"><MagnifyingGlassIcon style={{ width: 12, height: 12 }} /> "{filters.busqueda}"</span>}
          {filters.estado && <span className="chip">Estado: {filters.estado}</span>}
          {filters.prioridad && <span className="chip">Prioridad: {filters.prioridad}</span>}
          {filters.tipo && <span className="chip">Tipo: {filters.tipo}</span>}
          {filters.estacion && <span className="chip">Estación: {filters.estacion}</span>}
          {filters.fechaDesde && <span className="chip">Desde: {filters.fechaDesde}</span>}
          {filters.fechaHasta && <span className="chip">Hasta: {filters.fechaHasta}</span>}
          <button className="chip chip-clear" onClick={clearAll}>✕ Limpiar</button>
          <span className="chip chip-count">{resultCount} resultados</span>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
