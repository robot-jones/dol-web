import { FaDiscord } from "react-icons/fa";

export type DiscordLinkProps = {
  sizeInPixels?: number;
  includeText?: boolean;
};

export const DiscordLink = ({
  sizeInPixels,
  includeText,
}: DiscordLinkProps): React.ReactNode => {
  return (
    <div className="flex flex-col items-center justify-center">
      <a
        className="text-[#5865f2] hover:scale-125 duration-500"
        href="https://discord.gg/WpaDkMxEJ9"
        title="Duke of Lizards Discord"
        aria-label="Duke of Lizards Discord"
      >
        <FaDiscord size={sizeInPixels} />
      </a>
      {includeText && <div>Share in the groove on Discord!</div>}
    </div>
  );
};
