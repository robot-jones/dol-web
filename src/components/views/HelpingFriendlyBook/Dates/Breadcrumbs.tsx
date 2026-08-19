import { usePathname, useRouter } from "next/navigation";
import { sanitizeText } from "@erikmuir/dol-lib/utils";

export type BreadcrumbsProps = {
  era?: string;
  year?: string;
  month?: string;
  jumpTo: (name: string, value: string) => void;
};

export const Breadcrumbs = ({
  era,
  year,
  month,
  jumpTo,
}: BreadcrumbsProps): React.ReactElement => {
  const router = useRouter();
  const pathname = usePathname();

  const breadcrumbs: React.ReactElement[] = [];

  let dividerCount = 0;
  const getDivider = (): React.ReactElement => (
    <div key={`divider-${dividerCount++}`}>{">"}</div>
  );

  if (!era) return <></>;

  if (era) {
    breadcrumbs.push(
      <div
        key="eras"
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => router.push(pathname)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(pathname);
          }
        }}
      >
        Eras
      </div>
    );
  }

  if (era && year) {
    breadcrumbs.push(getDivider());
    breadcrumbs.push(
      <div
        key={`era-${era}`}
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => jumpTo("era", era)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jumpTo("era", era);
          }
        }}
      >
        {sanitizeText(era)}
      </div>
    );
  }

  if (era && year && month) {
    breadcrumbs.push(getDivider());
    breadcrumbs.push(
      <div
        key={`year-${year}`}
        role="button"
        tabIndex={0}
        onClick={() => jumpTo("year", year)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jumpTo("year", year);
          }
        }}
        className="cursor-pointer"
      >
        {sanitizeText(year)}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      {breadcrumbs.map((breadcrumb) => breadcrumb)}
    </div>
  );
};
