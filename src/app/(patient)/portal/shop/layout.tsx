import { CartProvider } from "@/components/marketplace/CartProvider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
