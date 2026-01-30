export default function DebugPage() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-bold mb-2">VITE_SUPABASE_URL</h2>
          <div className="font-mono text-sm break-all">{url || "NOT SET"}</div>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-bold mb-2">VITE_SUPABASE_ANON_KEY</h2>
          <div className="font-mono text-sm break-all">
            {key ? `${key.substring(0, 50)}...` : "NOT SET"}
          </div>
        </div>
        
        <div className="p-4 border rounded bg-blue-50">
          <h2 className="font-bold mb-2">All VITE_* Variables</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(import.meta.env).filter(([k]) => k.startsWith("VITE_"))
              ),
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
