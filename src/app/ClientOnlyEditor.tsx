"use client";

import dynamic from "next/dynamic";

const GeoEditor = dynamic(() => import("@/components/core/GeoEditor"), {
  ssr: false,
});

export default function ClientOnlyEditor() {
  return <GeoEditor />;
}

