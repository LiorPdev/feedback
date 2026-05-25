'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAdminSongsReport, getAdminFeedbacksReport, getAdminUsersReport, getAdminLogsReport, getAdminTopRatedReport, deleteAdminFeedbacks, deleteAdminSongs, deleteAdminLogs, getAdminWakeUpReport, getSongFeedbacks, generateAIFeedback, getAdminUnreadFeedbacksReport, sendUnreadReminderAction, resetSongDecay } from '@/app/actions/admin';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Heart, Copy, Meh, Check, RefreshCw, Sparkles, Code, Mail } from 'lucide-react';
import { isSongPromoted } from '@/lib/utils';
import { AI_SUMMARIZE_PROMPT } from '@/lib/ai-constants';
import styles from './reports.module.css';

type ReportType = 'songs' | 'feedbacks' | 'users' | 'logs' | 'top-rated' | 'wake-up' | 'unread-feedbacks';

interface UnreadFeedbackRow {
    id: string;
    creatorName: string;
    creatorEmail: string;
    unreadCount: number;
    userId: string;
}

interface SortHeaderProps {
    label: string;
    sortKey: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    align?: 'center' | 'left' | 'right';
}

const SortHeader = ({ label, sortKey, sortConfig, onSort, align }: SortHeaderProps) => {
    const isActive = sortConfig?.key === sortKey;
    const justify = align === 'center' ? 'center' : 'flex-start';
    return (
        <th
            className={styles.sortable}
            onClick={() => onSort(sortKey)}
            title={`מיין לפי ${label}`}
            style={align ? { textAlign: align } : undefined}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: justify, gap: '4px' }}>
                <span>{label}</span>
                <div className={`${styles.sortIcon} ${isActive ? styles.active : ''}`}>
                    {!isActive ? (
                        <ArrowUpDown size={14} opacity={0.3} />
                    ) : sortConfig.direction === 'asc' ? (
                        <ArrowUp size={14} />
                    ) : (
                        <ArrowDown size={14} />
                    )}
                </div>
            </div>
        </th>
    );
};

