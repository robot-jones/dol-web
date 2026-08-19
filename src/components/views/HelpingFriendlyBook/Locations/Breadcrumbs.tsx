import { usePathname, useRouter } from "next/navigation";
import { getStateName } from "@erikmuir/dol-lib/dapp";
import { sanitizeText } from "@erikmuir/dol-lib/utils";

export type BreadcrumbsProps = {
  country?: string;
  state?: string;
  city?: string;
  venue?: string;
  jumpTo: (name: string, value: string) => void;
};

export const Breadcrumbs = ({
  country,
  state,
  city,
  venue,
  jumpTo,
}: BreadcrumbsProps): React.ReactElement => {
  const router = useRouter();
  const pathname = usePathname();

  const breadcrumbs: React.ReactElement[] = [];

  let dividerCount = 0;
  const getDivider = (): React.ReactElement => (
    <div key={`divider-${dividerCount++}`}>{">"}</div>
  );

  if (!country) return <></>;

  if (country) {
    breadcrumbs.push(
      <div
        key="planet-Earth"
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
        Earth
      </div>
    );
  }

  if (country && (state || city)) {
    breadcrumbs.push(getDivider());
    breadcrumbs.push(
      <div
        key={`country-${country}`}
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => jumpTo("country", country)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jumpTo("country", country);
          }
        }}
      >
        {sanitizeText(country)}
      </div>
    );
  }

  if (country === "USA" && state && city) {
    breadcrumbs.push(getDivider());
    breadcrumbs.push(
      <div
        key={`state-${state}`}
        role="button"
        tabIndex={0}
        onClick={() => jumpTo("state", state)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jumpTo("state", state);
          }
        }}
        className="cursor-pointer"
      >
        {sanitizeText(getStateName(state))}
      </div>
    );
  }

  if (city && venue) {
    breadcrumbs.push(getDivider());
    breadcrumbs.push(
      <div
        key={`city-${city}`}
        role="button"
        tabIndex={0}
        onClick={() => jumpTo("city", city)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            jumpTo("city", city);
          }
        }}
        className="cursor-pointer"
      >
        {sanitizeText(city)}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      {breadcrumbs.map((breadcrumb) => breadcrumb)}
    </div>
  );
};
