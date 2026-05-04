"use client"

function Select({ value, onValueChange, placeholder, options = [], className = "", disabled = false }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      className={`w-full border border-gray-700/50 bg-white/5 rounded-md shadow-sm px-3 py-2 text-gray-200 
        focus:outline-none focus:ring-2 focus:ring-[#93725E] focus:border-[#93725E] 
        transition-all duration-200 hover:border-gray-600/70 hover:bg-white/10 
        disabled:opacity-50 disabled:cursor-not-allowed appearance-none
        bg-no-repeat bg-right-4 bg-20
        ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option 
          key={option.value} 
          value={option.value}
          className="bg-[#29252c] text-[#FFF8E7]"
        >
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default Select
