import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

function Toast({
  show,
  type = 'info',
  title,
  message,
  onClose,
  duration = 5000,
  position = 'top-right'
}) {
  const icons = {
    success: (
      <CheckCircleIcon
        className="h-6 w-6 text-green-400"
        aria-hidden="true"
      />
    ),
    error: (
      <XCircleIcon
        className="h-6 w-6 text-red-400"
        aria-hidden="true"
      />
    ),
    warning: (
      <ExclamationCircleIcon
        className="h-6 w-6 text-yellow-400"
        aria-hidden="true"
      />
    ),
    info: (
      <InformationCircleIcon
        className="h-6 w-6 text-blue-400"
        aria-hidden="true"
      />
    )
  };

  const positions = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };

  // Auto-close after duration
  if (show && duration > 0) {
    setTimeout(() => {
      onClose();
    }, duration);
  }

  return (
    <div
      aria-live="assertive"
      className={`fixed inset-0 flex items-start px-4 py-6 pointer-events-none z-50 ${positions[position]}`}
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        <Transition
          show={show}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">{icons[type]}</div>
                <div className="ml-3 w-0 flex-1">
                  {title && (
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                  )}
                  {message && (
                    <p className="mt-1 text-sm text-gray-500">{message}</p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    type="button"
                    className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
}

export default Toast;