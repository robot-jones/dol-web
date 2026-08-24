import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="shrink-0 mt-8">
      <div className="flex items-center justify-center gap-2 text-xs p-2">
        <div>built on Hedera</div>
        <Image src="/hedera-logo.png" width={20} height={20} alt="Hedera" className="rounded-full" />
        <div>·</div>
        <div>by RobotJones</div>
        <Image src="/robotjones.jpg" width={20} height={20} alt="RobotJones" className="rounded-full" />
      </div>
      {/* Setlist/show data is phish.net's (attribution required by their API
          terms of use); streaming audio is phish.in's - both open-license,
          credited here rather than repeated everywhere their data appears. */}
      <div className="flex items-center justify-center gap-1 text-xs text-gray-medium pb-2">
        <div>setlist &amp; show data courtesy of</div>
        <a
          href="https://phish.net"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-dol-yellow"
        >
          phish.net
        </a>
        <div>· streaming audio courtesy of</div>
        <a
          href="https://phish.in"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-dol-yellow"
        >
          phish.in
        </a>
      </div>
    </footer>
  );
};
