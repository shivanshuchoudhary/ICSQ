function Button({
  children,
  type = "button",
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  onClick,
  ...props
}) {
  const variantClasses = {
    default: "bg-[#93725E] hover:bg-[#8f664d] text-gray-300 hover:text-white",
    outline: "bg-transparent border border-[#93725E] text-[#93725E] hover:text-[goldenrod] hover:border-[goldenrod]",
    ghost: "bg-transparent text-[#83725E] hover:bg-white/30 hover:text-[goldenrod]",
    link: "bg-transparent text-[#83725E] underline hover:text-[#6f5f4e]",
    destructive: "bg-red-600 hover:bg-red-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
  }

  const sizeClasses = {
    sm: "py-1 px-3 text-sm",
    default: "py-2 px-4 text-base",
    lg: "py-3 px-6 text-lg",
    icon: "p-2",
  }

  return (
    <button
      type={type}
      className={`shadow-lg flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#83725E] focus:ring-offset-2 ${
        variantClasses[variant] || variantClasses.default
      } ${sizeClasses[size] || sizeClasses.default} ${disabled ? "opacity-70 cursor-not-allowed" : ""} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
