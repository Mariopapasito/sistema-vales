import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { ArrowLeftIcon, ArchiveBoxIcon, DocumentTextIcon, SparklesIcon, PencilSquareIcon, CheckIcon, XMarkIcon, CheckCircleIcon, BellAlertIcon, HandThumbUpIcon, ArrowDownTrayIcon, PrinterIcon, BookOpenIcon,
} from '@heroicons/react/24/outline';
import OrderComments from '../components/OrderComments';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import '../styles/CreateMonthlyOrder.css';

interface Item {
  descripcion: string;
  consumibles: boolean;
  intercambiables: boolean;
  existencias: string;
  unidad: string;
  cantidad: number;
}

interface MonthlyOrder {
  id: string;
  folio: string;
  tipo: 'aceites' | 'papeleria' | 'limpieza' | 'toner' | 'imprenta';
  estacion: string;
  fecha: string;
  items: Item[];
  estado: 'borrador' | 'enviado' | 'completado';
  confirmadoCompras: boolean;
  confirmadoEstacion: boolean;
  createdByUser?: { nombre: string };
  createdBy: number;
}

const typeConfig = {
  aceites:   { label: 'PEDIDO ACEITES',   pillClass: 'pill-aceites',   Icon: ArchiveBoxIcon },
  papeleria: { label: 'PEDIDO PAPELERÍA', pillClass: 'pill-papeleria', Icon: DocumentTextIcon },
  limpieza:  { label: 'PEDIDO LIMPIEZA',  pillClass: 'pill-limpieza',  Icon: SparklesIcon },
  toner:     { label: 'PEDIDO TÓNER',     pillClass: 'pill-toner',     Icon: PrinterIcon },
  imprenta:  { label: 'PEDIDO IMPRENTA',  pillClass: 'pill-imprenta',  Icon: BookOpenIcon },
};

