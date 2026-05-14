import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportOrder {
  folio: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  tipo: string;
  localizacion: string;
  createdAt: string;
  User?: { nombre: string; estacion: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ordersToRows(orders: ExportOrder[]) {
  return orders.map(o => ({
    Folio: o.folio,
    'Creado por': o.User?.nombre || '—',
    Estación: o.localizacion || o.User?.estacion || '—',
    Tipo: o.tipo === 'sistemas' ? 'Sistemas' : 'Compras',
    Prioridad: o.prioridad,
    Estado: o.estado,
    Descripción: o.descripcion,
    Fecha: formatDate(o.createdAt),
  }));
}

export function exportToExcel(orders: ExportOrder[], filename = 'ordenes') {
  const rows = ordersToRows(orders);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // Folio
    { wch: 22 }, // Creado por
    { wch: 20 }, // Estación
    { wch: 12 }, // Tipo
    { wch: 12 }, // Prioridad
    { wch: 12 }, // Estado
    { wch: 40 }, // Descripción
    { wch: 18 }, // Fecha
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToPDF(orders: ExportOrder[], filename = 'ordenes') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(99, 102, 241);
  doc.text('Órdenes de Trabajo', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generado: ${new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}   |   Total: ${orders.length} órdenes`,
    14, 26,
  );

  const statusColor = (estado: string): [number, number, number] => {
    if (estado === 'Completada') return [22, 163, 74];
    if (estado === 'En proceso') return [202, 138, 4];
    return [220, 38, 38];
  };

  const rows = ordersToRows(orders);

  autoTable(doc, {
    startY: 32,
    head: [Object.keys(rows[0] || { Folio: '' })],
    body: rows.map(r => Object.values(r)),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },    // Folio
      5: { fontStyle: 'bold' },    // Estado
      6: { cellWidth: 55 },        // Descripción
    },
    didParseCell(data) {
      if (data.column.index === 5 && data.section === 'body') {
        const [r, g, b] = statusColor(data.cell.raw as string);
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
