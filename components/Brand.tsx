import Image from "next/image";
import sitsLogo from "@/SITS-logo-2.webp";

export default function Brand({ admin = false }: { admin?: boolean }) {
  return (
    <div className="brand">
      <Image className="sits-logo" src={sitsLogo} alt="Siddhartha Institute of Technology and Sciences" priority />
      <span className="portal-name">FeeFlow</span>
      {admin && <em>Admin</em>}
    </div>
  );
}
