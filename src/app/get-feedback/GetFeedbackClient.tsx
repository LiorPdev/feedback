"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { createSong, getURLMetadata, searchYouTubeVideos } from "@/app/actions/songs";
import { getPresignedUploadUrl } from "@/app/actions/upload";
import { logAction } from "@/app/actions/logs";
import { isYouTubeUrl, isShortsUrl, isPlaylistUrl, SONG_VALIDATION_MESSAGES, validateSongUrl } from "@/lib/song-validation";
import { useRouter } from "next/navigation";
import styles from "./get-feedback.module.css";
import { GENRES, SONG_SUBMISSION_COST, MAX_FILE_SIZE, MAX_FILE_SIZE_MB, MAX_SONG_NAME_LENGTH, MIN_SONG_DURATION_SECONDS } from "@/lib/constants";
import RegistrationGate from "@/components/RegistrationGate";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import PopupMsg from "@/components/PopupMsg";
import { useUtmMode } from "@/hooks/useUtmMode";
import PlayButton from "@/components/PlayButton";

interface GetFeedbackProps {
  backHome?: boolean;
  isLoggedIn: boolean;
  initialHasSongs: boolean;
  initialTokens: number;
}

export default function GetFeedback({
  backHome = false,
  isLoggedIn,
  initialHasSongs,
  initialTokens
}: GetFeedbackProps) {
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [fewWords, setFewWords] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showTokenLink, setShowTokenLink] = useState(false);
  const [hasSongs] = useState(initialHasSongs);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [submissionType, setSubmissionType] = useState<"link" | "upload">("link");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [lastFetchedLink, setLastFetchedLink] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [youtubeAlternative, setYoutubeAlternative] = useState<{ url: string, title: string } | null>(null);
  const [searchResults, setSearchResults] = useState<{ id: string, url: string, title: string, thumbnail: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [songDuration, setSongDuration] = useState<number>(0);
  const [isShorts, setIsShorts] = useState(false);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (songTitle) {
      const el = document.querySelector(`input[placeholder="איך שיר נולד..."]`) as HTMLInputElement;
      if (el) el.setCustomValidity("");
    }
  }, [songTitle]);

  useEffect(() => {
    if (selectedGenre) {
      const el = document.querySelector(`select`) as HTMLSelectElement;
      if (el) el.setCustomValidity("");
    }
  }, [selectedGenre]);

  useEffect(() => {
    if (songLink) {
      const el = document.querySelector(`input[placeholder="קישור מיוטיוב או הקלידו טקסט לחיפוש"]`) as HTMLInputElement;
      if (el) el.setCustomValidity("");
      setIsShorts(isShortsUrl(songLink));
      setIsPlaylist(isPlaylistUrl(songLink));
    } else {
      setIsShorts(false);
      setIsPlaylist(false);
    }
  }, [songLink]);

  const { isUtmMode: isGuestEligible, isLoaded: isUtmLoaded } = useUtmMode();
  const isCheckingGuest = !isUtmLoaded;

  useEffect(() => {
    if (isLoggedIn && initialTokens < SONG_SUBMISSION_COST) {
      router.push('/give-feedback?insufficient_credits=true');
    }
  }, [isLoggedIn, initialTokens, router]);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Basic URL validation
      if (!songLink || !songLink.includes("://") || songLink.length < 10) {
        setLinkError("");
        return;
      }
      if (submissionType !== "link") return;
      if (songLink === lastFetchedLink) return;

      setIsFetchingMetadata(true);
      try {
        const result = await getURLMetadata(songLink) as { success: boolean, title?: string, resolvedUrl?: string, error?: string };
        if (result.success && result.title) {
          setSongTitle(result.title.substring(0, MAX_SONG_NAME_LENGTH));
          setLastFetchedLink(songLink);
          setErrorMessage(""); // Clear any previous error
          setLinkError("");

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
        } else if (result.error) {
          setLinkError(result.error);
          setSongTitle("");
          setLastFetchedLink(songLink);
        }
      } catch (error) {
        await logAction({
          message: "Metadata fetch error",
          data: error instanceof Error ? { message: error.message, name: error.name } : error,
          source: "get-feedback/page.tsx:fetchMetadata"
        });
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
  const isSupportedLink = songLink.trim() !== "" && isYouTubeUrl(songLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn && !isGuestEligible) {
      setErrorMessage("עליך להיות מחובר כדי לשלוח שיר");
      return;
    }

    if (!isLoggedIn && !guestEmail) {
      setErrorMessage("יש להזין אימייל ליצירת קשר");
      return;
    }

    if (!isLoggedIn && guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setErrorMessage("כתובת המייל שרשמת אינה תקינה");
      return;
    }

    if (!songTitle) {
      setErrorMessage("יש להזין את שם השיר");
      return;
    }
    if (!selectedGenre) {
      setErrorMessage("יש לבחור סגנון לשיר");
      return;
    }
    if (submissionType === "link" && !songLink) {
      setErrorMessage("יש להדביק קישור לשיר");
      return;
    }
    if (submissionType === "upload" && !songFile) {
      setErrorMessage("יש לבחור קובץ להעלאה");
      return;
    }

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

    // Pre-submit validation
    if (submissionType === "link") {
      const validation = validateSongUrl(finalUrl);
      if (!validation.success) {
        setIsShorts(isShortsUrl(finalUrl));
        setIsPlaylist(isPlaylistUrl(finalUrl));
        // If it's a generic validation error not covered by shorts/playlist boxes, show it in errorMessage
        if (!isShortsUrl(finalUrl) && !isPlaylistUrl(finalUrl)) {
          setErrorMessage(validation.error || "קישור לא תקין");
        }
        setStatus("idle");
        return;
      }
    }

    if (submissionType === "upload" && songFile) {
      if (fileError) {
        setErrorMessage(fileError);
        setStatus("idle");
        return;
      }

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
        await logAction({
          message: "Upload error",
          data: err instanceof Error ? { message: err.message, name: err.name } : err,
          source: "get-feedback/page.tsx:handleSubmit"
        });
        setErrorMessage("חלה שגיאה בהעלאת הקובץ. נסו שוב.");
        setStatus("idle");
        return;
      }
    }

    const formData = new FormData();
    formData.append("url", finalUrl);
    formData.append("title", songTitle);
    formData.append("genre", selectedGenre);
    if (!isGuestEligible && fewWords) {
      formData.append("fewWords", fewWords);
    }
    if (submissionType === "upload") {
      formData.append("duration", songDuration.toString());
    }
    if (!isLoggedIn && guestEmail) {
      formData.append("guestEmail", guestEmail);
    }

    try {
      const result = await createSong(formData);
      if (result.success && result.song) {
        const dest = backHome ? "/dashboard?backHome=true" : "/dashboard";
        router.push(dest);
      } else if (result.error === "AUTH_REQUIRED") {
        setShowAuthGate(true);
        setStatus("idle");
      } else {
        setErrorMessage(result.error || "שגיאה בביצוע הפעולה");
        if ((result as { type?: string }).type === 'insufficient_tokens') {
          setShowTokenLink(true);
        }
        setStatus("idle");
      }
    } catch (error) {
      await logAction({
        message: "Unexpected submission error",
        data: error instanceof Error ? { message: error.message, name: error.name } : error,
        source: "get-feedback/page.tsx:handleSubmit"
      });
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
        <PageHeader
          title="הוספת שיר"
          showBack
          backUrl={backHome ? "/" : undefined}
        />

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="submissionType"
                  className={styles.radioInput}
                  checked={submissionType === "link"}
                  onChange={() => {
                    if (submissionType !== "link") {
                      setSubmissionType("link");
                      setSongTitle("");
                      setSongLink("");
                      setLinkError("");
                      setYoutubeAlternative(null);
                    }
                  }}
                />
                קישור לשיר
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="submissionType"
                  className={styles.radioInput}
                  checked={submissionType === "upload"}
                  onChange={() => {
                    if (submissionType !== "upload") {
                      setSubmissionType("upload");
                      setSongTitle("");
                      setSongFile(null);
                      setFileError("");
                    }
                  }}
                />
                העלאת שיר
              </label>
            </div>

            {submissionType === "link" ? (
              <>
                <div className={styles.linkRow}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="קישור מיוטיוב או הקלידו טקסט לחיפוש"
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
                          setYoutubeAlternative(null);
                        }
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowDropdown(true);
                      }}
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("אנא הזינו קישור או חפשו את שם השיר")}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                      required={submissionType === "link"}
                    />
                    {(isFetchingMetadata || isSearching) && !isSupportedLink && (
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
                                setSongTitle(result.title.substring(0, MAX_SONG_NAME_LENGTH));
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
                  {submissionType === "link" && isSupportedLink && !isFetchingMetadata && !isSearching && (
                    <div className={styles.playButtonInInput}>
                      <PlayButton url={songLink} size={42} />
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {linkError && !isShorts && !isPlaylist && isSupportedLink && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={styles.errorMsg}
                      style={{ marginTop: '0.5rem', textAlign: 'right' }}
                    >
                      {linkError}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(songLink.trim() !== "" && isPotentialLink && !isSupportedLink) || isShorts || isPlaylist ? (
                    <motion.div
                      className={`${styles.infoWarning} ${(isShorts || isPlaylist || !isSupportedLink) ? styles.infoWarningError : ""}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p className={styles.infoMsg}>
                        {isShorts ? SONG_VALIDATION_MESSAGES.NO_SHORTS :
                          isPlaylist ? SONG_VALIDATION_MESSAGES.NO_PLAYLIST :
                            SONG_VALIDATION_MESSAGES.ONLY_YOUTUBE}
                      </p>

                      {songLink.includes("spotify.com") && youtubeAlternative && !isShorts && !isPlaylist && (
                        <div className={styles.youtubeAlternative}>
                          <p>מצאנו גרסה אפשרית של השיר ביוטיוב:</p>
                          <div className={styles.alternativeCard}>
                            <span className={styles.alternativeTitle}>{youtubeAlternative.title}</span>
                            <div className={styles.suggestionActions}>
                              <Button
                                type="button"
                                variant="primary"
                                size="md"
                                onClick={() => {
                                  setSongLink(youtubeAlternative.url);
                                  if (!songTitle) setSongTitle(youtubeAlternative.title.substring(0, MAX_SONG_NAME_LENGTH));
                                  setYoutubeAlternative(null);
                                }}
                              >
                                החלפה ליוטיוב
                              </Button>
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
                  ) : null}
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      setSongFile(file);
                      if (file && file.size > MAX_FILE_SIZE) {
                        setFileError(`קובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)`);
                        await logAction({ message: "File too large upload attempt", data: { size: file.size }, source: "get-feedback/page.tsx:fileUpload" });
                      } else if (file) {
                        setFileError("");
                        // Capture duration
                        const audio = new Audio();
                        audio.src = URL.createObjectURL(file);
                        audio.onloadedmetadata = () => {
                          const duration = Math.floor(audio.duration);
                          setSongDuration(duration);
                          if (duration < MIN_SONG_DURATION_SECONDS) {
                            setFileError(SONG_VALIDATION_MESSAGES.MIN_DURATION(MIN_SONG_DURATION_SECONDS));
                          }
                          URL.revokeObjectURL(audio.src);
                        };
                      } else {
                        setFileError("");
                        setSongDuration(0);
                      }
                    }}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("אנא בחרו קובץ MP3 להעלאה")}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
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

          <div style={{ height: "20px" }}></div>
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
              placeholder="איך שיר נולד..."
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value.substring(0, MAX_SONG_NAME_LENGTH))}
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("אנא הזינו את שם השיר")}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
              required
              maxLength={MAX_SONG_NAME_LENGTH}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.genreGroup}`}>
            <label className={styles.label}>סגנון</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity("אנא בחרו סגנון מהרשימה")}
                onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity("")}
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

          {!isGuestEligible && (
            <>
              <div style={{ height: "20px" }}></div>
              <div className={styles.formGroup}>
                <label className={styles.label}>כמה מילים על השיר (אופציונלי)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="למשל: אשמח להתייחסות לסאונד של השירה, או האם הפזמון מספיק קליט.."
                  value={fewWords}
                  onChange={(e) => setFewWords(e.target.value.substring(0, 70))}
                  rows={2}
                  maxLength={70}
                />
              </div>
            </>
          )}

          {/* Guest Email Field - Moved here and styled normally */}
          {!isLoggedIn && isGuestEligible && (
            <>
              <div style={{ height: "20px" }}></div>
              <div className={styles.formGroup}>
                <label className={styles.label}>אימייל</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="mymail@gmail.com"
                  value={guestEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGuestEmail(val);
                    const target = e.target;
                    target.setCustomValidity("");
                    if (val && !target.checkValidity()) {
                      target.setCustomValidity("כתובת המייל שהזנת אינה תקינה (חסרה @)");
                    }
                  }}
                  onInvalid={(e) => {
                    const target = e.target as HTMLInputElement;
                    if (target.validity.valueMissing) {
                      target.setCustomValidity("בלי זיהוי כלשהו, אין לנו שום דרך לשייך אליך את השיר.");
                    } else if (target.validity.typeMismatch) {
                      target.setCustomValidity("כתובת המייל שהזנת אינה תקינה");
                    }
                  }}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  required={!isLoggedIn && isGuestEligible}
                />
                <p className={styles.tipText}>
                  למה? בלי זיהוי כלשהו, אין לנו דרך לשייך אליך את השיר ולשלוח את התגובות מהקהילה.
                </p>
              </div>
            </>
          )}

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => router.push(hasSongs ? (backHome ? "/dashboard?backHome=true" : "/dashboard") : "/")}
              disabled={status === "loading"}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={status === "loading"}
              disabled={status === "loading"}
              onMouseEnter={() => window.dispatchEvent(new CustomEvent("star-hover-start"))}
              onMouseLeave={() => window.dispatchEvent(new CustomEvent("star-hover-end"))}
              onTouchStart={() => window.dispatchEvent(new CustomEvent("star-hover-start"))}
              onTouchEnd={() => window.dispatchEvent(new CustomEvent("star-hover-end"))}
            >
              שליחה
            </Button>
          </div>

          <AnimatePresence>
            {errorMessage && errorMessage !== "EMAIL_EXISTS" && (
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
                    {i < arr.length - 1 && <Coins size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />}
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

          <PopupMsg
            isOpen={errorMessage === "EMAIL_EXISTS"}
            onClose={() => {
              setErrorMessage("");
              setCopied(false);
            }}
            title="המייל הזה כבר קיים במערכת"
            message={
              <div style={{ textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem' }}>כדי להתחבר למערכת יש להכנס לאתר דרך הדפדפן ולא דרך מודעת הפרסום.</p>
                <div
                  onClick={() => {
                    navigator.clipboard.writeText("https://feedback.activitywiz.com");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  style={{
                    color: 'var(--brand-primary)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    margin: '1.5rem 0',
                    display: 'block',
                    direction: 'ltr'
                  }}
                >
                  {copied ? "הכתובת הועתקה" : "feedback.activitywiz.com"}
                </div>
              </div>
            }
            buttonText=""
            onPrimaryClick={() => { }}
          />
        </form>
      </motion.div>
      <RegistrationGate
        isOpen={(!isLoggedIn && !isCheckingGuest && !isGuestEligible) || showAuthGate}
        type="get-feedback"
        forceShowForm={showAuthGate}
        onClose={() => {
          if (showAuthGate) {
            setShowAuthGate(false);
          } else {
            window.location.href = "/";
          }
        }}
      />
    </div>
  );
}
