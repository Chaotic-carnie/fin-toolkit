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
    // FIX: Added 'pt-20' to push content below the fixed Navbar
    <div className="h-screen w-full bg-[#020617] overflow-y-auto pt-20">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: '/api/docs', 
          },
          theme: 'kepler',
          darkMode: true,
          hideModels: true, 
          customCss: `
            /* Fix transparency issues */
            .scalar-card { background: #0B1121 !important; border: 1px solid rgba(255,255,255,0.1) !important; }
            .scalar-app { background: #020617 !important; color: white !important; }
            
            /* Ensure the sidebar matches your dark theme */
            .sidebar { background: #020617 !important; border-right: 1px solid rgba(255,255,255,0.05) !important; }
            
            /* Optional: Adjust internal padding if Scalar feels too cramped */
            .section-container { padding-top: 2rem !important; }
          `,
        }}
      />
    </div>
  );
}