import { CustomizableAttributes, CustomizableAttributesProps, SectionHeader } from "@/components/views/Performance/AttributeSections";

export type CustomizableAttributesSectionProps = CustomizableAttributesProps & {
  show: boolean;
};

export const CustomizableAttributesSection = ({
  show,
  ...customizableAttributesProps
}: CustomizableAttributesSectionProps): React.ReactNode => {
  if (!show) return null;
  return (
    <>
      <SectionHeader text="Customizable NFT Attributes" />
      <CustomizableAttributes {...customizableAttributesProps} />
    </>
  );
};
