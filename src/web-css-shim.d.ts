/**
 * Shim pentru `tsconfig.json` (rădăcină): `App.tsx` re-exportă din `apps/web`, unde există
 * importuri CSS side-effect (Vite). Fără aceste declarații, `tsc` pe monorepo
 * raportează TS2882 când proiectul `src/` trage fișiere `.tsx` din web.
 */
declare module "*.css" {
  const _empty: string;
  export default _empty;
}
