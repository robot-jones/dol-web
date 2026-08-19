"use client";

export default function SetlistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[320px] sm:max-w-[448px] md:max-w-[500px] lg:max-w-[680px] xl:max-w-[900px] flex flex-col">
      {children}
    </div>
  );
}
