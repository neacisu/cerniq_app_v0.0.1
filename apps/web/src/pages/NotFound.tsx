import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.js";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-4xl font-bold text-t1 mb-2">404</h1>
      <p className="text-t3 mb-6">Pagina nu a fost găsită.</p>
      <Link to="/dashboard">
        <Button variant="brand">Înapoi la Dashboard</Button>
      </Link>
    </div>
  );
}
