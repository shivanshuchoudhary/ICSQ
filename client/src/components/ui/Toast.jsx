"use client"
import { useToast } from "../../contexts/ToastContext"

function Toast() {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="fixed bottom-0 right-0 p-4 z-[9999] flex flex-col space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`backdrop-blur-lg bg-black/60 border rounded-lg shadow-lg p-4 flex items-start space-x-3 transform transition-all duration-300 ease-in-out ${
            toast.variant === "destructive" ? "border-red-500" : "border-gray-400"
          }`}
        >
          {toast.variant === "destructive" && (
            <div className="flex-shrink-0 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          <div className="flex-1">
            {toast.title && <h4 className="font-medium text-[goldenrod]">{toast.title}</h4>}
            {toast.description && <p className="text-sm text-gray-300 mt-1">{toast.description}</p>}
          </div>
          <button onClick={() => dismissToast(toast.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toast
