import { Link } from "react-router-dom";
import { cn } from "@/lib/utils.js";

/**
 * Pagină 404 neutră: fără date business, fără apeluri API.
 * CTA = `Link` cu clasele butonului „brand” (evită `<a><button>` — nested interactive invalid).
 */
export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-4xl font-bold text-t1 mb-2">404</h1>
      <p className="text-t3 mb-6">Pagina nu a fost găsită.</p>
      <Link to="/dashboard" className={cn("btn", "btb")}>
        Înapoi la Dashboard
      </Link>
    </div>
  );
}
