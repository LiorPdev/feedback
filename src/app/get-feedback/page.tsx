"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { createSong, getUserSongCount, getURLMetadata } from "@/app/actions/songs";
import { getPresignedUploadUrl } from "@/app/actions/upload";
import { logAction } from "@/app/actions/logs";
import { useRouter } from "next/navigation";
import styles from "./get-feedback.module.css";
import DashboardLink from "@/components/DashboardLink";
import { GENRES, SONG_SUBMISSION_COST, MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/lib/constants";

export default function GetFeedback() {
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showTokenLink, setShowTokenLink] = useState(false);
  const [hasSongs, setHasSongs] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [submissionType, setSubmissionType] = useState<"link" | "upload">("link");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    async function checkSongs() {
      if (user?.id) {
        const result = await getUserSongCount(user.id);
        if (result.success && result.count > 0) {
          setHasSongs(true);
        }
      }
    }
    checkSongs();
  }, [user?.id]);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Basic URL validation
      if (!songLink || !songLink.includes("://") || songLink.length < 10) return;

      // Only auto-fill if the title is currently empty
      if (songTitle || submissionType !== "link") return;

      setIsFetchingMetadata(true);
      try {
        const result = await getURLMetadata(songLink) as { success: boolean, title?: string, resolvedUrl?: string };
        if (result.success && result.title) {
          setSongTitle(result.title);

          // SoundCloud resolution: if we got a better URL, use it
          if (result.resolvedUrl && result.resolvedUrl !== songLink) {
            setSongLink(result.resolvedUrl);
          }
        }
      } catch (error) {
        await logAction({ message: "Metadata fetch error", data: error, source: "get-feedback/page.tsx:fetchMetadata" });
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    const timer = setTimeout(fetchMetadata, 1000);
    return () => clearTimeout(timer);
  }, [songLink, songTitle, submissionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setErrorMessage("עליך להיות מחובר כדי לשלוח שיר");
      return;
    }

    if (!songTitle || !selectedGenre) return;
    if (submissionType === "link" && !songLink) return;
    if (submissionType === "upload" && !songFile) return;

    setStatus("loading");
    setErrorMessage("");
    setShowTokenLink(false);

    let finalUrl = songLink;

    // Final check: resolve SoundCloud if it's still shortened
    if (submissionType === "link" && finalUrl.includes("on.soundcloud.com")) {
      try {
        const resolved = await getURLMetadata(finalUrl) as { success: boolean, resolvedUrl?: string };
        if (resolved.success && resolved.resolvedUrl) {
          finalUrl = resolved.resolvedUrl;
        }
      } catch {
        // Fallback to original link if resolution fails during submit
      }
    }

    if (submissionType === "upload" && songFile) {
      if (fileError) return;

      try {
        const { url, fileKey } = await getPresignedUploadUrl(songFile.name, songFile.type);

        const uploadRes = await fetch(url, {
          method: "PUT",
          body: songFile,
          headers: {
            "Content-Type": songFile.type,
          },
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`);
        }

        const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
        finalUrl = `${publicUrl}/${fileKey}`;
      } catch (err) {
        await logAction({ message: "Upload error", data: err, source: "get-feedback/page.tsx:handleSubmit" });
        setErrorMessage("חלה שגיאה בהעלאת הקובץ. נסו שוב.");
        setStatus("idle");
        return;
      }
    }

    const formData = new FormData();
    formData.append("url", finalUrl);
    formData.append("title", songTitle);
    formData.append("genre", selectedGenre);

    try {
      const result = await createSong(formData);
      if (result.success && result.song) {
        // Immediate redirect with the new slug for highlighting
        router.push(`/dashboard?new=${result.song.slug}`);
      } else {
        setErrorMessage(result.error || "שגיאה בביצוע הפעולה");
        if ((result as { type?: string }).type === 'insufficient_tokens') {
          setShowTokenLink(true);
        }
        setStatus("idle");
      }
    } catch (error) {
      await logAction({ message: "Unexpected submission error", data: error, source: "get-feedback/page.tsx:handleSubmit" });
      setErrorMessage("חלה שגיאה לא צפויה");
      setStatus("idle");
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link href={hasSongs ? "/dashboard" : "/"} className={styles.backButton} title={hasSongs ? "חזרה למרחב האישי" : "חזרה לדף הבית"}>
          <ArrowRight size={20} />
        </Link>
        <div className={styles.header}>
          <h1>שליחת שיר</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="submissionType"
                  className={styles.radioInput}
                  checked={submissionType === "link"}
                  onChange={() => setSubmissionType("link")}
                />
                קישור לשיר
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="submissionType"
                  className={styles.radioInput}
                  checked={submissionType === "upload"}
                  onChange={() => setSubmissionType("upload")}
                />
                העלאת שיר
              </label>
            </div>

            {submissionType === "link" ? (
              <>
                <input
                  type="url"
                  className={styles.input}
                  placeholder="הדביקו קישור מיוטיוב, ספוטיפי, סאונדקלאוד..."
                  value={songLink}
                  onChange={(e) => setSongLink(e.target.value)}
                  required={submissionType === "link"}
                />
                <AnimatePresence>
                  {songLink.includes("music.apple.com") && (
                    <motion.p
                      className={styles.errorMsg}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: '-0.25rem', fontSize: '0.875rem' }}
                    >
                      Apple Music לא נתמך. אנא השתמשו בנגנים אחרים.
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <div className={styles.fileInputContainer}>
                  <div className={`${styles.fileInput} ${songFile ? styles.fileSelected : ""}`}>
                    {songFile ? songFile.name : "בחרו קובץ MP3 או גררו לכאן"}
                  </div>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSongFile(file);
                      if (file && file.size > MAX_FILE_SIZE) {
                        setFileError(`קובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)`);
                      } else {
                        setFileError("");
                      }
                    }}
                    required={submissionType === "upload"}
                  />
                </div>
                <AnimatePresence>
                  {fileError && (
                    <motion.p
                      className={styles.errorMsg}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}
                    >
                      {fileError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.genreGroup}`}>
            <label className={styles.label}>סגנון</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                required
              >
                <option value="" disabled>בחרו סגנון...</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              שם השיר
              {isFetchingMetadata && (
                <span className={styles.fetchingIndicator}> (מחפש כותרת...)</span>
              )}
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="לדוגמא: איך שיר נולד"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={
              status === "loading" ||
              (submissionType === "link" ? !songLink : (!songFile || !!fileError)) ||
              !songTitle ||
              !selectedGenre ||
              !user ||
              (submissionType === "link" && songLink.includes("music.apple.com"))
            }
          >
            {status === "loading" ? (
              <div className={styles.loadingSpinner} />
            ) : (
              <>שליחה <span className={styles.tokenLabel}>({SONG_SUBMISSION_COST} <Music size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> קרדיט)</span></>
            )}
          </button>

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.errorMsg}
                style={{ marginTop: '1rem', textAlign: 'center' }}
              >
                {errorMessage.split('[MUSIC_ICON]').map((part, i, arr) => (
                  <Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <Music size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />}
                  </Fragment>
                ))}
                {showTokenLink && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link href="/give-feedback" style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'underline' }}>
                      לחצו כאן למעבר למתן פידבק וצבירת קרדיט
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {hasSongs && (
        <DashboardLink className={styles.dashboardLinkMargin} />
      )}
    </div>
  );
}
