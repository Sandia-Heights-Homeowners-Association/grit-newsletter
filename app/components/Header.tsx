import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <div className="mb-8 flex justify-center">
      <Link href="/">
        <Image 
          src="/logo.png" 
          alt="The GRIT Logo" 
          width={480} 
          height={120}
          className="object-contain cursor-pointer hover:opacity-90 transition"
        />
      </Link>
    </div>
  );
}
