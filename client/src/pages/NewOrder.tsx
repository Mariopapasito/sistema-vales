import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createOrder } from '@/store/slices/ordersSlice';
import { Priority } from '@/types';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/utils/constants';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { PlusIcon, XMarkIcon, ArrowLeftIcon, Bars3Icon,
} from '@heroicons/react/24/outline';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/utils/constants';
import Sidebar from '@/components/Sidebar';

const newOrderSchema = z.object({
  prioridad: z.array(z.nativeEnum(Priority)).min(1, 'Selecciona al menos una prioridad'),
  ubicacion: z.string().min(1, 'La ubicacion es requerida').max(200, 'Maximo 200 caracteres'),
  descripcionProblema: z.string().min(10, 'Minimo 10 caracteres').max(2000, 'Maximo 2000 caracteres'),
  observaciones: z.string().max(1000, 'Maximo 1000 caracteres').optional()
});

type NewOrderFormData = z.infer<typeof newOrderSchema>;

const NewOrder = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading } = useAppSelector((state) => state.orders);
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<NewOrderFormData>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: {
      prioridad: [],
      ubicacion: '',
      descripcionProblema: '',
      observaciones: ''
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: async (acceptedFiles) => {
      setUploadingImages(true);
      try {
        const uploadPromises = acceptedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('image', file);

          // For now, we'll just store the files temporarily
          // The actual upload will happen when the order is created
          return URL.createObjectURL(file);
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        setImages((prev) => [...prev, ...uploadedUrls].slice(0, 5));
        toast.success(`${acceptedFiles.length} imagen(es) agregada(s)`);
      } catch (error) {
        toast.error('Error al subir imagenes');
      } finally {
        setUploadingImages(false);
      }
    }
  });

  const handlePriorityToggle = (priority: Priority) => {
    const newPriorities = selectedPriorities.includes(priority)
      ? selectedPriorities.filter((p) => p !== priority)
      : [...selectedPriorities, priority];

    setSelectedPriorities(newPriorities);
    setValue('prioridad', newPriorities);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: NewOrderFormData) => {
    if (selectedPriorities.length === 0) {
      toast.error('Selecciona al menos una prioridad');
      return;
    }

    try {
      await dispatch(createOrder({
        ...data,
        prioridad: selectedPriorities,
        imagenes: images
      })).unwrap();

      toast.success('Orden creada exitosamente');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error || 'Error al crear la orden');
    }
  };

  const priorityOptions: Priority[] = [
    Priority.ALTA,
    Priority.BAJA,
    Priority.PARO,
    Priority.CORRECTIVO
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem', width: '100%' }}>
        
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              padding: '0.6rem 0.8rem',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'none',
            }}
          >
            <Bars3Icon style={{ width: '20px', height: '20px' }} />
          </button>
          </div>
        <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estacion: {user?.estacion} | Solicitante: {user?.nombre}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Priority Selection */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prioridad</h2>
          <p className="text-sm text-gray-500 mb-4">
            Selecciona una o mas prioridades para la orden
          </p>

          <div className="flex flex-wrap gap-3">
            {priorityOptions.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => handlePriorityToggle(priority)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                  ${selectedPriorities.includes(priority)
                    ? `${PRIORITY_COLORS[priority].bg} ${PRIORITY_COLORS[priority].text} ${PRIORITY_COLORS[priority].border} border-2`
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }
                `}
              >
                {PRIORITY_LABELS[priority]}
              </button>
            ))}
          </div>

          {errors.prioridad && (
            <p className="mt-2 text-sm text-red-600">{errors.prioridad.message}</p>
          )}
        </div>

        {/* Location */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ubicacion</h2>
          <input
            {...register('ubicacion')}
            type="text"
            placeholder="Ej: Estacion de bombeo #3, Area de mantenimiento, etc."
            className={`input ${errors.ubicacion ? 'border-red-500' : ''}`}
          />
          {errors.ubicacion && (
            <p className="mt-2 text-sm text-red-600">{errors.ubicacion.message}</p>
          )}
        </div>

        {/* Problem Description */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Descripcion del problema</h2>
          <textarea
            {...register('descripcionProblema')}
            rows={5}
            placeholder="Describe el problema en detalle..."
            className={`textarea ${errors.descripcionProblema ? 'border-red-500' : ''}`}
          />
          {errors.descripcionProblema && (
            <p className="mt-2 text-sm text-red-600">{errors.descripcionProblema.message}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {watch('descripcionProblema')?.length || 0}/2000 caracteres
          </p>
        </div>

        {/* Observations */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Observaciones (opcional)</h2>
          <textarea
            {...register('observaciones')}
            rows={3}
            placeholder="Observaciones adicionales..."
            className={`textarea ${errors.observaciones ? 'border-red-500' : ''}`}
          />
          {errors.observaciones && (
            <p className="mt-2 text-sm text-red-600">{errors.observaciones.message}</p>
          )}
        </div>

        {/* Image Upload */}
        <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Imagenes (opcional)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Sube hasta 5 imagenes para documentar el problema (max. 5MB por imagen)
          </p>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            <PlusIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? 'Suelta las imagenes aqui...'
                : 'Arrastra imagenes o haz clic para seleccionar'}
            </p>
          </div>

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isLoading || uploadingImages}
            className="btn btn-primary flex-1 py-3"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creando...
              </span>
            ) : (
              'Crear Orden'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary py-3"
          >
            Cancelar
          </button>
        </div>
      </form>
        </div>
      </main>
    </div>
  );
};

export default NewOrder;