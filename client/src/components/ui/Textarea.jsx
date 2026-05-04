"use client"

function Textarea({ placeholder, value, onChange, className = "", disabled = false, rows = 3, ...props }) {
  return (
    <textarea
      className={`bg-transparent w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 ${
        disabled ? "cursor-not-allowed" : ""
      } ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      {...props}
    />
  )
}

export default Textarea
