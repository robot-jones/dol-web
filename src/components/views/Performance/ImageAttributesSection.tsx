import { ImageAttributes, ImageAttributesProps, SectionHeader } from "@/components/views/Performance/AttributeSections";

export type ImageAttributesSectionProps = ImageAttributesProps & {
  show: boolean;
};

export const ImageAttributesSection = ({
  show,
  ...imageAttributesProps
}: ImageAttributesSectionProps): React.ReactNode => {
  if (!show) return null;
  return (
    <>
      <SectionHeader text="Customizable NFT Attributes" />
      <ImageAttributes {...imageAttributesProps} />
    </>
  );
};
