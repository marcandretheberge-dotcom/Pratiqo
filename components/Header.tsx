import Image from "next/image";

export function Header() {
  return (
    <header>
      <Image
        src="/logo-300w.png"
        alt="Pratiqo"
        width={300}
        height={64}
        priority
      />
    </header>
  );
}
