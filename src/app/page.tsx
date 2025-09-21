// Client-only render to avoid hydration issues with browser APIs
import dynamic from "next/dynamic";

const GeoEditor = dynamic(() => import("@/components/core/GeoEditor"), {
  ssr: false,
});

export default function Home() {
  return <GeoEditor />;
}
