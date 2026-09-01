import Image from "next/image";

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 mt-8 border-t border-gray-dark-2 bg-gray-extra-dark">
      <div className="flex flex-col items-center gap-2 px-2 py-6">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span>built on Hedera</span>
          <Image src="/hedera-logo.png" width={18} height={18} alt="Hedera" className="rounded-full" />
          <span className="text-gray-medium">·</span>
          <span>by RobotJones</span>
          <Image src="/robotjones.jpg" width={18} height={18} alt="RobotJones" className="rounded-full" />
        </div>
        {/* Setlist/show data is phish.net's (attribution required by their API
            terms of use); streaming audio is phish.in's - both open-license,
            credited here rather than repeated everywhere their data appears. */}
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-xs text-gray-medium">
          <span className="whitespace-nowrap">
            setlist &amp; show data courtesy of{" "}
            <a
              href="https://phish.net"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dol-yellow"
            >
              phish.net
            </a>
          </span>
          <span className="whitespace-nowrap">
            · streaming audio courtesy of{" "}
            <a
              href="https://phish.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dol-yellow"
            >
              phish.in
            </a>
          </span>
        </div>
        <div className="text-xs text-gray-medium text-center text-balance">
          &copy; {year} Duke of Lizards &mdash; unofficial fan project, not affiliated with or endorsed by Phish
        </div>
      </div>
    </footer>
  );
};
