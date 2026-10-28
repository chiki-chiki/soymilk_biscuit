/** 袋の左上の、棒に付いた旗。英字の筆記体を載せる */
export function Pennant({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`flex items-center ${className}`} aria-hidden>
      {/* 旗ざお（先に玉） */}
      <span className="relative mr-[-2px] h-7 w-[5px] rounded-full bg-biscuit">
        <span className="absolute -top-1.5 -left-[3px] size-[11px] rounded-full bg-biscuit" />
      </span>
      <span
        className="bg-paper py-0.5 pr-6 pl-2 font-script text-[13px] leading-tight text-blue"
        style={{ clipPath: "polygon(0 0, 100% 12%, 88% 50%, 100% 88%, 0 100%)" }}
      >
        {children}
      </span>
    </span>
  );
}
