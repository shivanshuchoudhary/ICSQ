// Simple bar chart component since we can't use recharts
function BarChart({ data, height = 400, width = "100%" }) {
  const maxValue = Math.max(...data.map((item) => item.score || 0))

  return (
    <div style={{ height, width }} className="relative">
      <div className="flex h-full">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col justify-end items-center mx-2 flex-1">
            <div
              className="bg-blue-600 w-full rounded-t-sm"
              style={{ height: `${(item.score / maxValue) * 100}%` }}
            ></div>
            <div className="text-xs mt-1 text-center truncate w-full">{item.name}</div>
            <div className="text-xs font-bold">{item.score}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BarChart
