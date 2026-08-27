export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[50vh] text-slate-400 gap-3">
      <div className="h-10 w-10 border-4 border-teal-800 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-bold text-teal-800 uppercase tracking-widest animate-pulse">Loading Portal...</p>
    </div>
  )
}
