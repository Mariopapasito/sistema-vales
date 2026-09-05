import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, CheckIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../services/api';
import { RootState } from '../store';
import BrandLoader from '../components/BrandLoader';
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
  requerimientosUrgentes: string;
  requerimientosGenerales: string;
  requerimientosMaterial: string;
  indicacionesCorporativo: string;
  coordinacionInterdepartamental: string;
  enviosPendientes: string;
  dirigidoA1: string;
  concepto1: string;
  dirigidoA2: string;
  concepto2: string;
  dirigidoA3: string;
  concepto3: string;
  atencionClientes: string;
  cortesia: string;
  imagen: string;
  motivacionVenta: string;
  instruccionesAtencion: string;
  instruccionesCortesia: string;
  instruccionesImagen: string;
  instruccionesMotivacion: string;
  laboresMantenimiento: string;
  realizoVisita: string;
  recibioVisita: string;
  senalamientoFachadas: string;
  senalamientoHorizontal: string;
  senalamientoVertical: string;
  guarnicionesBanquetas: string;
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
  createdAt?: string;
};

const stationChecklistRows: Array<{ key: keyof StationFormState; label: string }> = [
  { key: 'isla1', label: 'ISLA 1' },
  { key: 'isla2', label: 'ISLA 2' },
  { key: 'isla3', label: 'ISLA 3' },
  { key: 'isla4', label: 'ISLA 4' },
  { key: 'isla5', label: 'ISLA 5' },
  { key: 'sanitarios', label: 'SANITARIOS' },
  { key: 'cuartoMaquinas', label: 'CUARTO DE MÁQUINAS' },
  { key: 'cuartoElectrico', label: 'CUARTO ELÉCTRICO' },
  { key: 'vestidorPersonal', label: 'VESTIDOR DE PERSONAL' },
  { key: 'almacen', label: 'ALMACÉN DE ACEITES Y REFACCIONES' },
  { key: 'cuartoSecos', label: 'CUARTO DE SUCIOS' },
  { key: 'facturacion', label: 'FACTURACIÓN' },
  { key: 'areasVerdes', label: 'ÁREAS VERDES' },
  { key: 'areaTanques', label: 'ÁREA DE TANQUES' },
  { key: 'zonasCarga', label: 'ZONAS DE CARGA' },
  { key: 'patioAccesos', label: 'PATIO ACCESOS' },
  { key: 'oficinas', label: 'OFICINAS, MUROS Y FACHADAS' },
  { key: 'senalamientoFachadas', label: 'SEÑALAMIENTO Y FACHADAS' },
  { key: 'senalamientoHorizontal', label: 'SEÑALAMIENTO HORIZONTAL' },
  { key: 'senalamientoVertical', label: 'SEÑALAMIENTO VERTICAL' },
  { key: 'guarnicionesBanquetas', label: 'GUARNICIONES Y BANQUETAS' },
];

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
  requerimientosUrgentes: '',
  requerimientosGenerales: '',
  requerimientosMaterial: '',
  indicacionesCorporativo: '',
  coordinacionInterdepartamental: '',
  enviosPendientes: '',
  dirigidoA1: '', concepto1: '',
  dirigidoA2: '', concepto2: '',
  dirigidoA3: '', concepto3: '',
  atencionClientes: '', cortesia: '', imagen: '', motivacionVenta: '',
  instruccionesAtencion: '', instruccionesCortesia: '', instruccionesImagen: '', instruccionesMotivacion: '',
  laboresMantenimiento: '', realizoVisita: '', recibioVisita: '',
  senalamientoFachadas: '', senalamientoHorizontal: '', senalamientoVertical: '', guarnicionesBanquetas: '',
};

const initialWeeklyForm: WeeklyFormState = {
  fecha: '',
  area: 'La Villita',
  observaciones: '',
  checks: {},
};

