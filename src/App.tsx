/**
 * Re-export pentru IDE-uri / analizori care rezolvă `src/App.tsx` la rădăcina monorepo-ului.
 * Sursa canonică (routing, importuri `./pages/...`): `apps/web/src/App.tsx`.
 * Nu folosi symlink: TypeScript rezolvă `./pages/*` relativ la `src/`, nu la `apps/web/src/`.
 */
export { App } from "../apps/web/src/App.js";
