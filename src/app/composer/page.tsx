// src/app/composer/page.tsx
import { PortfolioComposer } from "~/features/composer/components/PortfolioComposer";

export default function ComposerPage() {
  return (
    // 'flex-1' takes the remaining space from your global layout, 'overflow-hidden' locks the page.
    <main className="flex-1 w-full bg-[#020617] flex flex-col overflow-hidden">
      <PortfolioComposer />
    </main>
  );
}