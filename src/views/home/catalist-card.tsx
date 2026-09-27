import Image from "next/image";
import type { CatalistContent } from "@/data/mocks/home";

export interface CatalistCardProps {
  variant: "dark" | "light";
  content: CatalistContent;
  bg: string;
}

const Logo = () => (
  <span
    aria-hidden="true"
    className="flex size-[3.4vmin] shrink-0 items-center justify-center rounded-[0.9vmin] bg-white text-ink"
  >
    {/* Brand sparkle (four-point star), echoing the site star logo. */}
    <svg viewBox="0 0 24 24" className="size-[2.2vmin]" fill="currentColor" aria-hidden="true">
      <path d="M12 2 L13.9 10.1 L22 12 L13.9 13.9 L12 22 L10.1 13.9 L2 12 L10.1 10.1 Z" />
    </svg>
  </span>
);

/**
 * "Catalist" product UI mockup — carousel cards 2 (dark) and 3 (light). The
 * outer sizing/transform is applied by the stage; this renders the full-bleed
 * background image and the overlaid mock chrome.
 */
export const CatalistCard = ({ variant, content, bg }: CatalistCardProps) => {
  const dark = variant === "dark";
  const ink = dark ? "text-cc-dark-ink" : "text-cc-light-ink";

  return (
    <div className={`relative size-full overflow-hidden rounded-card ${ink}`}>
      <Image src={bg} alt="" fill sizes="42vmin" className="object-cover" />

      <div className="absolute inset-0 flex flex-col p-[3.2vmin] font-sans">
        <div className="flex items-center justify-between">
          <Logo />
          <span className="text-[1.5vmin] tracking-[0.02em] opacity-85">
            {content.url}
          </span>
        </div>

        {dark ? (
          <div className="mt-[2.6vmin] flex items-center justify-between gap-[1.5vmin] rounded-[4vmin] border border-glass-border bg-glass-dark px-[2vmin] py-[1.8vmin] backdrop-blur-[10px]">
            <span className="flex flex-col gap-[0.4vmin]">
              <span className="text-[1.4vmin] opacity-60">{content.pillLabel}</span>
              <span className="text-[2.2vmin]">{content.pillTitle}</span>
            </span>
            <span className="flex size-[3vmin] shrink-0 items-center justify-center rounded-full bg-glass-border text-[1.9vmin]">
              +
            </span>
          </div>
        ) : (
          <div className="my-auto flex items-center gap-[1.4vmin] rounded-[5vmin] bg-cc-search px-[2.2vmin] py-[2vmin] text-paper">
            <span className="flex size-[3vmin] shrink-0 items-center justify-center rounded-full bg-glass-border-soft text-[1.9vmin]">
              +
            </span>
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[1.7vmin] opacity-80">
              {content.searchText}
            </span>
            <span className="flex size-[3vmin] shrink-0 items-center justify-center rounded-full bg-glass-border-soft text-[1.9vmin]">
              ➤
            </span>
          </div>
        )}

        <div className="mt-auto">
          {dark ? (
            <h3 className="text-[4.6vmin] font-normal leading-[1.05]">
              {content.lead}
              <strong className="font-bold text-white">{content.leadStrong}</strong>
            </h3>
          ) : (
            <p className="text-[3.1vmin] font-normal leading-[1.2] text-paper">
              {content.lead}
              <strong className="font-bold text-white">{content.leadStrong}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
