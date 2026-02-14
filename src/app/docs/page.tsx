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
    // The outer container takes the exact height of the monitor and pushes down for the navbar
    <div className="h-screen w-full bg-[#020617] flex flex-col pt-0">
      
      {/* FIX: Added 'overflow-y-auto'. This explicitly creates a scrollable bounding box for Scalar */}
      <div className="flex-1 overflow-y-auto w-full relative dark-scrollbar mb-10">
        <ApiReferenceReact
          configuration={{
            spec: { url: '/api/docs' },
            theme: 'kepler',
            darkMode: true,
            hideModels: true, 
            customCss: `
              .scalar-card { background: #0B1121 !important; border: 1px solid rgba(255,255,255,0.1) !important; }
              .scalar-app { background: #020617 !important; color: white !important; }
              .sidebar { background: #020617 !important; border-right: 1px solid rgba(255,255,255,0.05) !important; }
              .scalar-api-client { height: 100% !important; }
              .section-container { padding-top: 1rem !important; }
              .scalar-app-header { display: none !important; }
            `,
          }}
        />
      </div>
    </div>
  );
}