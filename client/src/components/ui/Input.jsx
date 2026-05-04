"use client"

function Input({ type = "text", placeholder, value, onChange, className = "", disabled = false, ...props }) {
  return (
    <input
      type={type}
      className={`w-full bg-transparent px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#83725E] focus:border-[#83725E] ${
        disabled ? "cursor-not-allowed" : ""
      } ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    />
  )
}

export default Input
