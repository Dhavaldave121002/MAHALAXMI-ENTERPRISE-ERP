import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ProductionChart({
  data,
  formatDate,
  formatWeekday,
}: {
  data: { date: string; qty: number }[]
  formatDate: (dateKey: string) => string
  formatWeekday: (dateKey: string) => string
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" interval={0} tickFormatter={value => formatWeekday(String(value))} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={label => `${formatWeekday(String(label))}, ${formatDate(String(label))}`} />
          <Bar dataKey="qty" fill="#4f46e5" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
