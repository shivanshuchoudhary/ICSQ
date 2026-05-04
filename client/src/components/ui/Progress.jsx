function Progress({ value = 0, max = 100, className = "" }) {
  const percentage = Math.min(Math.max(value, 0), max)
  const color = (value < 60) ? 'bg-red-500' : ((value < 80) ? 'bg-[goldenrod]' : 'bg-green-500');

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div className={`${color} h-2.5 rounded-full`} style={{ width: `${(percentage / max) * 100}%` }}></div>
    </div>
  )
}

export default Progress
