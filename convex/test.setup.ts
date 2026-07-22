type GlobImporter = (
  patterns: string | string[],
) => Record<string, () => Promise<unknown>>;

export const convexTestModules = (import.meta as ImportMeta & { glob: GlobImporter }).glob([
  "./**/*.ts",
  "./**/*.js",
  "!./**/*.test.ts",
  "!./**/*.d.ts",
]);
