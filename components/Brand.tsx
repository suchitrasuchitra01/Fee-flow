import Image from "next/image";
import sitsLogo from "@/SITS-logo-2.webp";

export { sitsLogo };

export default function Brand({
  admin = false,
  className = "",
  onlyLogo = false,
  onlyName = false
}: {
  admin?: boolean;
  className?: string;
  onlyLogo?: boolean;
  onlyName?: boolean;
}) {
  if (onlyName) {
    return (
      <div className={`brand-name-only ${className}`.trim()}>
        <span className="feeflow-brand-text">
          Fee<span className="feeflow-flow-accent">Flow</span>
        </span>
        {admin && <em>Admin</em>}
      </div>
    );
  }

  if (onlyLogo) {
    return (
      <div className={`brand-logo-only ${className}`.trim()}>
        <Image
          className="sits-logo topbar-sits-logo"
          src={sitsLogo}
          alt="Siddhartha Institute of Technology and Sciences"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`brand ${className}`.trim()}>
      <Image className="sits-logo" src={sitsLogo} alt="Siddhartha Institute of Technology and Sciences" priority />
      <span className="portal-name">FeeFlow</span>
      {admin && <em>Admin</em>}
    </div>
  );
}
