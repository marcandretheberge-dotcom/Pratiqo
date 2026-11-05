import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Isolate learning UI from backend configuration while exercising the real route sources. */
export async function createPreview(repo) {
  const root = await mkdtemp(path.join(tmpdir(), 'yo-pilot-'));
  await mkdir(path.join(root, 'app'), { recursive: true });
  for (const name of ['node_modules', 'components', 'lib', 'public']) {
    await symlink(path.join(repo, name), path.join(root, name), 'dir');
  }
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true, dependencies: { next: '16.2.9', react: '19.2.4', 'react-dom': '19.2.4' } }));
  await writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'react-jsx', plugins: [{ name: 'next' }], baseUrl: '.', paths: { '@/*': ['./*'] } }, include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules'] }, null, 2));
  await writeFile(path.join(root, 'postcss.config.mjs'), await readFile(path.join(repo, 'postcss.config.mjs')));
  await writeFile(path.join(root, 'next.config.ts'), 'import type { NextConfig } from "next";\nconst config: NextConfig = { devIndicators: false };\nexport default config;\n');
  const css = await readFile(path.join(repo, 'app/globals.css'), 'utf8');
  await writeFile(path.join(root, 'app/globals.css'), css + `\n@source "${repo}/components";\n@source "${repo}/app/yo";\n`);
  await writeFile(path.join(root, 'app/layout.tsx'), 'import "./globals.css";\nimport type { ReactNode } from "react";\nexport default function Layout({children}:{children:ReactNode}) { return <html lang="fr"><body style={{"--font-inter":"Arial, sans-serif"} as React.CSSProperties}>{children}</body></html>; }\n');
  for (const route of ['yo/langues/italien/parcours', 'yo/langues/italien/parcours/[unitId]']) {
    const target = path.join(root, 'app', route);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'page.tsx'), await readFile(path.join(repo, 'app', route, 'page.tsx')));
  }
  return root;
}
