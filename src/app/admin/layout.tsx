// Auth is guaranteed by middleware — this layout is a simple pass-through.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
