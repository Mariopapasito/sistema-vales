import React, { useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, CheckIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api';
import { RootState } from '../store';
import '../styles/Reports.css';

type ToggleValue = 'SI' | 'NO' | '';

type StationFormState = {
  id?: string;
  fecha: string;
  estacion: string;
  folio: string;
  horaLlegada: string;
  horaSalida: string;
  encargado: string;
  observaciones: string;
  isla1: string;
  isla2: string;
  isla3: string;
  isla4: string;
  isla5: string;
  sanitarios: string;
  cuartoMaquinas: string;
  cuartoElectrico: string;
  vestidorPersonal: string;
  almacen: string;
  cuartoSecos: string;
  facturacion: string;
  areasVerdes: string;
  areaTanques: string;
  zonasCarga: string;
  patioAccesos: string;
  oficinas: string;
  senalamiento: string;
  trabajoExtra: string;
  requerimientos: string;
  seguimiento: string;
};

type WeeklyFormState = {
  fecha: string;
  area: string;
  observaciones: string;
  checks: Record<string, ToggleValue>;
};

type RegisteredBitacora = {
  id: string;
  tipo: 'station' | 'weekly';
  nombre: string;
  estacion: string;
  fecha: string;
  folio: string;
  payload: Partial<StationFormState> | WeeklyFormState;
};

const stationChecklistKeys = [
  'isla1',
  'isla2',
  'isla3',
  'isla4',
  'isla5',
  'sanitarios',
  'cuartoMaquinas',
  'cuartoElectrico',
  'vestidorPersonal',
  'almacen',
  'cuartoSecos',
  'facturacion',
  'areasVerdes',
  'areaTanques',
  'zonasCarga',
  'patioAccesos',
  'oficinas',
  'senalamiento',
  'trabajoExtra',
] as const;

const initialStationForm: StationFormState = {
  fecha: '',
  estacion: '',
  folio: '0051',
  horaLlegada: '',
  horaSalida: '',
  encargado: '',
  observaciones: '',
  isla1: '',
  isla2: '',
  isla3: '',
  isla4: '',
  isla5: '',
  sanitarios: '',
  cuartoMaquinas: '',
  cuartoElectrico: '',
  vestidorPersonal: '',
  almacen: '',
  cuartoSecos: '',
  facturacion: '',
  areasVerdes: '',
  areaTanques: '',
  zonasCarga: '',
  patioAccesos: '',
  oficinas: '',
  senalamiento: '',
  trabajoExtra: '',
  requerimientos: '',
  seguimiento: '',
};

const initialWeeklyForm: WeeklyFormState = {
  fecha: '',
  area: 'La Villita',
  observaciones: '',
  checks: {},
};

const weeklyLeftSections = [
  {
    title: 'TANQUES',
    items: [
      'PROBAR SENSORES MOTOBOMBA Y ESPACIO ANULAR',
      'CALZAS PARA RECEPCION DE AUTOTANQUE EN BUEN ESTADO',
      'PINTURA EN TAPAS, NOMBRE DE PRODUCTO Y EMPAQUES',
      'CONTENEDORES, DESCARGA Y PASO HOMBRE SIN BASURA',
      'AGUA EN POZOS DE OBSERVACION Y TANQUES (TIRA VEEDER)',
      'BOTAS, TUBERIAS, GLANDULAS Y SELLOS EN BUEN ESTADO',
      'CODO DE DESCARGA SIN FISURAS Y CON EMPAQUE',
      'MANGUERA DESCARGA COMPLETA, SIN FISURAS Y CON',
      'CABLES CONEXIÓN AUTOTANQUE A TIERRA EN BUEN ESTADO',
      'TAPA DE TUBERIA DESCARGA CON CIERRE HERMETICO Y',
      'TUBERIA TANQUE CON VALVULA DE SOBRELLENADO',
      'SEÑALAMIENTO DE PARO DE EMERGENCIA COMPLETO',
      'BIOMBOS Y SEÑALIZACION EN BUEN ESTADO',
      'PISOS SIN FISURAS MAYORES A 1CM DE ANCHO',
      'TIERRAS FISICAS LIBRES DE SULFATOS',
      'VENTEOS CON PINTURA EN BUEN ESTADO',
      'EXTINTORES AREA TANQUES MIN. 2 DE 9 Kg (RECARGA VIGENTE)',
      'EQUIPO PROTECCION PERSONAL PARA RECEPCION AUTOTANQUE',
    ],
  },
  {
    title: 'DISPENSARIOS',
    items: [
      'PROBAR SENSORES CONTENEDOR DISPENSARIO',
      'MANGUERAS DE DESPACHO SIN CUARTEADURAS Y/O',
      'EXISTE FUGA EN NIPLES, BREAK AWAY, DESTORCEDOR, PISTOLA?',
      'HOLOGRAMAS DE CALIBRACION PROFECO/UV INTACTOS?',
      'FUNDA PISTOLA COMPLETOS, SIN FISURAS Y/O GOLPES?',
      'PRECIO DE VENTA DE LOS PRODUCTOS ES EL CORRECTO?',
      'NARIZ O PICO DE PISTOLA COMPLETO?',
      'SWICH DE PORTA PISTOLA EN OPERACIÓN Y LIMPIO',
      'DISPENSARIO ATERRIZADO',
      'CONTENEDOR DE DISPENSARIO LIMPIO',
      'VALVULAS SHUTOFF SIN FUGAS',
      'BOTAS, TUBERIAS, GLANDULAS Y SELLOS EN BUEN ESTADO',
      'DISPENSARIO LIMPIO',
    ],
  },
  {
    title: 'AREA DE DESPACHO DE PRODUCTOS',
    items: [
      'PINTURA EN ZONA DE CARGA E ISLAS EN BUEN ESTADO',
      'PINTURA EN CONTENCIONES EN BUEN ESTADO',
      'PISO EN ZONA DE DESPACHO LIMPIO',
      'DEPOSITO DE BASURA LIMPIO Y EN BUEN ESTADO',
      'DESPACHADOR DE AGUA Y AIRE EN BUEN ESTADO',
      'EXHIBIDOR DE ACEITES EN BUEN LIMPIO Y EN BUEN ESTADO',
      'PUNTO DE VENTA ATERRIZADO Y LIBRE DE OBJETOS AJENOS',
      'AVISOS TIPOGRAFICOS COMPLETOS Y EN BUEN ESTADO',
      'PARO DE EMERGENCIA CON SEÑALIZACION (PRUEBA)',
      'EXTINTOR DE 9 KG EN BUEN ESTADO Y CON RECARGA VIGENTE',
    ],
  },
];

const weeklyRightSections = [
  {
    title: 'BAÑOS PUBLICOS',
    rows: [
      'TORNIQUETE EN OPERACIÓN',
      'DESPACHADOR DE PAPEL COMPLETO',
      'JABONERA COMPLETA',
      'TAPAS EN SANITARIOS COMPLETAS',
      'DEPOSITOS DE BASURA EN BUEN ESTADO',
      'TUBERIAS EN GENERAL Y HERRAJES',
      'ALUMBRADO EN BUEN ESTADO Y',
      'ESPEJOS EN BUEN ESTADO Y SIN ROTURAS',
      'SANITARIOS LIMPIOS Y EN BUEN ESTADO',
      'SECADOR DE MANOS EN OPERACIÓN',
      'MAMPARAS ENTRE SANITARIOS EN BUEN',
      'LAVAMANOS Y HERRAJES COMPLETOS',
    ],
  },
  {
    title: 'EMPLEADOS',
    rows: [
      'LOCKERS EN BUEN ESTADO',
      'AREA LIMPIA Y ORDENADA',
      'BAÑOS, REGADERAS Y LAVAMANOS LIMPIOS',
      'ALUMBRADO EN BUEN ESTADO',
    ],
  },
  {
    title: 'MEDICION DE EXPLOSIVIDAD',
    rows: [
      'ENTRADA PASO HOMBRE TANQUES',
      'POZOS DE OBSERVACION',
      'TRAMPA DE GRASAS',
      'CONTENEDOR DISPENSARIO',
    ],
  },
  {
    title: 'CUARTO ELECTRICO',
    rows: [
      'SEÑALIZACION DEL CENTRO DE CARGA LEGIBLE',
      'EQUIPO DE LIMPIEZA ORDENADO, LIMPIO Y',
      'TAPONES Y SELLOS EYS COMPLETOS',
    ],
  },
  {
    title: 'UNIFORME PERSONAL Y EQUIPO DE',
    rows: [
      'ROPA DE ALGODÓN (CAMISOLA Y PANTALON)',
      'ZAPATO INDUSTRIAL CON CASQUILLO',
    ],
  },
  {
    title: 'COMPRESOR E HIDRONEUMATICO',
    rows: [
      'REVISION DE ACEITE EN COMPRESOR, FUGAS Y BANDA',
      'PURGADO DE AGUA DEL COMPRESOR',
      'CAMBIO DE ACEITE EN COMPRESOR',
      'EQUIPOS ATERRIZADOS',
    ],
  },
  {
    title: 'CISTERNA, FOSA Y TRAMPA DE GRASAS',
    rows: [
      'NIVEL OPTIMO EN FOSA (FOSA DESASOLVADA)',
      'NIVEL OPTIMO EN TRAMPA DE GRASA',
    ],
  },
  {
    title: 'AREA DE RESIDUOS PELIGROSOS',
    rows: [
      'DRENAJE A TRAMPA DE GRASA LIBRE DE RESIDUOS',
      'PUERTAS CERRADAS',
      'TAMBOS CON BOLSA PARA RESIDUOS',
      'SEÑALIZACION DE TAMBOS Y EXTERIOR',
    ],
  },
];

const formatDateForInput = (date: Date) => date.toISOString().slice(0, 10);

const createStationReportId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeStationKey = (value: string = '') => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const isDemoStationReport = (entry: Partial<StationFormState>) => {
  const stationName = (entry.estacion || '').trim().toLowerCase();
  return stationName === 'oficina central' || stationName === 'oficina';
};

const getStationReportStorageKey = (stationName: string = '') => {
  const keyBase = normalizeStationKey(stationName || 'sin-estacion') || 'sin-estacion';
  return `bitacora-estacion-list-${keyBase}`;
};

const registeredArchiveKey = 'bitacora-registrada-list';

const Bitacoras: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const stationSheetRef = useRef<HTMLDivElement>(null);
  const jefeSheetRef = useRef<HTMLDivElement>(null);
  const isJefe = user?.rol === 'jefe';
  const isEstacion = user?.rol === 'estacion';

  const stationUserName = (user?.estacion || '').trim();

  const [stationForm, setStationForm] = useState<StationFormState>(() => {
    const currentStationName = isEstacion ? stationUserName : '';
    const saved = window.localStorage.getItem(isEstacion ? getStationReportStorageKey(currentStationName) : 'bitacora-estacion');
    const parsed = saved ? JSON.parse(saved) : null;
    const fallback = {
      ...initialStationForm,
      estacion: currentStationName || initialStationForm.estacion,
      fecha: formatDateForInput(new Date()),
      id: createStationReportId(),
    };

    if (!parsed || isDemoStationReport(parsed)) return fallback;

    return {
      ...initialStationForm,
      ...parsed,
      estacion: parsed.estacion || currentStationName || initialStationForm.estacion,
      id: parsed.id || createStationReportId(),
    };
  });
  const [weeklyForm, setWeeklyForm] = useState<WeeklyFormState>(() => {
    const saved = window.localStorage.getItem('bitacora-jefe');
    return saved ? { ...initialWeeklyForm, ...JSON.parse(saved) } : { ...initialWeeklyForm, fecha: formatDateForInput(new Date()) };
  });
  const [savedStationReports, setSavedStationReports] = useState<StationFormState[]>(() => {
    const storageKey = isEstacion ? getStationReportStorageKey(stationUserName) : 'bitacora-estacion-list';
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((item: StationFormState) => !isDemoStationReport(item))
          .map((item: StationFormState, index: number) => ({
            ...item,
            estacion: item.estacion || stationUserName || 'Estación',
            id: item.id || `legacy-${item.estacion || 'estacion'}-${item.fecha || 'sin-fecha'}-${index}`,
          }))
      : [];
  });
  const [registeredBitacoras, setRegisteredBitacoras] = useState<RegisteredBitacora[]>(() => {
    const saved = window.localStorage.getItem(registeredArchiveKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id) : [];
  });
  const [selectedStationReport, setSelectedStationReport] = useState<number>(0);

  const [selectedType, setSelectedType] = useState<'station' | 'weekly' | null>(null);

  const notifyJefeBitacora = async (payload: { tipo: 'station' | 'weekly'; nombre: string; estacion: string; fecha: string; folio: string }) => {
    try {
      await api.post('/notifications/bitacora', payload);
    } catch (error) {
      console.warn('No se pudo enviar la notificación de bitácora al jefe:', error);
    }
  };

  const saveStationReport = () => {
    const allReports = JSON.parse(window.localStorage.getItem('bitacora-estacion-list') || '[]');
    const currentStationName = isEstacion ? (user?.estacion || stationForm.estacion || 'Estación') : stationForm.estacion;
    const currentStationReports = allReports.filter((item: StationFormState) => (item.estacion || '').trim().toLowerCase() === (currentStationName || '').trim().toLowerCase());
    const latestFolio = currentStationReports.reduce((max: number, item: StationFormState) => {
      const parsed = Number(String(item.folio || '').replace(/\D/g, ''));
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);
    const nextFolio = String(latestFolio + 1).padStart(3, '0');

    const draft = {
      ...stationForm,
      estacion: currentStationName,
      folio: nextFolio,
      id: stationForm.id || createStationReportId(),
    };

    const updatedAllList = [draft, ...allReports.filter((item: StationFormState) => item.id !== draft.id)];

    const personalKey = getStationReportStorageKey(draft.estacion);
    const personalReports = JSON.parse(window.localStorage.getItem(personalKey) || '[]');
    const updatedPersonalList = [draft, ...personalReports.filter((item: StationFormState) => item.id !== draft.id)];

    const archiveEntry: RegisteredBitacora = {
      id: draft.id || createStationReportId(),
      tipo: 'station',
      nombre: 'REPORTE DE VISITA A ESTACIONES',
      estacion: draft.estacion || 'Estación',
      fecha: draft.fecha || formatDateForInput(new Date()),
      folio: draft.folio,
      payload: draft,
    };

    const existingArchive = JSON.parse(window.localStorage.getItem(registeredArchiveKey) || '[]');
    const archiveList = [archiveEntry, ...existingArchive.filter((item: RegisteredBitacora) => item.id !== archiveEntry.id)];

    setSavedStationReports(isEstacion ? updatedPersonalList : updatedAllList);
    setRegisteredBitacoras(archiveList);
    setSelectedStationReport(0);

    window.localStorage.setItem('bitacora-estacion-list', JSON.stringify(updatedAllList));
    window.localStorage.setItem(personalKey, JSON.stringify(updatedPersonalList));
    window.localStorage.setItem(isEstacion ? personalKey : 'bitacora-estacion', JSON.stringify(draft));
    window.localStorage.setItem(registeredArchiveKey, JSON.stringify(archiveList));
    toast.success(`Bitácora registrada: ${archiveEntry.estacion} - ${archiveEntry.folio}`);
    void notifyJefeBitacora({
      tipo: 'station',
      nombre: archiveEntry.nombre,
      estacion: archiveEntry.estacion,
      fecha: archiveEntry.fecha,
      folio: archiveEntry.folio,
    });
  };

  const saveWeeklyReport = () => {
    const archive = JSON.parse(window.localStorage.getItem(registeredArchiveKey) || '[]');
    const nextFolio = String((archive.length || 0) + 1).padStart(3, '0');
    const serialized = JSON.stringify(weeklyForm);
    const record: RegisteredBitacora = {
      id: createStationReportId(),
      tipo: 'weekly',
      nombre: 'LISTA DE VERIFICACIÓN SEMANAL',
      estacion: weeklyForm.area || 'La Villita',
      fecha: weeklyForm.fecha || formatDateForInput(new Date()),
      folio: nextFolio,
      payload: weeklyForm,
    };

    const nextArchive = [record, ...archive.filter((item: RegisteredBitacora) => item.id !== record.id)];
    setRegisteredBitacoras(nextArchive);
    window.localStorage.setItem('bitacora-jefe', serialized);
    window.localStorage.setItem(registeredArchiveKey, JSON.stringify(nextArchive));
    toast.success(`Bitácora registrada: ${record.nombre} - ${record.folio}`);
    void notifyJefeBitacora({
      tipo: 'weekly',
      nombre: record.nombre,
      estacion: record.estacion,
      fecha: record.fecha,
      folio: record.folio,
    });
  };

  const updateStationField = (field: keyof StationFormState, value: string) => {
    setStationForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateWeeklyField = (field: keyof WeeklyFormState, value: string) => {
    setWeeklyForm((prev) => ({ ...prev, [field]: value as any }));
  };

  const updateWeeklyToggle = (key: string, value: ToggleValue) => {
    setWeeklyForm((prev) => ({
      ...prev,
      checks: {
        ...prev.checks,
        [key]: value,
      },
    }));
  };

  const exportPdf = async (mode: 'station' | 'jefe') => {
    const node = mode === 'station' ? stationSheetRef.current : jefeSheetRef.current;
    if (!node) return;

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const imgProps = pdf.getImageProperties(imgData);
    const ratio = Math.min((pageWidth - margin * 2) / imgProps.width, (pageHeight - margin * 2) / imgProps.height);
    const width = imgProps.width * ratio;
    const height = imgProps.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST');
    pdf.save(mode === 'station' ? 'bitacora-estacion.pdf' : 'bitacora-jefe.pdf');
  };

  const stationEntries = useMemo(() => savedStationReports, [savedStationReports]);
  const archiveEntries = useMemo(() => {
    if (!registeredBitacoras.length) return [];
    if (isJefe || user?.rol === 'sistemas') return registeredBitacoras;
    const currentStation = (user?.estacion || '').trim().toLowerCase();
    return registeredBitacoras.filter((entry) => !currentStation || (entry.estacion || '').trim().toLowerCase() === currentStation);
  }, [isJefe, registeredBitacoras, user?.estacion, user?.rol]);
  const canViewWeekly = ['jefe', 'estacion', 'sistemas'].includes(user?.rol || '');
  const canViewStation = ['jefe', 'estacion', 'sistemas'].includes(user?.rol || '');
  const availableBitacoras = canViewWeekly ? ['station', 'weekly'] : canViewStation ? ['station'] : [];
  const residuosPeligrososSection = weeklyRightSections.find((section) => section.title === 'AREA DE RESIDUOS PELIGROSOS');
  const remainingRightSections = weeklyRightSections.filter((section) => section.title !== 'AREA DE RESIDUOS PELIGROSOS');

  const openRegisteredBitacora = (entry: RegisteredBitacora) => {
    if (entry.tipo === 'station') {
      const payload = entry.payload as Partial<StationFormState>;
      setStationForm({ ...initialStationForm, ...payload, id: payload.id || createStationReportId() });
      setSelectedType('station');
      return;
    }

    const payload = entry.payload as WeeklyFormState;
    setWeeklyForm({ ...initialWeeklyForm, ...payload, checks: payload.checks || {} });
    setSelectedType('weekly');
  };

  const downloadRegisteredBitacora = async (entry: RegisteredBitacora) => {
    if (entry.tipo === 'station') {
      const payload = entry.payload as Partial<StationFormState>;
      setStationForm({ ...initialStationForm, ...payload, id: payload.id || createStationReportId() });
      setTimeout(() => exportPdf('station'), 0);
      return;
    }

    const payload = entry.payload as WeeklyFormState;
    setWeeklyForm({ ...initialWeeklyForm, ...payload, checks: payload.checks || {} });
    setTimeout(() => exportPdf('jefe'), 0);
  };

  if (!isJefe && !isEstacion && user?.rol !== 'sistemas') {
    return <div className="dashboard-container"><p>No tienes permisos para acceder a las bitácoras.</p></div>;
  }

  if (selectedType === 'station') {
    return (
      <div className="dashboard-container bitacora-page">
        <div className="page-header bitacora-header">
          <div>
            <h1>Bitácoras</h1>
            <p>Reporte de visita a estaciones</p>
          </div>
        </div>

        <div className="bitacora-panel">
          <div className="bitacora-actions">
            <button type="button" className="btn-save-bitacora secondary" onClick={() => setSelectedType(null)}>Regresar</button>
            <button type="button" className="btn-save-bitacora" onClick={saveStationReport}>Guardar</button>
            <button type="button" className="btn-save-bitacora secondary" onClick={() => exportPdf('station')}>
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Descargar PDF
            </button>
          </div>

          <div ref={stationSheetRef} className="bitacora-sheet bitacora-estacion-sheet">
            <div className="station-header-row">
              <div className="station-logo-box">
                <img src="/logo-sidebar.png" alt="La Villita" className="station-logo-image" />
              </div>
              <div className="station-header-text">
                <div className="bitacora-phone">Tel. 492 950 5776</div>
                <div className="bitacora-phone">Tel. 492 870 7663</div>
                <div className="bitacora-phone">Tel. 492 970 6090</div>
              </div>
            </div>

            <div className="bitacora-title-wrap">
              <h2>MULTISERVICIOS LA VILLITA, S.A. de C.V.</h2>
              <p>GERENCIA DE OPERACION DE ESTACIONES DE SERVICIO</p>
              <p>REPORTE DE VISITA A ESTACIONES</p>
            </div>

            <div className="bitacora-meta-row">
              <div className="field-inline field-inline-wide">
                <span>ESTACION</span>
                <input value={stationForm.estacion} onChange={(e) => updateStationField('estacion', e.target.value)} />
              </div>
              <div className="field-inline field-inline-folio">
                <span>FOLIO</span>
                <input value={stationForm.folio} onChange={(e) => updateStationField('folio', e.target.value)} />
              </div>
            </div>

            <div className="bitacora-meta-row compact">
              <div className="field-inline">
                <span>FECHA</span>
                <input type="date" value={stationForm.fecha} onChange={(e) => updateStationField('fecha', e.target.value)} />
              </div>
              <div className="field-inline">
                <span>HORA LLEGADA</span>
                <input value={stationForm.horaLlegada} onChange={(e) => updateStationField('horaLlegada', e.target.value)} />
              </div>
              <div className="field-inline">
                <span>HORA SALIDA</span>
                <input value={stationForm.horaSalida} onChange={(e) => updateStationField('horaSalida', e.target.value)} />
              </div>
              <div className="field-inline">
                <span>ENCARGADO</span>
                <input value={stationForm.encargado} onChange={(e) => updateStationField('encargado', e.target.value)} />
              </div>
            </div>

            <table className="bitacora-table">
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>RECORDIDO DE INSTALACIONES:</th>
                  <th style={{ width: '45%' }}>OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {stationChecklistKeys.map((key) => (
                  <tr key={key}>
                    <td className="area-name">
                      {key === 'isla1' && 'ISLA 1'}
                      {key === 'isla2' && 'ISLA 2'}
                      {key === 'isla3' && 'ISLA 3'}
                      {key === 'isla4' && 'ISLA 4'}
                      {key === 'isla5' && 'ISLA 5'}
                      {key === 'sanitarios' && 'SANITARIOS'}
                      {key === 'cuartoMaquinas' && 'CUARTO DE MAQUINAS'}
                      {key === 'cuartoElectrico' && 'CUARTO ELECTRICO'}
                      {key === 'vestidorPersonal' && 'VESTIDOR DE PERSONAL'}
                      {key === 'almacen' && 'ALMACEN DE ASEITES Y REFACCIONES'}
                      {key === 'cuartoSecos' && 'CUARTO DE SECOS'}
                      {key === 'facturacion' && 'FACTURACION'}
                      {key === 'areasVerdes' && 'AREAS VERDES'}
                      {key === 'areaTanques' && 'AREA DE TANQUES'}
                      {key === 'zonasCarga' && 'ZONAS DE CARGA'}
                      {key === 'patioAccesos' && 'PATIO ACCESOS'}
                      {key === 'oficinas' && 'OFICINAS, MUROS Y PACHADAS'}
                      {key === 'senalamiento' && 'SEÑALAMIENTO'}
                      {key === 'trabajoExtra' && 'TRABAJO EXTRA'}
                    </td>
                    <td><input value={(stationForm as any)[key]} onChange={(e) => updateStationField(key, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bitacora-section-title">REQUERIMIENTOS DEL GERENTE DE ESTACION</div>
            <div className="bitacora-textarea-wrap">
              <textarea value={stationForm.requerimientos} onChange={(e) => updateStationField('requerimientos', e.target.value)} />
            </div>

            <div className="bitacora-section-title">SEGUIMIENTO DE ASUNTOS PENDIENTES DE VISITAS ANTERIORES</div>
            <div className="bitacora-textarea-wrap big">
              <textarea value={stationForm.seguimiento} onChange={(e) => updateStationField('seguimiento', e.target.value)} />
            </div>

            <div className="bitacora-final-row">
              <div className="field-inline field-inline-large">
                <span>OBSERVACIONES</span>
                <textarea value={stationForm.observaciones} onChange={(e) => updateStationField('observaciones', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedType === 'weekly') {
    return (
      <div className="dashboard-container bitacora-page">
        <div className="page-header bitacora-header">
          <div>
            <h1>Bitácoras</h1>
            <p>Lista de verificación semanal</p>
          </div>
        </div>

        <div className="bitacora-panel">
          <div className="bitacora-actions">
            <button type="button" className="btn-save-bitacora secondary" onClick={() => setSelectedType(null)}>Regresar</button>
            <button type="button" className="btn-save-bitacora" onClick={saveWeeklyReport}>Guardar</button>
            <button type="button" className="btn-save-bitacora secondary" onClick={() => exportPdf('jefe')}>
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Descargar PDF
            </button>
          </div>

          <div ref={jefeSheetRef} className="bitacora-sheet bitacora-jefe-sheet">
            <div className="weekly-sheet-header">
              <div className="weekly-logo-box">
                <img src="/logo-sidebar.png" alt="La Villita" className="weekly-logo-image" />
              </div>
              <div className="weekly-sheet-title">LISTA DE VERIFICACION SEMANAL</div>
              <div className="weekly-date-field">
                <span>FECHA:</span>
                <input type="date" value={weeklyForm.fecha} onChange={(e) => updateWeeklyField('fecha', e.target.value)} />
              </div>
            </div>

            <div className="weekly-main-grid">
              <div className="weekly-column">
                {residuosPeligrososSection && (
                  <div key={residuosPeligrososSection.title} className="weekly-section-wrap residuos-peligrosos-left">
                    <div className="weekly-section-header">{residuosPeligrososSection.title}</div>
                    <table className="weekly-table">
                      <thead>
                        <tr>
                          <th className="weekly-item-header">AREA</th>
                          <th className="weekly-check-header">SI</th>
                          <th className="weekly-check-header">NO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {residuosPeligrososSection.rows.map((item) => (
                          <tr key={`${residuosPeligrososSection.title}-${item}`}>
                            <td className="weekly-item-cell">{item}</td>
                            <td className="weekly-check-cell">
                              <div className="weekly-check-wrap">
                                <button type="button" className={`weekly-check ${weeklyForm.checks[item] === 'SI' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'SI')}>
                                  {weeklyForm.checks[item] === 'SI' ? 'X' : ''}
                                </button>
                              </div>
                            </td>
                            <td className="weekly-check-cell">
                              <div className="weekly-check-wrap">
                                <button type="button" className={`weekly-check no ${weeklyForm.checks[item] === 'NO' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'NO')}>
                                  {weeklyForm.checks[item] === 'NO' ? 'X' : ''}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {weeklyLeftSections.map((section) => (
                  <div key={section.title} className="weekly-section-wrap">
                    <div className="weekly-section-header">{section.title}</div>
                    <table className="weekly-table">
                      <thead>
                        <tr>
                          <th className="weekly-item-header">AREA</th>
                          <th className="weekly-check-header">SI</th>
                          <th className="weekly-check-header">NO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item) => (
                          <tr key={`${section.title}-${item}`}>
                            <td className="weekly-item-cell">{item}</td>
                            <td className="weekly-check-cell">
                              <div className="weekly-check-wrap">
                                <button type="button" className={`weekly-check ${weeklyForm.checks[item] === 'SI' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'SI')}>
                                  {weeklyForm.checks[item] === 'SI' ? 'X' : ''}
                                </button>
                              </div>
                            </td>
                            <td className="weekly-check-cell">
                              <div className="weekly-check-wrap">
                                <button type="button" className={`weekly-check no ${weeklyForm.checks[item] === 'NO' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'NO')}>
                                  {weeklyForm.checks[item] === 'NO' ? 'X' : ''}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              <div className="weekly-column">
                {remainingRightSections.map((section) => (
                  <div key={section.title} className="weekly-section-wrap">
                    <div className="weekly-section-header">{section.title}</div>
                    {section.title === 'BAÑOS PUBLICOS' ? (
                      <table className="weekly-table">
                        <thead>
                          <tr>
                            <th className="weekly-item-header">AREA</th>
                            <th className="weekly-check-header">CUMPLE(M)</th>
                            <th className="weekly-check-header">CUMPLE(H)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((item) => (
                            <tr key={`${section.title}-${item}`}>
                              <td className="weekly-item-cell">{item}</td>
                              <td className="weekly-check-group">
                                <div className="weekly-check-pair">
                                  <button type="button" className={`weekly-check ${weeklyForm.checks[`${item}-M-SI`] === 'SI' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(`${item}-M-SI`, 'SI')}>{weeklyForm.checks[`${item}-M-SI`] === 'SI' ? 'X' : ''}</button>
                                  <span>SI</span>
                                </div>
                                <div className="weekly-check-pair">
                                  <button type="button" className={`weekly-check no ${weeklyForm.checks[`${item}-M-NO`] === 'NO' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(`${item}-M-NO`, 'NO')}>{weeklyForm.checks[`${item}-M-NO`] === 'NO' ? 'X' : ''}</button>
                                  <span>NO</span>
                                </div>
                              </td>
                              <td className="weekly-check-group">
                                <div className="weekly-check-pair">
                                  <button type="button" className={`weekly-check ${weeklyForm.checks[`${item}-H-SI`] === 'SI' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(`${item}-H-SI`, 'SI')}>{weeklyForm.checks[`${item}-H-SI`] === 'SI' ? 'X' : ''}</button>
                                  <span>SI</span>
                                </div>
                                <div className="weekly-check-pair">
                                  <button type="button" className={`weekly-check no ${weeklyForm.checks[`${item}-H-NO`] === 'NO' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(`${item}-H-NO`, 'NO')}>{weeklyForm.checks[`${item}-H-NO`] === 'NO' ? 'X' : ''}</button>
                                  <span>NO</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="weekly-table">
                        <thead>
                          <tr>
                            <th className="weekly-item-header">AREA</th>
                            <th className="weekly-check-header">SI</th>
                            <th className="weekly-check-header">NO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((item) => (
                            <tr key={`${section.title}-${item}`}>
                              <td className="weekly-item-cell">{item}</td>
                              <td className="weekly-check-cell">
                                <div className="weekly-check-wrap">
                                  <button type="button" className={`weekly-check ${weeklyForm.checks[item] === 'SI' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'SI')}>
                                    {weeklyForm.checks[item] === 'SI' ? 'X' : ''}
                                  </button>
                                  <span>SI</span>
                                </div>
                              </td>
                              <td className="weekly-check-cell">
                                <div className="weekly-check-wrap">
                                  <button type="button" className={`weekly-check no ${weeklyForm.checks[item] === 'NO' ? 'active' : ''}`} onClick={() => updateWeeklyToggle(item, 'NO')}>
                                    {weeklyForm.checks[item] === 'NO' ? 'X' : ''}
                                  </button>
                                  <span>NO</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="weekly-observations-block">
              <div className="weekly-observations-label">OBSERVACIONES:</div>
              <textarea value={weeklyForm.observaciones} onChange={(e) => updateWeeklyField('observaciones', e.target.value)} />
              <div className="weekly-observation-lines"><span /><span /><span /><span /><span /></div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container bitacora-page">
      <div className="page-header bitacora-header">
        <div>
          <h1>Bitácoras</h1>
          <p>{isEstacion ? 'Selecciona la bitácora que deseas completar.' : 'Selecciona la bitácora a revisar o editar.'}</p>
        </div>
      </div>

      <div className="bitacora-card-grid">
        {availableBitacoras.includes('station') && (
          <button type="button" className="bitacora-card" onClick={() => setSelectedType('station')}>
            <span className="bitacora-card-badge">bitácora 01</span>
            <h3>REPORTE DE VISITA A ESTACIONES</h3>
            <p>Formato completo para registrar inspección, requerimientos y observaciones de la estación.</p>
          </button>
        )}

        {availableBitacoras.includes('weekly') && (
          <button type="button" className="bitacora-card" onClick={() => setSelectedType('weekly')}>
            <span className="bitacora-card-badge">bitácora 02</span>
            <h3>LISTA DE VERIFICACIÓN SEMANAL</h3>
            <p>Control semanal por áreas con revisión rápida de cumplimiento y observaciones.</p>
          </button>
        )}
      </div>

      <div className="bitacora-registered-section">
        <h3>Bitácoras registradas</h3>
        {archiveEntries.length > 0 ? (
          <div className="bitacora-registered-grid">
            {archiveEntries.map((entry) => (
              <div key={entry.id} className="bitacora-registered-card">
                <div className="bitacora-registered-name">{entry.nombre}</div>
                <div className="bitacora-registered-meta"><strong>Estación:</strong> {entry.estacion || 'N/A'}</div>
                <div className="bitacora-registered-meta"><strong>Fecha:</strong> {entry.fecha || 'Sin fecha'}</div>
                <div className="bitacora-registered-meta"><strong>Folio:</strong> {entry.folio || 'Sin folio'}</div>
                <div className="bitacora-registered-actions">
                  <button type="button" className="bitacora-registered-action" onClick={() => openRegisteredBitacora(entry)}>
                    Ver
                  </button>
                  <button type="button" className="bitacora-registered-action secondary" onClick={() => downloadRegisteredBitacora(entry)}>
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="bitacora-registered-empty">Aún no hay bitácoras registradas.</p>
        )}
      </div>
    </div>
  );
};

export default Bitacoras;
