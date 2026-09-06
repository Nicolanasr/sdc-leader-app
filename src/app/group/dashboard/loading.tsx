export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-teal-900/10 border border-teal-900/20 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-teal-800 border-t-transparent animate-spin" />
        </div>
      </div>
    </div>
  )
}
