"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { createSong, getUserSongCount, getUserTokens, getURLMetadata, searchYouTubeVideos } from "@/app/actions/songs";
import { getPresignedUploadUrl } from "@/app/actions/upload";
import { logAction } from "@/app/actions/logs";
import { useRouter } from "next/navigation";
import styles from "./get-feedback.module.css";
import { GENRES, SONG_SUBMISSION_COST, MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/lib/constants";
import AuthOverlay from "@/components/AuthOverlay";
import BackButton from "@/components/BackButton";

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
  const [lastFetchedLink, setLastFetchedLink] = useState("");
  const [youtubeAlternative, setYoutubeAlternative] = useState<{ url: string, title: string } | null>(null);
  const [searchResults, setSearchResults] = useState<{ id: string, url: string, title: string, thumbnail: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    async function checkAccountStatus() {
      if (user?.id) {
        // Check song count
        const songCountResult = await getUserSongCount(user.id);
        if (songCountResult.success && songCountResult.count > 0) {
          setHasSongs(true);
        }

        // Check tokens
        const tokenResult = await getUserTokens(user.id);
        if (tokenResult.success && typeof tokenResult.tokens === 'number') {
          if (tokenResult.tokens < SONG_SUBMISSION_COST) {
            router.push('/give-feedback?insufficient_credits=true');
          }
        }
      }
    }
    checkAccountStatus();
  }, [user?.id, router]);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Basic URL validation
      if (!songLink || !songLink.includes("://") || songLink.length < 10) return;
      if (submissionType !== "link") return;
      if (songLink === lastFetchedLink) return;

      setIsFetchingMetadata(true);
      try {
        const result = await getURLMetadata(songLink) as { success: boolean, title?: string, resolvedUrl?: string };
        if (result.success && result.title) {
          setSongTitle(result.title.substring(0, 35));
          setLastFetchedLink(songLink);

          // SoundCloud resolution: if we got a better URL, use it
          if (result.resolvedUrl && result.resolvedUrl !== songLink) {
            setSongLink(result.resolvedUrl);
            setLastFetchedLink(result.resolvedUrl);
          }

          // Handle YouTube alternative (from Spotify)
          if ((result as { youtubeAlternative?: { url: string, title: string } }).youtubeAlternative) {
            setYoutubeAlternative((result as { youtubeAlternative?: { url: string, title: string } }).youtubeAlternative!);
          } else {
            setYoutubeAlternative(null);
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
  }, [songLink, submissionType, lastFetchedLink]);

  useEffect(() => {
    const performSearch = async () => {
      if (!songLink || songLink.includes("://") || songLink.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      if (submissionType !== "link") return;

      setIsSearching(true);
      setShowDropdown(true);
      try {
        const result = await searchYouTubeVideos(songLink);
        if (result.success && result.results) {
          setSearchResults(result.results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 800);
    return () => clearTimeout(timer);
  }, [songLink, submissionType]);

  const isPotentialLink = songLink.includes(".") || songLink.includes("://");

  const isSupportedLink = songLink.trim() !== "" && (
    songLink.includes("youtube.com") ||
    songLink.includes("youtu.be")
  );

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
        className={`${styles.card} ${!isSignedIn && isLoaded ? styles.blurred : ""}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <BackButton className={styles.backButton} />
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
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="הדביקו קישור מיוטיוב או הקלידו טקסט לחיפוש..."
                    value={songLink}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      setSongLink(val);
                      if (!val) {
                        setSongTitle("");
                        setYoutubeAlternative(null);
                        setSearchResults([]);
                        setShowDropdown(false);
                      } else {
                        // If link changed and we have a previous YouTube alternative, clear it
                        setYoutubeAlternative(null);
                      }
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    required={submissionType === "link"}
                    style={{ paddingLeft: isFetchingMetadata || isSearching ? '2.5rem' : '1.25rem' }}
                  />
                  {(isFetchingMetadata || isSearching) && (
                    <div className={styles.inputSpinner}>
                      <div className={styles.spinnerSmall} />
                    </div>
                  )}
                  {showDropdown && (songLink && !songLink.includes("://")) && (
                    <div className={styles.searchResultsDropdown}>
                      {isSearching && searchResults.length === 0 ? (
                        <div className={styles.searchingIndicator}>מחפש ביוטיוב...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <div
                            key={result.id}
                            className={styles.searchResultItem}
                            onClick={() => {
                              setSongLink(result.url);
                              setSongTitle(result.title.substring(0, 35));
                              setSearchResults([]);
                              setShowDropdown(false);
                            }}
                          >
                            <Image
                              src={result.thumbnail}
                              alt=""
                              className={styles.resultThumbnail}
                              width={50}
                              height={38}
                              unoptimized
                            />
                            <div className={styles.resultInfo}>
                              <span className={styles.resultTitle}>{result.title}</span>
                            </div>
                          </div>
                        ))
                      ) : !isSearching && songLink.length >= 2 && (
                        <div className={styles.searchingIndicator}>לא נמצאו תוצאות</div>
                      )}
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {songLink.trim() !== "" && isPotentialLink && !isSupportedLink && (
                    <motion.div
                      className={styles.infoWarning}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p className={styles.infoMsg}>
                        חלק מהנגנים מגבילים האזנה ממקורות חיצוניים. כדי להבטיח זמינות לכל המאזינים, יש לשתף קישורים מיוטיוב בלבד או להעלות קובץ.
                      </p>

                      {songLink.includes("spotify.com") && youtubeAlternative && (
                        <div className={styles.youtubeAlternative}>
                          <p>מצאנו גרסה אפשרית של השיר ביוטיוב:</p>
                          <div className={styles.alternativeCard}>
                            <span className={styles.alternativeTitle}>{youtubeAlternative.title}</span>
                            <div className={styles.suggestionActions}>
                              <button
                                type="button"
                                className={styles.swapBtn}
                                onClick={() => {
                                  setSongLink(youtubeAlternative.url);
                                  if (!songTitle) setSongTitle(youtubeAlternative.title.substring(0, 30));
                                  setYoutubeAlternative(null);
                                }}
                              >
                                החלפה ליוטיוב
                              </button>
                              <a
                                href={youtubeAlternative.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.previewLink}
                              >
                                בדיקה
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
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
              maxLength={22}
            />
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

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => router.push(hasSongs ? "/dashboard" : "/")}
              disabled={status === "loading"}
            >
              ביטול
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              onMouseEnter={() => window.dispatchEvent(new CustomEvent("star-hover-start"))}
              onMouseLeave={() => window.dispatchEvent(new CustomEvent("star-hover-end"))}
              onTouchStart={() => window.dispatchEvent(new CustomEvent("star-hover-start"))}
              onTouchEnd={() => window.dispatchEvent(new CustomEvent("star-hover-end"))}
              disabled={
                status === "loading" ||
                (submissionType === "link" ? (!songLink || !isSupportedLink) : (!songFile || !!fileError)) ||
                !songTitle ||
                !selectedGenre ||
                !user
              }
            >
              {status === "loading" ? (
                <div className={styles.loadingSpinner} />
              ) : (
                <>שליחה {user && <span className={styles.tokenLabel}>({SONG_SUBMISSION_COST} <Music size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> קרדיט)</span>}</>
              )}
            </button>
          </div>

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
      {!isSignedIn && isLoaded && (
        <AuthOverlay
          message={
            <>
              <strong>אנחנו יודעים, להירשם זה מבאס...</strong>{"\n\n"}
              אבל בלי זה, אין לנו דרך לשייך את השיר אליך או לשלוח לך את התגובות שהקהילה תכתוב. מתחברים בקליק אחד וממשיכים.
            </>
          }
        />
      )}
    </div>
  );
}
