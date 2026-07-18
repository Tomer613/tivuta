import { VendorAuthProvider } from "@/context/VendorAuthContext";

export default function VendorRootLayout({ children }: { children: React.ReactNode }) {
    return <VendorAuthProvider>{children}</VendorAuthProvider>;
}
