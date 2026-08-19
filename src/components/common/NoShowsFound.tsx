export type NoShowsFoundProps = {
  header: string;
};

export const NoShowsFound = ({
  header,
}: NoShowsFoundProps): React.ReactElement => {
  return (
    <div className="w-full max-w-[320px] py-2 mx-auto flex flex-col items-center justify-center">
      <div className="text-xl text-dol-yellow pb-4">{header}</div>
      <div className="text-lg text-dol-red">no shows found</div>
    </div>
  );
};
