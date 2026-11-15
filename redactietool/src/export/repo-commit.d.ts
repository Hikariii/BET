/** De commit van de repo waaruit de build komt; `null` bij een build zonder `GITHUB_SHA`. Vite vervangt hem bij het bouwen (`define` in `vite.config.ts`). */
declare const __REPO_COMMIT__: string | null;
