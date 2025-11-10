import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import toast, { Toaster, Toast } from 'react-hot-toast';

export function EnhancedToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    >
      {(t) => <CustomToast toast={t} />}
    </Toaster>
  );
}

function CustomToast({ toast: t }: { toast: Toast }) {
  const { type, message } = t;

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
      progressColor: 'bg-red-500',
    },
    loading: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
      progressColor: 'bg-blue-500',
    },
    blank: {
      icon: Info,
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      iconColor: 'text-slate-600',
      textColor: 'text-slate-900',
      progressColor: 'bg-slate-500',
    },
    custom: {
      icon: Info,
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      iconColor: 'text-slate-600',
      textColor: 'text-slate-900',
      progressColor: 'bg-slate-500',
    },
  };

  const currentConfig = config[type] || config.blank;
  const Icon = currentConfig.icon;

  return (
    <div
      className={`${
        t.visible ? 'animate-slide-in' : 'animate-fade-out opacity-0'
      } max-w-md w-full ${currentConfig.bgColor} ${currentConfig.borderColor} border rounded-xl shadow-lg pointer-events-auto overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${currentConfig.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${currentConfig.textColor}`}>
              {typeof message === 'string' ? message : 'Notification'}
            </p>
          </div>
          {t.type !== 'loading' && (
            <button
              onClick={() => toast.dismiss(t.id)}
              className={`flex-shrink-0 ${currentConfig.iconColor} hover:opacity-70 transition-opacity`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {t.type === 'loading' && (
        <div className="h-1 bg-slate-200">
          <div className={`h-full ${currentConfig.progressColor} animate-pulse`} style={{ width: '50%' }} />
        </div>
      )}
    </div>
  );
}

export const enhancedToast = {
  success: (message: string, options?: any) => {
    return toast.success(message, {
      ...options,
      duration: 3000,
    });
  },
  error: (message: string, options?: any) => {
    return toast.error(message, {
      ...options,
      duration: 5000,
    });
  },
  loading: (message: string, options?: any) => {
    return toast.loading(message, options);
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },
  custom: (message: string, icon?: React.ReactNode) => {
    return toast.custom(message);
  },
};
