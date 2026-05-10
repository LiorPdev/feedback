"use client";

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Quote, Download, Smartphone, Square } from 'lucide-react';
import Button from './ui/Button';
import styles from './FeedbackShareCard.module.css';
import { logAction } from '@/app/actions/logs';

interface FeedbackShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  songTitle: string;
  comment: string;
}

type Ratio = 'story' | 'feed';

const FeedbackShareCard: React.FC<FeedbackShareCardProps> = ({ isOpen, onClose, songTitle, comment }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(0.2);
  const [isMobile, setIsMobile] = useState(false);
  const [ratio, setRatio] = useState<Ratio>('story');
  
  // Editable state
  const [editableTitle, setEditableTitle] = useState(songTitle);
  const [editableComment, setEditableComment] = useState(comment);

  // Sync state when modal opens and detect device
  useEffect(() => {
    if (isOpen) {
      setEditableTitle(songTitle);
      setEditableComment(comment);
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      setRatio('story'); // Default to story
    }
  }, [isOpen, songTitle, comment]);

  // Use layout effect to calculate scale based on the container width and height
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const updateScale = () => {
        if (containerRef.current) {
          const { offsetWidth, offsetHeight } = containerRef.current;
          if (offsetWidth === 0 || offsetHeight === 0) return;

          const targetWidth = 1080;
          const targetHeight = ratio === 'story' ? 1920 : 1080;

          const scaleW = offsetWidth / targetWidth;
          const scaleH = offsetHeight / targetHeight;
          setScale(Math.min(scaleW, scaleH));
        }
      };

      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen, ratio]);

  const handleAction = async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      const targetWidth = 1080;
      const targetHeight = ratio === 'story' ? 1920 : 1080;

      const dataUrl = await toPng(cardRef.current, {
        width: targetWidth,
        height: targetHeight,
        pixelRatio: 1,
        skipAutoScale: true,
      });

      const fileName = `feedback-${ratio}-${editableTitle.replace(/\s+/g, '-').toLowerCase()}.png`;

      // Always allow download on desktop, try share on mobile
      if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [] })) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'image/png' });

          await navigator.share({
            files: [file],
            title: `פידבק על ${editableTitle}`,
            text: `תראו איזה פידבק קיבלתי על "${editableTitle}" בפידבק ספייס!`,
          });
          return;
        } catch (shareErr) {
          await logAction({
            message: 'Web Share API failed',
            data: shareErr,
            source: 'FeedbackShareCard',
          });
        }
      }

      // Fallback or Desktop: Download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
    } catch (err) {
      await logAction({
        message: 'Feedback share generation failed',
        data: err,
        source: 'FeedbackShareCard',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.modalOverlay} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={styles.modalContent}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>

          <div className={styles.previewContainer}>
            {/* Ratio Selector */}
            <div className={styles.ratioSelector}>
              <button 
                className={`${styles.ratioBtn} ${ratio === 'story' ? styles.ratioBtnActive : ''}`}
                onClick={() => setRatio('story')}
              >
                <Smartphone size={16} />
                <span>Story (9:16)</span>
              </button>
              <button 
                className={`${styles.ratioBtn} ${ratio === 'feed' ? styles.ratioBtnActive : ''}`}
                onClick={() => setRatio('feed')}
              >
                <Square size={16} />
                <span>Feed (1:1)</span>
              </button>
            </div>

            {/* The WYSIWYG Preview using CSS Scale */}
            <div className={styles.scalingWrapper} ref={containerRef}>
              <div
                className={styles.scaledContent}
                style={{ 
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  width: 1080,
                  height: ratio === 'story' ? 1920 : 1080
                }}
              >
                <CardContent songTitle={editableTitle} comment={editableComment} ratio={ratio} />
              </div>
            </div>

            {/* Editable Fields Section */}
            <div className={styles.editSection}>
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  value={editableTitle} 
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className={styles.textInput}
                  placeholder="עריכת שם השיר..."
                />
              </div>
              <div className={styles.inputGroup}>
                <textarea 
                  value={editableComment} 
                  onChange={(e) => setEditableComment(e.target.value)}
                  className={styles.textArea}
                  placeholder="עריכת הציטוט..."
                />
              </div>
            </div>
          </div>

          <div className={styles.buttonContainer}>
            <Button
              fullWidth
              onClick={handleAction}
              isLoading={isGenerating}
              leftIcon={isMobile ? <Share2 size={18} /> : <Download size={18} />}
              size="md"
            >
              {isMobile 
                ? (ratio === 'story' ? "שתפו לסטורי" : "שתפו לפיד") 
                : (ratio === 'story' ? "הורדת תמונה לסטורי" : "הורדת תמונה לפיד")}
            </Button>
          </div>
        </motion.div>

        {/* Hidden but identical copy for image generation */}
        <div className={styles.hiddenCardWrapper}>
          <div ref={cardRef}>
            <CardContent songTitle={editableTitle} comment={editableComment} ratio={ratio} />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};

const CardContent = ({ songTitle, comment, ratio }: { songTitle: string, comment: string, ratio: Ratio }) => {
  return (
    <div className={`${styles.cardContent} ${ratio === 'feed' ? styles.cardContentSquare : ''}`}>
      {/* Waveform Texture Background */}
      <div className={styles.waveform}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="url(#waveGrad)" strokeWidth="0.8" />
          <path d="M0,60 Q25,40 50,60 T100,60" fill="none" stroke="url(#waveGrad)" strokeWidth="0.8" />
          <path d="M0,40 Q25,20 50,40 T100,40" fill="none" stroke="url(#waveGrad)" strokeWidth="0.8" />
          <path d="M0,70 Q25,50 50,70 T100,70" fill="none" stroke="url(#waveGrad)" strokeWidth="0.8" />
          <path d="M0,30 Q25,10 50,30 T100,30" fill="none" stroke="url(#waveGrad)" strokeWidth="0.8" />
        </svg>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.titleSection}>
          <p className={styles.subtitle}>מה כתבו על השיר שלי בקהילת פידבק-ספייס</p>
          <h1 className={styles.songTitle}>{songTitle}</h1>
        </div>

        <div className={styles.feedbackCard}>
          <div className={styles.quoteWrapper}>
            <Quote className={styles.quoteIcon} />
          </div>
          <p className={styles.commentText}>{comment}</p>
        </div>

        <div className={styles.cardFooter}>
          <p className={styles.joinText}>הצטרפו גם אתם אלינו לקהילה</p>
          <p className={styles.domainText}>feedback.activitywiz.com</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackShareCard;
