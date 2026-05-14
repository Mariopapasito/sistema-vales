import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import './SignatureModal.css';

interface SignatureModalProps {
  onConfirm: (signature: string | null) => void;
  onCancel: () => void;
  title?: string;
}

export default function SignatureModal({ onConfirm, onCancel, title = 'Cambio de estado' }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [wantSignature, setWantSignature] = useState<boolean | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  }, [drawing]);

  const stopDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || wantSignature !== true) return;

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [wantSignature, startDraw, draw, stopDraw]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const handleAccept = () => {
    if (wantSignature === false) {
      onConfirm(null);
      return;
    }
    if (!hasStrokes) return;
    const canvas = canvasRef.current!;
    // Export as PNG base64
    const dataURL = canvas.toDataURL('image/png');
    onConfirm(dataURL);
  };

  return createPortal(
    <div className="sig-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sig-modal">
        <div className="sig-header">
          <PencilSquareIcon className="sig-icon" />
          <h3>{title}</h3>
        </div>

        {wantSignature === null && (
          <div className="sig-question">
            <p>¿Deseas agregar tu firma digital a este vale?</p>
            <p className="sig-hint">La firma es opcional y quedará registrada en el documento.</p>
            <div className="sig-actions">
              <button className="sig-btn sig-btn--yes" onClick={() => setWantSignature(true)}>
                <PencilSquareIcon className="sig-btn-icon" />
                Sí, firmar
              </button>
              <button className="sig-btn sig-btn--no" onClick={() => setWantSignature(false)}>
                <XMarkIcon className="sig-btn-icon" />
                No, continuar sin firma
              </button>
            </div>
          </div>
        )}

        {wantSignature === true && (
          <div className="sig-canvas-section">
            <p className="sig-canvas-label">Firma en el recuadro:</p>
            <div className="sig-canvas-wrapper">
              <canvas ref={canvasRef} width={480} height={180} className="sig-canvas" />
              {!hasStrokes && (
                <span className="sig-canvas-placeholder">Dibuja tu firma aquí</span>
              )}
            </div>
            <div className="sig-canvas-actions">
              <button className="sig-btn sig-btn--clear" onClick={clearCanvas}>
                <TrashIcon className="sig-btn-icon" /> Borrar
              </button>
              <button
                className="sig-btn sig-btn--accept"
                onClick={handleAccept}
                disabled={!hasStrokes}
              >
                <CheckIcon className="sig-btn-icon" /> Confirmar firma
              </button>
            </div>
          </div>
        )}

        {wantSignature === false && (
          <div className="sig-no-sig">
            <p>Continuarás sin firma. ¿Confirmas el cambio de estado?</p>
            <div className="sig-actions">
              <button className="sig-btn sig-btn--accept" onClick={handleAccept}>
                <CheckIcon className="sig-btn-icon" /> Confirmar
              </button>
              <button className="sig-btn sig-btn--back" onClick={() => setWantSignature(null)}>
                ← Volver
              </button>
            </div>
          </div>
        )}

        <button className="sig-close" onClick={onCancel}>
          <XMarkIcon style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>,
    document.body
  );
}
