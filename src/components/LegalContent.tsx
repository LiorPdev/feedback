"use client";

import { motion } from "framer-motion";
import styles from "./LegalContent.module.css";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Section {
  title: string;
  content: string;
}

interface LegalContentProps {
  title: string;
  intro: string;
  sections: Section[];
}

export default function LegalContent({ title, intro, sections }: LegalContentProps) {
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        <ChevronRight size={20} />
        חזרה לדף הבית
      </Link>
      
      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.intro}>{intro}</p>
        
        <div className={styles.content}>
          {sections.map((section, idx) => (
            <div key={idx} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {idx + 1}. {section.title}
              </h2>
              <p className={styles.sectionContent}>{section.content}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
