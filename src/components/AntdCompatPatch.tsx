"use client";

// layout.tsx is a Server Component (it exports `metadata`, which App Router
// forbids in "use client" files), so a bare side-effect import there only
// runs during SSR — it never reaches the browser bundle, since Next.js only
// includes a module in the client chunk when a "use client" file (transitively)
// imports it. AntdRegistry/ConfigProvider below are themselves "use client",
// but none of them import this patch, so without this dedicated client
// component the antd v5 vs. React 19 compatibility warning still fires in the
// browser console even though the patch package is installed and "imported".
import "@ant-design/v5-patch-for-react-19";

export default function AntdCompatPatch() {
  return null;
}
