"use client";

import { useState } from "react";
import UserPreferencesModal from "@/components/UserPreferencesModal";
import styles from "./DashboardTitle.module.css";

export default function DashboardTitle({ name }: { name: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className={styles.titleBtn} onClick={() => setIsOpen(true)}>
        {name}
      </button>
      <UserPreferencesModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
