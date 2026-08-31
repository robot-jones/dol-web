import { CustomizableAttributes, CustomizableAttributesProps, SectionHeader } from "@/components/views/Performance/AttributeSections";

export type CustomizableAttributesSectionProps = CustomizableAttributesProps & {
  isShown: boolean;
};

export const CustomizableAttributesSection = ({
  isShown,
  ...customizableAttributesProps
}: CustomizableAttributesSectionProps): React.ReactNode => {
  if (!isShown) return null;
  return (
    <>
      <SectionHeader text="Customizable NFT Attributes" />
      <CustomizableAttributes {...customizableAttributesProps} />
    </>
  );
};