const normalizeStationPayload = (payload: Partial<StationFormState>): StationFormState => ({
  ...initialStationForm,
  ...payload,
  senalamientoFachadas: payload.senalamientoFachadas || payload.senalamiento || '',
  requerimientosGenerales: payload.requerimientosGenerales || payload.requerimientos || '',
  indicacionesCorporativo: payload.indicacionesCorporativo || payload.seguimiento || '',
  atencionClientes: payload.atencionClientes || payload.observaciones || '',
  id: payload.id || createStationReportId(),
});

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
      'MANGUERA DESCARGA COMPLETA, SIN FISURAS Y CON EMPAQUE',
      'CABLES CONEXIÓN AUTOTANQUE A TIERRA EN BUEN ESTADO',
      'TAPA DE TUBERIA DESCARGA CON CIERRE HERMETICO Y EMPAQUE',
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
      'MANGUERAS DE DESPACHO SIN CUARTEADURAS Y/O FISURAS',
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
      'ALUMBRADO EN BUEN ESTADO Y FUNCIONANDO',
      'ESPEJOS EN BUEN ESTADO Y SIN ROTURAS',
      'SANITARIOS LIMPIOS Y EN BUEN ESTADO',
      'SECADOR DE MANOS EN OPERACIÓN',
      'MAMPARAS ENTRE SANITARIOS EN BUEN ESTADO',
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
      'EQUIPO DE LIMPIEZA ORDENADO, LIMPIO Y COMPLETO',
      'TAPONES Y SELLOS EYS COMPLETOS',
    ],
  },
  {
    title: 'UNIFORME PERSONAL Y EQUIPO DE PROTECCIÓN',
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

const normalizeWeeklyPayload = (payload: WeeklyFormState): WeeklyFormState => {
  const checks = { ...(payload.checks || {}) };

  weeklyLeftSections.forEach((section) => section.items.forEach((item) => {
    const newKey = `${section.title}-${item}`;
    if (!checks[newKey] && checks[item]) checks[newKey] = checks[item];
  }));

  weeklyRightSections.forEach((section) => section.rows.forEach((item) => {
    if (section.title === 'BAÑOS PUBLICOS') {
      (['M', 'H'] as const).forEach((group) => {
        const newKey = `${section.title}-${item}-${group}`;
        if (!checks[newKey]) {
          if (checks[`${item}-${group}-SI`] === 'SI') checks[newKey] = 'SI';
          else if (checks[`${item}-${group}-NO`] === 'NO') checks[newKey] = 'NO';
        }
      });
    } else {
      const newKey = `${section.title}-${item}`;
      if (!checks[newKey] && checks[item]) checks[newKey] = checks[item];
    }
  }));

  return { ...initialWeeklyForm, ...payload, checks };
};

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

const readStoredJson = <T,>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const Bitacoras: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const stationSheetRef = useRef<HTMLDivElement>(null);
  const jefeSheetRef = useRef<HTMLDivElement>(null);
  const isJefe = user?.rol === 'jefe';
  const isEstacion = user?.rol === 'estacion';

  const stationUserName = (user?.estacion || '').trim();

  const [stationForm, setStationForm] = useState<StationFormState>(() => {
    const currentStationName = isEstacion ? stationUserName : '';
    const parsed = readStoredJson<Partial<StationFormState>>(isEstacion ? getStationReportStorageKey(currentStationName) : 'bitacora-estacion');
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
    const saved = readStoredJson<Partial<WeeklyFormState>>('bitacora-jefe');
    return saved ? { ...initialWeeklyForm, ...saved } : { ...initialWeeklyForm, fecha: formatDateForInput(new Date()) };
  });
  const [registeredBitacoras, setRegisteredBitacoras] = useState<RegisteredBitacora[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBitacoraId, setEditingBitacoraId] = useState<string | null>(null);
  const [stationFilter, setStationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [stationOptions, setStationOptions] = useState<string[]>([]);

  const [selectedType, setSelectedType] = useState<'station' | 'weekly' | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const key = isEstacion ? getStationReportStorageKey(stationUserName) : 'bitacora-estacion';
        window.localStorage.setItem(key, JSON.stringify(stationForm));
      } catch {
        // El guardado definitivo en servidor sigue disponible aunque falle el almacenamiento local.
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isEstacion, stationForm, stationUserName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem('bitacora-jefe', JSON.stringify(weeklyForm));
      } catch {
        // El guardado definitivo en servidor sigue disponible aunque falle el almacenamiento local.
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [weeklyForm]);

  const loadBitacoras = async () => {
    try {
      setArchiveLoading(true);
      const params = new URLSearchParams();
      if (isJefe && stationFilter) params.set('estacion', stationFilter);
      if (isJefe && dateFilter) {
        params.set('fechaDesde', dateFilter);
        params.set('fechaHasta', dateFilter);
      }
      const response = await api.get(`/bitacoras?${params.toString()}`);
      const entries: RegisteredBitacora[] = response.data.map((item: any) => ({
        id: String(item.id),
        tipo: item.tipo,
        nombre: item.nombre,
        estacion: item.estacion,
        fecha: item.fecha,
        folio: item.folio,
        payload: item.payload || {},
        createdAt: item.createdAt,
      }));
      setRegisteredBitacoras(entries);
      setStationOptions((current) => Array.from(new Set([
        ...current,
        ...entries.map((entry) => entry.estacion).filter(Boolean),
      ])).sort((a, b) => a.localeCompare(b, 'es')));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudieron cargar las bitácoras');
    } finally {
      setArchiveLoading(false);
    }
  };

  const migrateLocalBitacoras = async () => {
    if (!user?.id) return;
    const migrationKey = `bitacoras-server-migration-v3-${user.id}`;
    if (window.localStorage.getItem(migrationKey) === 'done') return;

    try {
      const raw = window.localStorage.getItem(registeredArchiveKey);
      const parsed: RegisteredBitacora[] = raw ? JSON.parse(raw) : [];
      const candidates: RegisteredBitacora[] = Array.isArray(parsed) ? [...parsed] : [];

      // Versiones anteriores también escribían copias fuera del archivo registrado.
      const globalStationRaw = window.localStorage.getItem('bitacora-estacion-list');
      const globalStationReports = globalStationRaw ? JSON.parse(globalStationRaw) : [];
      if (Array.isArray(globalStationReports)) {
        globalStationReports.forEach((payload: StationFormState, index: number) => candidates.push({
          id: payload.id || `station-global-${payload.estacion}-${payload.fecha}-${payload.folio}-${index}`,
          tipo: 'station',
          nombre: 'REPORTE DE VISITA A ESTACIONES',
          estacion: payload.estacion,
          fecha: payload.fecha,
          folio: payload.folio,
          payload,
        }));
      }

      if (isEstacion) {
        const personalRaw = window.localStorage.getItem(getStationReportStorageKey(stationUserName));
        const personalParsed = personalRaw ? JSON.parse(personalRaw) : null;
        const personalReports = Array.isArray(personalParsed) ? personalParsed : personalParsed ? [personalParsed] : [];
        personalReports.forEach((payload: StationFormState, index: number) => candidates.push({
          id: payload.id || `station-personal-${stationUserName}-${payload.fecha}-${payload.folio}-${index}`,
          tipo: 'station',
          nombre: 'REPORTE DE VISITA A ESTACIONES',
          estacion: payload.estacion || stationUserName,
          fecha: payload.fecha,
          folio: payload.folio,
          payload,
        }));
      }

      if (isJefe) {
        const weeklyRaw = window.localStorage.getItem('bitacora-jefe');
        const weeklyPayload: WeeklyFormState | null = weeklyRaw ? JSON.parse(weeklyRaw) : null;
        if (weeklyPayload?.fecha) candidates.push({
          id: `weekly-jefe-${weeklyPayload.fecha}`,
          tipo: 'weekly',
          nombre: 'LISTA DE VERIFICACIÓN SEMANAL',
          estacion: weeklyPayload.area || 'La Villita',
          fecha: weeklyPayload.fecha,
          folio: '',
          payload: weeklyPayload,
        });
      }

      const uniqueCandidates = Array.from(new Map(candidates.map((entry) => [entry.id, entry])).values());
      const legacyEntries = uniqueCandidates.filter((entry) => {
            if (!entry?.id || !['station', 'weekly'].includes(entry.tipo)) return false;
            if (isEstacion) {
              return entry.tipo === 'weekly' ||
                (entry.estacion || '').trim().toLowerCase() === stationUserName.toLowerCase();
            }
            return isJefe;
          });

      for (const entry of legacyEntries) {
        await api.post('/bitacoras', {
          tipo: entry.tipo,
          estacion: entry.estacion,
          fecha: entry.fecha || formatDateForInput(new Date()),
          payload: entry.payload,
          legacyId: entry.id,
        });
      }
      window.localStorage.setItem(migrationKey, 'done');
    } catch (error) {
      console.warn('La migración de bitácoras locales se reintentará después:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      void (async () => {
        await migrateLocalBitacoras();
        await loadBitacoras();
      })();
    }
  }, [isJefe, stationFilter, dateFilter, user?.id]);

  const saveStationReport = async () => {
    const currentStationName = isEstacion ? (user?.estacion || stationForm.estacion || 'Estación') : stationForm.estacion;
    if (!currentStationName.trim()) {
      toast.error('Selecciona o escribe el nombre de la estación');
      return;
    }
    if (!stationForm.fecha) {
      toast.error('Selecciona la fecha de la bitácora');
      return;
    }

    const draft: StationFormState = {
      ...stationForm,
      estacion: currentStationName,
      id: stationForm.id || createStationReportId(),
    };

    try {
      setSaving(true);
      const data = { tipo: 'station', estacion: currentStationName, fecha: draft.fecha, payload: draft };
      const response = editingBitacoraId
        ? await api.patch(`/bitacoras/${editingBitacoraId}`, data)
        : await api.post('/bitacoras', data);
      const savedPayload = response.data.payload || draft;
      setStationForm({ ...normalizeStationPayload(savedPayload), id: String(response.data.id) });
      setEditingBitacoraId(String(response.data.id));
      toast.success(`Bitácora guardada: ${response.data.estacion} - ${response.data.folio}`);
      await loadBitacoras();
      setSelectedType(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la bitácora');
    } finally {
      setSaving(false);
    }
  };

  const saveWeeklyReport = async () => {
    if (!weeklyForm.fecha) {
      toast.error('Selecciona la fecha de la bitácora');
      return;
    }
    try {
      setSaving(true);
      const data = { tipo: 'weekly', estacion: weeklyForm.area || 'La Villita', fecha: weeklyForm.fecha, payload: weeklyForm };
      const response = editingBitacoraId
        ? await api.patch(`/bitacoras/${editingBitacoraId}`, data)
        : await api.post('/bitacoras', data);
      setWeeklyForm(normalizeWeeklyPayload(response.data.payload || weeklyForm));
      setEditingBitacoraId(String(response.data.id));
      toast.success(`Bitácora guardada: ${response.data.nombre} - ${response.data.folio}`);
      await loadBitacoras();
      setSelectedType(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la bitácora');
    } finally {
      setSaving(false);
    }
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

    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await document.fonts.ready;

    const printStage = document.createElement('div');
    printStage.className = 'bitacora-print-stage';
    const printNode = node.cloneNode(true) as HTMLElement;
    printNode.classList.add('bitacora-print-sheet');

    const sourceFields = Array.from(node.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));
    const clonedFields = Array.from(printNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));

    clonedFields.forEach((field, index) => {
      const sourceField = sourceFields[index];
      const value = sourceField?.value || '';
      const printableValue = document.createElement('div');
      printableValue.className = `bitacora-print-value bitacora-print-value--${field.tagName.toLowerCase()}`;
      printableValue.textContent = sourceField instanceof HTMLInputElement && sourceField.type === 'date' && value
        ? value.split('-').reverse().join('/')
        : value;
      field.replaceWith(printableValue);
    });

    printStage.appendChild(printNode);
    document.body.appendChild(printStage);

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await Promise.all(Array.from(printNode.querySelectorAll('img')).map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          });
        }
        if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
      }));

      const nodeWidth = printNode.scrollWidth;
      const nodeHeight = printNode.scrollHeight;
      const maxCanvasArea = 16_000_000;
      const captureScale = Math.max(1.5, Math.min(2.5, Math.sqrt(maxCanvasArea / (nodeWidth * nodeHeight))));
      const canvas = await html2canvas(printNode, {
        scale: captureScale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        width: nodeWidth,
        height: nodeHeight,
        windowWidth: 900,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 3;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      // El clon tiene todos los valores convertidos a texto visible. Así se usa
      // toda la hoja sin que html2canvas corte el contenido de inputs o textareas.
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        printableWidth,
        printableHeight,
        undefined,
        'SLOW'
      );

      pdf.save(mode === 'station' ? 'bitacora-estacion.pdf' : 'bitacora-jefe.pdf');
    } catch (error) {
      console.error('Error exporting bitacora PDF:', error);
      toast.error('No se pudo generar el PDF. Intenta nuevamente.');
    } finally {
      printStage.remove();
    }
  };

  const archiveEntries = useMemo(() => registeredBitacoras, [registeredBitacoras]);
  const canViewWeekly = isJefe || isEstacion;
  const canViewStation = isJefe || isEstacion;
  const availableBitacoras = canViewWeekly ? ['station', 'weekly'] : canViewStation ? ['station'] : [];

  const renderWeeklySection = (section: { title: string; items?: string[]; rows?: string[] }, splitByGender = false, showColumnLabels = false) => {
    const items = section.items || section.rows || [];
    return (
      <table key={section.title} className={`weekly-table weekly-format-table ${splitByGender ? 'weekly-gender-table' : ''}`}>
        <thead>
          {showColumnLabels && (
            <tr className="weekly-column-labels">
              <th>ÁREA</th>
              {splitByGender ? <><th colSpan={2}>CUMPLE (M)</th><th colSpan={2}>CUMPLE (H)</th></> : <th colSpan={2}>CUMPLE</th>}
            </tr>
          )}
          <tr className="weekly-yellow-heading">
            <th>{section.title}</th>
            {splitByGender ? <><th>SÍ</th><th>NO</th><th>SÍ</th><th>NO</th></> : <><th>SÍ</th><th>NO</th></>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${section.title}-${item}`}>
              <td className="weekly-item-cell">{item}</td>
              {splitByGender ? (
                <>
                  {(['M', 'H'] as const).flatMap((group) => (['SI', 'NO'] as const).map((value) => {
                    const key = `${section.title}-${item}-${group}`;
                    return (
                      <td key={`${key}-${value}`} className="weekly-check-cell">
                        <button
                          type="button"
                          aria-label={`${item} ${group} ${value}`}
                          className={`weekly-paper-check ${weeklyForm.checks[key] === value ? 'active' : ''}`}
                          onClick={() => updateWeeklyToggle(key, weeklyForm.checks[key] === value ? '' : value)}
                        >
                          {weeklyForm.checks[key] === value ? 'X' : ''}
                        </button>
                      </td>
                    );
                  }))}
                </>
              ) : (
                (['SI', 'NO'] as const).map((value) => {
                  const key = `${section.title}-${item}`;
                  return (
                    <td key={`${key}-${value}`} className="weekly-check-cell">
                      <button
                        type="button"
                        aria-label={`${item} ${value}`}
                        className={`weekly-paper-check ${weeklyForm.checks[key] === value ? 'active' : ''}`}
                        onClick={() => updateWeeklyToggle(key, weeklyForm.checks[key] === value ? '' : value)}
                      >
                        {weeklyForm.checks[key] === value ? 'X' : ''}
                      </button>
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const openRegisteredBitacora = (entry: RegisteredBitacora) => {
    setEditingBitacoraId(entry.id);
    if (entry.tipo === 'station') {
      const payload = entry.payload as Partial<StationFormState>;
      setStationForm(normalizeStationPayload(payload));
      setSelectedType('station');
      return;
    }

    const payload = entry.payload as WeeklyFormState;
    setWeeklyForm(normalizeWeeklyPayload(payload));
    setSelectedType('weekly');
  };

  const downloadRegisteredBitacora = async (entry: RegisteredBitacora) => {
    if (entry.tipo === 'station') {
      const payload = entry.payload as Partial<StationFormState>;
      setStationForm(normalizeStationPayload(payload));
      setSelectedType('station');
      requestAnimationFrame(() => requestAnimationFrame(() => void exportPdf('station')));
      return;
    }

    const payload = entry.payload as WeeklyFormState;
    setWeeklyForm(normalizeWeeklyPayload(payload));
    setSelectedType('weekly');
    requestAnimationFrame(() => requestAnimationFrame(() => void exportPdf('jefe')));
  };

  if (!isJefe && !isEstacion) {
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
            <button type="button" className="btn-save-bitacora" onClick={saveStationReport} disabled={saving}>{saving ? <BrandLoader variant="button" label="Guardando..." /> : 'Guardar'}</button>
            <button type="button" className="btn-save-bitacora secondary" onClick={() => exportPdf('station')}>
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Descargar PDF
            </button>
          </div>

          <div ref={stationSheetRef} className="bitacora-sheet bitacora-estacion-sheet">
            <div className="bitacora-title-wrap">
              <h2>MULTISERVICIOS LA VILLITA, S.A. de C.V.</h2>
              <p>GERENCIA DE OPERACION DE ESTACIONES DE SERVICIO</p>
              <p>REPORTE DE VISITA A ESTACIONES</p>
            </div>

            <div className="station-form-meta">
              <div className="station-meta-left">
                <label className="station-line station-name-line"><span>ESTACIÓN</span><input value={stationForm.estacion} onChange={(e) => updateStationField('estacion', e.target.value)} readOnly={isEstacion} /></label>
                <label className="station-line"><span>FECHA</span><input type="date" value={stationForm.fecha} onChange={(e) => updateStationField('fecha', e.target.value)} /></label>
                <label className="station-line"><span>HORA LLEGADA</span><input value={stationForm.horaLlegada} onChange={(e) => updateStationField('horaLlegada', e.target.value)} /></label>
              </div>
              <div className="station-meta-logo"><img src="/logo.png" alt="La Villita" /></div>
              <div className="station-meta-right">
                <label className="station-folio"><span>FOLIO</span><strong>Nº</strong><input value={stationForm.folio} readOnly /></label>
                <label className="station-line"><span>HORA SALIDA</span><input value={stationForm.horaSalida} onChange={(e) => updateStationField('horaSalida', e.target.value)} /></label>
              </div>
              <label className="station-line station-manager-line"><span>ENCARGADO DE ESTACIÓN:</span><input value={stationForm.encargado} onChange={(e) => updateStationField('encargado', e.target.value)} /></label>
            </div>

            <div className="station-section-heading">RECORRIDO DE INSTALACIONES:</div>
            <table className="bitacora-table">
              <thead>
                <tr>
                  <th style={{ width: '37%' }}>ÁREA</th>
                  <th style={{ width: '45%' }}>OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {stationChecklistRows.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="area-name">{label}</td>
                    <td><input value={String(stationForm[key] || '')} onChange={(e) => updateStationField(key, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="station-lower-heading">REQUERIMIENTOS DEL GERENTE DE ESTACIÓN</div>
            <div className="station-requirements-grid">
              <label><span>URGENTES</span><input value={stationForm.requerimientosUrgentes} onChange={(e) => updateStationField('requerimientosUrgentes', e.target.value)} /></label>
              <label><span>GENERALES</span><input value={stationForm.requerimientosGenerales} onChange={(e) => updateStationField('requerimientosGenerales', e.target.value)} /></label>
              <label className="station-material-row"><span>MATERIAL DE ASEO, REFACCIONES, SEÑALAMIENTO, PAPELERÍA, UNIFORMES.</span><input value={stationForm.requerimientosMaterial} onChange={(e) => updateStationField('requerimientosMaterial', e.target.value)} /></label>
            </div>

            <div className="station-lower-heading">SEGUIMIENTO DE ASUNTOS PENDIENTES DE VISITAS ANTERIORES</div>
            <div className="station-follow-grid">
              <label><span>INDICACIONES DE CORPORATIVO A LA ESTACIÓN</span><input value={stationForm.indicacionesCorporativo} onChange={(e) => updateStationField('indicacionesCorporativo', e.target.value)} /></label>
              <label><span>COORDINACIÓN INTERDEPARTAMENTAL</span><input value={stationForm.coordinacionInterdepartamental} onChange={(e) => updateStationField('coordinacionInterdepartamental', e.target.value)} /></label>
              <label className="full"><span>ENVÍOS, MENSAJES, PENDIENTES DE ESTACIÓN A CORPORATIVO</span><input value={stationForm.enviosPendientes} onChange={(e) => updateStationField('enviosPendientes', e.target.value)} /></label>
              {([1, 2, 3] as const).map((row) => (
                <React.Fragment key={row}>
                  <label><span>DIRIGIDO A:</span><input value={stationForm[`dirigidoA${row}`]} onChange={(e) => updateStationField(`dirigidoA${row}`, e.target.value)} /></label>
                  <label><span>CONCEPTO:</span><input value={stationForm[`concepto${row}`]} onChange={(e) => updateStationField(`concepto${row}`, e.target.value)} /></label>
                </React.Fragment>
              ))}
            </div>

            <div className="station-lower-heading">OBSERVACIONES E INSTRUCCIONES A GERENCIA DE ESTACIÓN PARA PRÓXIMA VISITA</div>
            <table className="station-instructions-table">
              <thead><tr><th></th><th>OBSERVACIONES</th><th>INSTRUCCIONES</th></tr></thead>
              <tbody>
                {([
                  ['ATENCIÓN A CLIENTES EN DISPENSARIOS', 'atencionClientes', 'instruccionesAtencion'],
                  ['CORTESÍA', 'cortesia', 'instruccionesCortesia'],
                  ['IMAGEN', 'imagen', 'instruccionesImagen'],
                  ['MOTIVACIÓN DE VENTA', 'motivacionVenta', 'instruccionesMotivacion'],
                ] as Array<[string, keyof StationFormState, keyof StationFormState]>).map(([label, observationKey, instructionKey]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td><input value={String(stationForm[observationKey] || '')} onChange={(e) => updateStationField(observationKey, e.target.value)} /></td>
                    <td><input value={String(stationForm[instructionKey] || '')} onChange={(e) => updateStationField(instructionKey, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label className="station-maintenance-row"><span>LABORES DE MANTENIMIENTO A REALIZAR</span><input value={stationForm.laboresMantenimiento} onChange={(e) => updateStationField('laboresMantenimiento', e.target.value)} /></label>
            <div className="station-signatures">
              <label><input value={stationForm.realizoVisita} onChange={(e) => updateStationField('realizoVisita', e.target.value)} /><span>REALIZÓ VISITA</span></label>
              <label><input value={stationForm.recibioVisita} onChange={(e) => updateStationField('recibioVisita', e.target.value)} /><span>RECIBIÓ VISITA</span></label>
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
            <button type="button" className="btn-save-bitacora" onClick={saveWeeklyReport} disabled={saving}>{saving ? <BrandLoader variant="button" label="Guardando..." /> : 'Guardar'}</button>
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
                {weeklyLeftSections.map((section, index) => renderWeeklySection(section, false, index === 0))}
              </div>

              <div className="weekly-column">
                {weeklyRightSections.map((section, index) => renderWeeklySection(section, section.title === 'BAÑOS PUBLICOS', index === 0))}
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
          <button type="button" className="bitacora-card" onClick={() => {
            setEditingBitacoraId(null);
            setStationForm({ ...initialStationForm, estacion: isEstacion ? stationUserName : '', fecha: formatDateForInput(new Date()), id: createStationReportId() });
            setSelectedType('station');
          }}>
            <span className="bitacora-card-badge">bitácora 01</span>
            <h3>REPORTE DE VISITA A ESTACIONES</h3>
            <p>Formato completo para registrar inspección, requerimientos y observaciones de la estación.</p>
          </button>
        )}

        {availableBitacoras.includes('weekly') && (
          <button type="button" className="bitacora-card" onClick={() => {
            setEditingBitacoraId(null);
            setWeeklyForm({ ...initialWeeklyForm, fecha: formatDateForInput(new Date()) });
            setSelectedType('weekly');
          }}>
            <span className="bitacora-card-badge">bitácora 02</span>
            <h3>LISTA DE VERIFICACIÓN SEMANAL</h3>
            <p>Control semanal por áreas con revisión rápida de cumplimiento y observaciones.</p>
          </button>
        )}
      </div>

      <div className="bitacora-registered-section">
        <h3>Bitácoras registradas</h3>
        {isJefe && (
          <div className="bitacora-filters">
            <label>
              Estación
              <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}>
                <option value="">Todas las estaciones</option>
                {stationOptions.map((station) => <option key={station} value={station}>{station}</option>)}
              </select>
            </label>
            <label>
              Fecha de creación
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </label>
            {(stationFilter || dateFilter) && (
              <button type="button" onClick={() => { setStationFilter(''); setDateFilter(''); }}>Limpiar filtros</button>
            )}
          </div>
        )}
        {archiveLoading ? (
          <BrandLoader variant="section" label="Cargando bitácoras..." />
        ) : archiveEntries.length > 0 ? (
          <div className="bitacora-registered-grid">
            {archiveEntries.map((entry) => (
              <div key={entry.id} className="bitacora-registered-card">
                <div className="bitacora-registered-name">{entry.nombre}</div>
                <div className="bitacora-registered-meta"><strong>Estación:</strong> {entry.estacion || 'N/A'}</div>
                <div className="bitacora-registered-meta"><strong>Fecha:</strong> {entry.fecha || 'Sin fecha'}</div>
                <div className="bitacora-registered-meta"><strong>Creada:</strong> {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('es-MX') : 'Sin fecha'}</div>
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
