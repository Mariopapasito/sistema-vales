import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import './DraftStatus.css';

export default function DraftStatus({ savedAt }: { savedAt: string | null }) {
  if (!savedAt) return null;
  const time = new Date(savedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return (
    <span className="draft-status" title="Este borrador se conserva en este dispositivo">
      <CloudArrowUpIcon /> Borrador guardado {time}
    </span>
  );
}
