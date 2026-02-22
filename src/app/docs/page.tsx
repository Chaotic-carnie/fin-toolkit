"use client";

import { useEffect, useState } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

export default function ApiDocs() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    // Replaced h-[calc(...)] with flex-1. It automatically fills the layout perfectly.
    <div className="flex-1 w-full flex flex-col bg-[#020617] overflow-hidden">
      <div className="flex-1 w-full overflow-y-auto dark-scrollbar">
        <ApiReferenceReact
          configuration={{
            url: '/api/docs',
            theme: 'kepler',
            darkMode: true,
            hideModels: true, 
            customCss: `
              .scalar-app { background: #020617 !important; color: white !important; }
              .scalar-card { background: #0B1121 !important; border: 1px solid rgba(255,255,255,0.1) !important; }
              .sidebar { background: #020617 !important; border-right: 1px solid rgba(255,255,255,0.05) !important; }
              .scalar-app-header { display: none !important; }
              .scalar-api-client { height: 100% !important; }
            `,
          }}
        />
      </div>
    </div>
  );
}