export function ReportsClient() {
    const [reportType, setReportType] = useState<ReportType>('users');
    const [data, setData] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedFeedbacks, setExpandedFeedbacks] = useState<{ songId: string, feedbacks: any[] } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [fetchingFeedbacks, setFetchingFeedbacks] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [copyingPrompt, setCopyingPrompt] = useState(false);

    const canDelete = reportType === 'songs' || reportType === 'feedbacks' || reportType === 'logs';

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };



    const handleDelete = async () => {
        if (selectedIds.length === 0 || !canDelete) return;

        const confirmMsg = reportType === 'songs'
            ? `האם אתה בטוח שברצונך למחוק את ${selectedIds.length} השירים שנבחרו? פעולה זו תמחק גם את כל הפידבקים והלוגים הקשורים אליהם.`
            : reportType === 'logs'
            ? `האם אתה בטוח שברצונך למחוק את ${selectedIds.length} רשומות הלוג שנבחרו?`
            : `האם אתה בטוח שברצונך למחוק את ${selectedIds.length} הפידבקים שנבחרו?`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        let result;
        if (reportType === 'songs') {
            result = await deleteAdminSongs(selectedIds);
        } else if (reportType === 'logs') {
            result = await deleteAdminLogs(selectedIds);
        } else {
            result = await deleteAdminFeedbacks(selectedIds);
        }

        if (result.success) {
            setSelectedIds([]);
            // Re-fetch data
            await fetchData();
        } else {
            alert(result.error || "מחיקה נכשלה");
            setLoading(false);
        }
    };

    const handleResetDecay = async (songId: string, songTitle: string) => {
        if (!window.confirm(`האם אתה בטוח שברצונך לאפס את ההתיישנות עבור השיר "${songTitle}"?`)) return;

        setLoading(true);
        const result = await resetSongDecay(songId);
        if (result.success) {
            await fetchData();
        } else {
            alert(result.error || "איפוס נכשל");
            setLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        let result;
        if (reportType === 'songs') {
            result = await getAdminSongsReport();
        } else if (reportType === 'feedbacks') {
            result = await getAdminFeedbacksReport();
        } else if (reportType === 'logs') {
            result = await getAdminLogsReport();
        } else if (reportType === 'top-rated') {
            result = await getAdminTopRatedReport();
            setSortConfig({ key: 'finalScore', direction: 'desc' });
        } else if (reportType === 'wake-up') {
            result = await getAdminWakeUpReport();
            setSortConfig({ key: 'lastVisit', direction: 'asc' });
        } else if (reportType === 'unread-feedbacks') {
            result = await getAdminUnreadFeedbacksReport();
        } else {
            result = await getAdminUsersReport();
        }

        if (result.success && result.data) {
            setData(result.data);
        } else {
            setData([]);
        }
        setLoading(false);
    }, [reportType]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleCopyPrompt = async () => {
        if (!expandedFeedbacks) return;
        setCopyingPrompt(true);
        const feedbacksText = expandedFeedbacks.feedbacks.map(f => f.comment).join('\n---\n');
        const fullPrompt = `${AI_SUMMARIZE_PROMPT}\n\n${feedbacksText}`;

        try {
            await navigator.clipboard.writeText(fullPrompt);
            setTimeout(() => setCopyingPrompt(false), 2000);
        } catch {
            setCopyingPrompt(false);
        }
    };

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        const sorted = [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return aValue.localeCompare(bValue, 'he', { sensitivity: 'base' });
            }

            return aValue < bValue ? -1 : 1;
        });

        return sortConfig.direction === 'desc' ? sorted.reverse() : sorted;
    }, [data, sortConfig]);

    const allIdsOnPage = useMemo(() => {
        return sortedData.map(item => item.id).filter(Boolean);
    }, [sortedData]);

    const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedIds.includes(id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            setSelectedIds(prev => {
                const uniqueNew = allIdsOnPage.filter(id => !prev.includes(id));
                return [...prev, ...uniqueNew];
            });
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jerusalem'
        }).replace(',', '');
    };

    const formatRelativeTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'היום';
        if (diffDays === 1) return 'אתמול';
        if (diffDays < 7) return `לפני ${diffDays} ימים`;
        if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
        return `לפני ${Math.floor(diffDays / 30)} חודשים`;
    };

    const handleFetchFeedbacks = async (songId: string) => {
        if (expandedFeedbacks?.songId === songId) {
            setExpandedFeedbacks(null);
            setAiFeedback(null);
            return;
        }

        setFetchingFeedbacks(true);
        setAiFeedback(null);
        const result = await getSongFeedbacks(songId);
        if (result.success && result.data) {
            setExpandedFeedbacks({ songId, feedbacks: result.data });
        }
        setFetchingFeedbacks(false);
    };

    const handleGenerateAI = async () => {
        if (!expandedFeedbacks) return;
        setGeneratingAI(true);
        const result = await generateAIFeedback(expandedFeedbacks.songId);
        if (result.success && result.data) {
            setAiFeedback(result.data);
        } else {
            alert("נכשלה יצירת פידבק AI");
        }
        setGeneratingAI(false);
    };

    const handleSendReminder = async (item: UnreadFeedbackRow) => {
        if (!window.confirm(`לשלוח מייל תזכורת ל-${item.creatorName}?`)) return;
        
        const result = await sendUnreadReminderAction({
            unreadCount: item.unreadCount,
            email: item.creatorEmail
        });

        if (result.success) {
            alert("המייל נשלח בהצלחה!");
        } else {
            alert(result.error || "שליחת המייל נכשלה");
        }
    };

    return (
        <>
            <div className={styles.controls}>
                <select
                    className={styles.select}
                    value={reportType}
                    onChange={(e) => {
                        setReportType(e.target.value as ReportType);
                        setSelectedIds([]);
                    }}
                >
                    <option value="users">משתמשים רשומים</option>
                    <option value="songs">שירים</option>
                    <option value="feedbacks">פידבקים</option>
                    <option value="top-rated">לפי דירוג</option>
                    <option value="wake-up">דוח התעוררות</option>
                    <option value="unread-feedbacks">תזכורת שיש פידבקים</option>
                    <option value="logs">לוגים</option>
                </select>

                {canDelete && selectedIds.length > 0 && (
                    <button
                        className={styles.trashBtn}
                        onClick={handleDelete}
                        title="מחק שורות נבחרות"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Trash2 size={20} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>({selectedIds.length})</span>
                    </button>
                )}
            </div>

            <div className={styles.tableWrapper}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                    </div>
                ) : data.length === 0 ? (
                    <div className={styles.noData}>אין נתונים להצגה</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            {reportType === 'songs' ? (
                                <tr>
                                    <th className={styles.checkboxCol}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <SortHeader label="תאריך העלאה" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם השיר" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מעלה השיר" sortKey="creatorEmail" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="פידבק אחרון" sortKey="lastFeedbackAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="#פידבקים" sortKey="feedbackCount" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <th style={{ width: '60px', textAlign: 'center' }}>פרסום</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>תן פידבק</th>
                                </tr>
                            ) : reportType === 'feedbacks' ? (
                                <tr>
                                    <th className={styles.checkboxCol}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <SortHeader label="תאריך" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם השיר" sortKey="songTitle" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מעלה השיר" sortKey="songCreatorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם המדרג" sortKey="authorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ציון" sortKey="overall" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="לייק" sortKey="isLiked" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <SortHeader label="נקרא" sortKey="isUnlocked" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <SortHeader label="הערה" sortKey="comment" sortConfig={sortConfig} onSort={handleSort} />
                                </tr>
                            ) : reportType === 'top-rated' ? (
                                <tr>
                                    <th style={{ width: '50px' }}>#</th>
                                    <SortHeader label="שם השיר" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="#דירוגים" sortKey="numRatings" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ממוצע נקי" sortKey="rawAvg" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ממוצע השמעה" sortKey="avgListenSeconds" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ניקוד מדרגים מצטבר" sortKey="weightedSum" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="Bayesian" sortKey="bayesianAvg" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="התיישנות" sortKey="decay" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ציון סופי" sortKey="finalScore" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <th style={{ width: '80px', textAlign: 'center' }}>תן פידבק</th>
                                </tr>
                            ) : reportType === 'users' ? (
                                <tr>
                                    <SortHeader label="מייל" sortKey="email" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="טוקנים" sortKey="tokens" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="איכות המדרג" sortKey="raterScore" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="תאריך רישום" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="כניסה אחרונה" sortKey="lastVisit" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="לאחרונה נתן פידבק" sortKey="lastFeedbackGiven" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="לאחרונה קיבל פידבק" sortKey="lastFeedbackReceived" sortConfig={sortConfig} onSort={handleSort} />
                                </tr>
                            ) : reportType === 'wake-up' ? (
                                <tr>
                                    <SortHeader label="שם משתמש" sortKey="userName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="טוקנים" sortKey="userTokens" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <SortHeader label="כניסה אחרונה" sortKey="lastVisit" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם השיר" sortKey="songTitle" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="#פידבקים" sortKey="feedbackCount" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <th style={{ width: '100px', textAlign: 'center' }}>תן פידבק</th>
                                </tr>
                            ) : reportType === 'logs' ? (
                                <tr>
                                    <th className={styles.checkboxCol}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <SortHeader label="תאריך" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="הודעה" sortKey="message" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מידע" sortKey="data" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מקור" sortKey="source" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם משתמש" sortKey="userName" sortConfig={sortConfig} onSort={handleSort} />
                                </tr>
                            ) : (
                                <tr>
                                    <SortHeader label="מעלה השיר" sortKey="creatorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="פידבקים שלא נפתחו" sortKey="unreadCount" sortConfig={sortConfig} onSort={handleSort} align="center" />
                                    <th style={{ width: '80px', textAlign: 'center' }}>שלח תזכורת</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {sortedData.map((item) => (
                                <tr
                                    key={item.id}
                                    className={selectedIds.includes(item.id) ? styles.selected : ''}
                                >
                                    {reportType === 'songs' && (
                                        <>
                                            <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                />
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>
                                                 {item.url ? (
                                                     <a
                                                         href={item.url}
                                                         target="_blank"
                                                         rel="noopener noreferrer"
                                                         style={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}
                                                         title="פתח קישור לשיר"
                                                         onClick={(e) => e.stopPropagation()}
                                                     >
                                                         {item.title}
                                                     </a>
                                                 ) : (
                                                     item.title
                                                 )}
                                             </td>
                                            <td>
                                                <div>{item.creatorName || 'ללא שם'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.creatorEmail}</div>
                                            </td>
                                            <td>{item.lastFeedbackAt ? formatDate(item.lastFeedbackAt) : '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{item.feedbackCount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isSongPromoted(item.priority, item.promotedUntil) ? (
                                                    <Check size={18} color="var(--brand-primary)" />
                                                ) : null}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className={styles.feedbackBtn}
                                                    title="העתק קישור (עוקף רישום)"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = `${window.location.origin}/give-feedback/${item.slug}?utm_source=workaround`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('הקישור הועתק לזיכרון');
                                                    }}
                                                    style={{ border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Copy size={18} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'feedbacks' && (
                                        <>
                                            <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                />
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>
                                                {item.songUrl ? (
                                                    <a
                                                        href={item.songUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit' }}
                                                        title="פתח קישור לשיר"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {item.songTitle}
                                                    </a>
                                                ) : (
                                                    item.songTitle
                                                )}
                                            </td>
                                            <td>
                                                <div>{item.songCreatorName || 'ללא שם'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.songCreatorEmail}</div>
                                            </td>
                                            <td>
                                                <div className={styles.maxWidthCol} title={item.authorName || item.authorEmail}>
                                                    {item.authorName || item.authorEmail}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.ratings}>
                                                    {item.overall}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.isLiked === 1 ? (
                                                    <Heart size={18} fill="#ef4444" color="#ef4444" />
                                                ) : item.isLiked === -1 ? (
                                                    <Meh size={18} color="#ef4444" />
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', opacity: 0.3 }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.isUnlocked ? (
                                                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>כן</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>לא</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className={styles.comment} title={item.comment}>
                                                    {item.comment}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'top-rated' && (
                                        <>
                                            <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{data.indexOf(item) + 1}</td>
                                            <td>{item.title}</td>
                                            <td>{item.numRatings}</td>
                                            <td>{typeof item.rawAvg === 'number' ? item.rawAvg.toFixed(3) : item.rawAvg}</td>
                                            <td title={`${item.avgListenSeconds} שניות`}>
                                                {typeof item.avgListenSeconds === 'number'
                                                    ? `${Math.floor(item.avgListenSeconds / 60)}:${(Math.floor(item.avgListenSeconds % 60)).toString().padStart(2, '0')}`
                                                    : item.avgListenSeconds}
                                                {typeof item.listenBonus === 'number' && item.listenBonus > 0 && (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', marginRight: '4px' }}>
                                                        (+{item.listenBonus.toFixed(2)})
                                                    </span>
                                                )}
                                            </td>
                                            <td>{typeof item.weightedSum === 'number' ? item.weightedSum.toFixed(2) : item.weightedSum}</td>
                                            <td>{typeof item.bayesianAvg === 'number' ? item.bayesianAvg.toFixed(3) : item.bayesianAvg}</td>
                                            <td
                                                title="דאבל-קליק לאיפוס התיישנות"
                                                onDoubleClick={() => handleResetDecay(item.id, item.title)}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                            >
                                                {typeof item.decay === 'number' ? item.decay.toFixed(3) : item.decay}
                                            </td>
                                            <td style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: '140px', textAlign: 'center' }}>
                                                <div>{typeof item.finalScore === 'number' ? item.finalScore.toFixed(4) : item.finalScore}</div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'normal',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '2px',
                                                    direction: 'ltr',
                                                    unicodeBidi: 'isolate',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    ({typeof item.bayesianAvg === 'number' ? item.bayesianAvg.toFixed(2) : item.bayesianAvg} +
                                                    {typeof item.listenBonus === 'number' ? item.listenBonus.toFixed(2) : item.listenBonus} -
                                                    {typeof item.decay === 'number' ? item.decay.toFixed(2) : item.decay})
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className={styles.feedbackBtn}
                                                    title="העתק קישור (עוקף רישום)"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = `${window.location.origin}/give-feedback/${item.slug}?utm_source=workaround`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('הקישור הועתק לזיכרון');
                                                    }}
                                                    style={{ border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Copy size={18} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'users' && (
                                        <>
                                            <td>{item.email}</td>
                                            <td>{item.name}</td>
                                            <td>{item.tokens}</td>
                                            <td>{typeof item.raterScore === 'number' ? item.raterScore.toFixed(1) : '-'}</td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.lastVisit ? formatDate(item.lastVisit) : '-'}</td>
                                            <td>{item.lastFeedbackGiven ? formatDate(item.lastFeedbackGiven) : '-'}</td>
                                            <td>{item.lastFeedbackReceived ? formatDate(item.lastFeedbackReceived) : '-'}</td>
                                        </>
                                    )}
                                    {reportType === 'wake-up' && (
                                        <>
                                            <td>
                                                <div style={{ fontWeight: 'bold' }}>{item.userName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.userEmail}</div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{item.userTokens}</td>
                                            <td>
                                                <div>{formatDate(item.lastVisit)}</div>
                                                <div className={styles.relativeTime}>{formatRelativeTime(item.lastVisit)}</div>
                                            </td>
                                            <td>{item.songTitle}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className={styles.feedbackCountBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFetchFeedbacks(item.songId);
                                                    }}
                                                >
                                                    {item.feedbackCount}
                                                </button>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className={styles.feedbackBtn}
                                                    title="העתק קישור (עוקף רישום)"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = `${window.location.origin}/give-feedback/${item.songSlug}?utm_source=wakeup`;
                                                        navigator.clipboard.writeText(url);
                                                        alert('הקישור הועתק לזיכרון');
                                                    }}
                                                    style={{ border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Copy size={18} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'logs' && (
                                        <>
                                            <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                />
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.message}</td>
                                            <td>
                                                <div className={styles.comment} title={item.data || ""}>
                                                    {item.data}
                                                </div>
                                            </td>
                                            <td>{item.source}</td>
                                            <td>{item.userName || item.userEmail || "מערכת"}</td>
                                        </>
                                    )}
                                    {reportType === 'unread-feedbacks' && (
                                        <>
                                            <td>
                                                <div>{item.creatorName || 'ללא שם'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.creatorEmail}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{item.unreadCount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className={styles.feedbackBtn}
                                                    title="שלח מייל תזכורת"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSendReminder(item);
                                                    }}
                                                    style={{ border: 'none', cursor: 'pointer', color: 'var(--brand-primary)' }}
                                                >
                                                    <Mail size={18} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {expandedFeedbacks && (
                <div className={styles.modalOverlay} onClick={() => { setExpandedFeedbacks(null); setAiFeedback(null); }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h3>פידבקים לשיר</h3>
                                <button
                                    className={styles.aiBtn}
                                    onClick={handleGenerateAI}
                                    disabled={generatingAI || expandedFeedbacks.feedbacks.length === 0}
                                    title="צור סיכום פידבק באמצעות AI"
                                >
                                    {generatingAI ? <RefreshCw className={styles.spinning} size={16} /> : <Sparkles size={16} />}
                                    <span>הפעל AI</span>
                                </button>
                                <button
                                    className={`${styles.aiBtn} ${styles.promptBtn}`}
                                    onClick={handleCopyPrompt}
                                    disabled={expandedFeedbacks.feedbacks.length === 0}
                                    title="העתק לזיכרון את הפרומפט המלא עבור שימוש ב-AI"
                                >
                                    {copyingPrompt ? <Check size={16} /> : <Code size={16} />}
                                    <span>פרומפט</span>
                                </button>
                            </div>
                            <button className={styles.closeBtn} onClick={() => { setExpandedFeedbacks(null); setAiFeedback(null); }}>&times;</button>
                        </div>
                        <div className={styles.modalBody}>
                            {aiFeedback && (
                                <div className={styles.aiFeedbackBox}>
                                    <div className={styles.aiFeedbackHeader}>
                                        <Sparkles size={14} />
                                        <span>פידבק מוצע (AI):</span>
                                        <button
                                            className={styles.copySmallBtn}
                                            onClick={() => {
                                                navigator.clipboard.writeText(aiFeedback);
                                                alert("הפידבק הועתק!");
                                            }}
                                            title="העתק פידבק AI"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                    <div className={styles.aiFeedbackText}>{aiFeedback}</div>
                                </div>
                            )}
                            {expandedFeedbacks.feedbacks.length === 0 ? (
                                <div className={styles.noData}>אין פידבקים לשיר זה</div>
                            ) : (
                                expandedFeedbacks.feedbacks.map((fb) => (
                                    <div key={fb.id} className={styles.feedbackItem}>
                                        <div className={styles.feedbackMeta}>
                                            <strong>{fb.authorName || fb.authorEmail}</strong>
                                            <span>{formatDate(fb.createdAt)}</span>
                                            <span className={styles.fbScore}>{fb.overall}</span>
                                        </div>
                                        <div className={styles.feedbackComment}>{fb.comment}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {fetchingFeedbacks && (
                <div className={styles.loadingOverlay}>
                    <RefreshCw className={styles.spinning} />
                </div>
            )}
        </>
    );
}
