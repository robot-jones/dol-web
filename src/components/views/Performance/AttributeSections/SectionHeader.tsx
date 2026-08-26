export type SectionHeaderProps = {
  text: string;
};

export const SectionHeader = ({ text }: SectionHeaderProps): React.ReactNode => {
  return (
    <h3 className="flex flex-wrap justify-center gap-2 items-center pt-12 pb-4">
      <div className="text-xl">{text}</div>
    </h3>
  );
};
