"use client";

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function ApiDocs() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // 1. Force enable scrolling for this page
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    // 2. Cleanup: Re-lock scrolling when leaving this page (to preserve Dashboard feel)
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, []);

  if (!isMounted) return null;

  return (
    // Ensure the container is scrollable and takes full height
    <div className="h-screen w-full bg-[#020617] overflow-y-auto">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: '/api/openapi.json',
          },
          theme: 'kepler',
          darkMode: true,
          hideModels: true,
          customCss: `
            .scalar-card { background: #0B1121 !important; border: 1px solid rgba(255,255,255,0.1) !important; }
            .scalar-app { background: #020617 !important; color: white !important; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
            /* Ensure the Scalar sidebar is scrollable too */
            .sidebar { overflow-y: auto !important; }
          `,
        }}
      />
    </div>
  );
}