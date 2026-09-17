export default function Header() {
  return (
    <header className="h-[64px] bg-surface-container-lowest border-b border-border-light flex items-center justify-between px-6 sticky top-0 z-30 md:hidden">
      <span className="text-[20px] font-bold text-primary">SignAway</span>
      <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant">
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
    </header>
  );
}