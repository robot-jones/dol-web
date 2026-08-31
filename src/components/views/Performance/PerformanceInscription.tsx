export type PerformanceInscriptionProps = {
  isShown: boolean;
  inscription: string;
};

export const PerformanceInscription = ({ isShown, inscription }: PerformanceInscriptionProps) => {
  return isShown && typeof inscription === "string" && inscription.trim().length > 0
    ? <div className="text-center text-balance text-sm text-gray-medium py-3 font-mono">{inscription}</div>
    : null;
};
