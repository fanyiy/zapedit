"use client";

import Link from "next/link";
import { PlusIcon } from "./components/PlusIcon";

export function NewImageButton() {
  return (
    <Link
      href="/"
      onClick={() => window.dispatchEvent(new CustomEvent('new-image-session'))}
      className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 transition-colors"
    >
      <PlusIcon />
      <span className="hidden sm:inline">New Image</span>
    </Link>
  );
}