export default function MonthlyOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const [order, setOrder] = useState<MonthlyOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = ['jefe', 'sistemas'].includes(user?.rol || '');

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm(`¿Seguro que quieres eliminar el pedido ${order.folio}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeleting(true);
      await api.delete(`/monthly-orders/${order.id}`);
      navigate('/monthly-orders');
    } catch (err: any) {
      alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/monthly-orders/${id}`);
      setOrder(res.data.data);
      setEditItems(res.data.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addRows = (n: number) => {
    const blank: Item = { descripcion: '', consumibles: false, intercambiables: false, existencias: '', unidad: '', cantidad: 0 };
    setEditItems(prev => [...prev, ...Array(n).fill(null).map(() => ({ ...blank }))]);
  };

  const removeRow = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Item, value: any) => {
    const next = [...editItems];
    next[index] = next[index] || { descripcion: '', consumibles: false, intercambiables: false, existencias: '', unidad: '', cantidad: 0 };
    if (field === 'cantidad') {
      next[index][field] = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    } else {
      (next[index] as any)[field] = value;
    }
    setEditItems(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/monthly-orders/${order?.id}`, {
        items: editItems.filter(i => i.descripcion || i.cantidad > 0),
        estado: order?.estado
      });
      setIsEditing(false);
      fetchOrder();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const downloadAsExcel = () => {
    if (!order) return;
    const tipoLabels: any = {
      aceites:   'PEDIDO ACEITES',
      papeleria: 'PEDIDO PAPELERÍA',
      limpieza:  'PEDIDO LIMPIEZA',
      toner:     'PEDIDO TÓNER',
      imprenta:  'PEDIDO IMPRENTA'
    };
    const fecha = new Date(order.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const headerData = [
      ['MULTISERVICIO LA VILLITA S.A. DE C.V.'],
      ['Gerencia Operativa'],
      [`${tipoLabels[order.tipo]} — ${fecha}`],
      [`Folio: ${order.folio}    Estación: ${order.estacion}`],
      [],
      ['No.', 'Descripción', 'Consumibles', 'Intercambiables', 'Existencias', 'Unidad', 'Cantidad']
    ];
    const itemsData = order.items.map((item, idx) => [
      idx + 1, item.descripcion,
      item.consumibles ? 'Sí' : 'No',
      item.intercambiables ? 'Sí' : 'No',
      item.existencias, item.unidad,
      item.cantidad > 0 ? item.cantidad : ''
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headerData, ...itemsData]);
    ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, `${tipoLabels[order.tipo].replace(/ /g, '-')}-${order.folio}.xlsx`);
  };

  const downloadAsPDF = async () => {
    if (!order) return;
    const element = document.getElementById('monthly-order-document');
    if (!element) return;
    try {
      // Ocultar botones de acción antes de capturar
      const actions = document.getElementById('monthly-order-actions');
      if (actions) actions.style.display = 'none';

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });

      if (actions) actions.style.display = '';

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgW = pageW - 20;
      const imgH = imgW / ratio;

      let y = 10;
      let remainingH = imgH;
      let srcY = 0;

      while (remainingH > 0) {
        const sliceH = Math.min(remainingH, pageH - 20);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceH / imgH) * canvas.height;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(sliceData, 'JPEG', 10, y, imgW, sliceH);
        srcY += sliceCanvas.height;
        remainingH -= sliceH;
        if (remainingH > 0) { pdf.addPage(); y = 10; }
      }

      const tipoLabels: any = { aceites: 'Aceites', papeleria: 'Papeleria', limpieza: 'Limpieza', toner: 'Toner', imprenta: 'Imprenta' };
      pdf.save(`Pedido-${tipoLabels[order.tipo]}-${order.folio}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al generar PDF');
    }
  };

  const handleConfirmar = async () => {    try {
      setSaving(true);
      await api.patch(`/monthly-orders/${order?.id}/confirmar`);
      fetchOrder();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <span>Cargando pedido...</span>;
  }

  if (!order) {
    return <p>Pedido no encontrado</p>;
  }

  const cfg = typeConfig[order.tipo];
  const canEdit = (user?.rol === 'compras' || user?.rol === 'jefe') ||
    (user?.rol === 'estacion' && order.createdBy === user?.id && order.estado !== 'completado');

  const myConfirmation = user?.rol === 'estacion'
    ? order.confirmadoEstacion
    : ['compras', 'jefe'].includes(user?.rol || '')
      ? order.confirmadoCompras
      : true; // other roles don't need to confirm

  const otherConfirmed = user?.rol === 'estacion'
    ? order.confirmadoCompras
    : order.confirmadoEstacion;

  const showConfirmBtn = order.estado !== 'completado' && !myConfirmation &&
    (user?.rol === 'estacion' || user?.rol === 'compras' || user?.rol === 'jefe');

  return (
    <div className="dashboard-container">
          <button className="btn-back" onClick={() => navigate('/monthly-orders')}>
            <ArrowLeftIcon style={{ width: 16, height: 16 }} />
            Regresar
          </button>

          <div className="document-glass" id="monthly-order-document">
            {/* Header */}
            <div className="mo-doc-header">
              <div className="mo-doc-header-left">
                <h1>Multiservicio La Villita S.A. de C.V.</h1>
                <p>Gerencia Operativa</p>
              </div>
              <div className="mo-doc-header-right">
                <span className={`doc-type-pill ${cfg.pillClass}`}>
                  <cfg.Icon style={{ width: 16, height: 16 }} />
                  {cfg.label}
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="doc-meta">
              <div className="doc-meta-item">
                <span className="doc-meta-label">Folio</span>
                <span className="doc-meta-value">{order.folio}</span>
              </div>
              <div className="doc-meta-item">
                <span className="doc-meta-label">Fecha</span>
                <span className="doc-meta-value">{new Date(order.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="doc-meta-item">
                <span className="doc-meta-label">Estación</span>
                <span className="doc-meta-value">{order.estacion}</span>
              </div>
              <div className="doc-meta-item">
                <span className="doc-meta-label">Estado</span>
                <span className={`status-pill ${order.estado}`}>
                  {order.estado.charAt(0).toUpperCase() + order.estado.slice(1)}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="center">No.</th>
                    <th>Descripción</th>
                    <th className="center">Consumibles</th>
                    <th className="center">Intercambiables</th>
                    <th>Existencias</th>
                    <th>Unidad</th>
                    <th className="center">Cantidad</th>
                    {isEditing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, i) => (
                    <tr key={i}>
                      <td className="center row-num">{i + 1}</td>
                      <td>
                        {isEditing
                          ? <input type="text" value={item.descripcion} onChange={e => handleChange(i, 'descripcion', e.target.value)} placeholder="Descripción" />
                          : <span>{item.descripcion}</span>}
                      </td>
                      <td className="center">
                        {isEditing
                          ? <input type="checkbox" checked={item.consumibles} onChange={e => handleChange(i, 'consumibles', e.target.checked)} />
                          : item.consumibles ? <CheckIcon style={{ width: 16, height: 16, color: '#34d399', display: 'block', margin: '0 auto' }} /> : null}
                      </td>
                      <td className="center">
                        {isEditing
                          ? <input type="checkbox" checked={item.intercambiables} onChange={e => handleChange(i, 'intercambiables', e.target.checked)} />
                          : item.intercambiables ? <CheckIcon style={{ width: 16, height: 16, color: '#34d399', display: 'block', margin: '0 auto' }} /> : null}
                      </td>
                      <td>
                        {isEditing
                          ? <input type="text" value={item.existencias} onChange={e => handleChange(i, 'existencias', e.target.value)} placeholder="—" />
                          : <span>{item.existencias}</span>}
                      </td>
                      <td>
                        {isEditing
                          ? <input type="text" value={item.unidad} onChange={e => handleChange(i, 'unidad', e.target.value)} placeholder="pza / lt" />
                          : <span>{item.unidad}</span>}
                      </td>
                      <td className="center">
                        {isEditing
                          ? <input type="number" min="0" value={item.cantidad || ''} onChange={e => handleChange(i, 'cantidad', e.target.value)} placeholder="0" />
                          : <span>{item.cantidad > 0 ? item.cantidad : ''}</span>}
                      </td>
                      {isEditing && (
                        <td className="center">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '0 4px' }}
                            title="Eliminar fila"
                          >✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditing && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                <button type="button" className="btn-glass-cancel" onClick={() => addRows(5)}>+ 5 filas</button>
                <button type="button" className="btn-glass-cancel" onClick={() => addRows(10)}>+ 10 filas</button>
              </div>
            )}

            {/* Signature */}
            <div className="doc-signature">
              <div className="signature-box">
                <span className="sig-name">{order.createdByUser?.nombre || order.estacion}</span>
                <span className="sig-label">Solicita — Gerente de Estación</span>
              </div>
            </div>

            {/* Actions */}
            <div className="doc-actions" id="monthly-order-actions">
              {!isEditing ? (
                <>
                  <button className="btn-glass-cancel" onClick={() => navigate('/monthly-orders')}>
                    <ArrowLeftIcon style={{ width: 16, height: 16 }} />
                    Volver
                  </button>
                  {['compras', 'jefe'].includes(user?.rol || '') && (
                    <button className="btn-glass-cancel" onClick={downloadAsExcel}>
                      <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                      Descargar Excel
                    </button>
                  )}
                  {['compras', 'jefe'].includes(user?.rol || '') && (
                    <button className="btn-glass-cancel" onClick={downloadAsPDF}>
                      <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                      Descargar PDF
                    </button>
                  )}
                  {canEdit && (
                    <button className="btn-glass-save" onClick={() => setIsEditing(true)}>
                      <PencilSquareIcon style={{ width: 16, height: 16 }} />
                      Editar
                    </button>
                  )}
                  {canEdit && order.estado !== 'completado' && (
                    <button className="btn-glass-complete" onClick={handleConfirmar} disabled={saving}>
                      <CheckCircleIcon style={{ width: 16, height: 16 }} />
                      {saving ? 'Guardando...' : 'Marcar Completado'}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        padding: '0.5rem 1.1rem',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1.5px solid #fca5a5',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      🗑 {deleting ? 'Eliminando...' : 'Eliminar pedido'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="btn-glass-cancel" onClick={() => { setIsEditing(false); setEditItems(order.items); }} disabled={saving}>
                    <XMarkIcon style={{ width: 16, height: 16 }} />
                    Cancelar
                  </button>
                  <button className="btn-glass-save" onClick={handleSave} disabled={saving}>
                    <CheckIcon style={{ width: 16, height: 16 }} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Comments below the document */}
          <div style={{ marginTop: '1.5rem' }}>
            <OrderComments orderId={parseInt(order.id)} basePath="monthly-orders" />
          </div>
        </div>
  );
}
