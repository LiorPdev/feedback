'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAdminSongsReport, getAdminFeedbacksReport, getAdminUsersReport, getAdminLogsReport, getAdminTopRatedReport, deleteAdminFeedback, deleteAdminSong } from '@/app/actions/admin';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2, Heart, MessageSquare } from 'lucide-react';
import styles from './reports.module.css';

type ReportType = 'songs' | 'feedbacks' | 'users' | 'logs' | 'top-rated';

interface SortHeaderProps {
    label: string;
    sortKey: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
}

const SortHeader = ({ label, sortKey, sortConfig, onSort }: SortHeaderProps) => {
    const isActive = sortConfig?.key === sortKey;
    return (
        <th
            className={styles.sortable}
            onClick={() => onSort(sortKey)}
            title={`מיין לפי ${label}`}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px' }}>
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
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const canDelete = reportType === 'songs' || reportType === 'feedbacks';

    const handleDelete = async () => {
        if (!selectedId || !canDelete) return;

        const confirmMsg = reportType === 'songs'
            ? "האם אתה בטוח שברצונך למחוק את השיר? פעולה זו תמחק גם את כל הפידבקים והלוגים הקשורים אליו."
            : "האם אתה בטוח שברצונך למחוק את הפידבק?";

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        let result;
        if (reportType === 'songs') {
            result = await deleteAdminSong(selectedId);
        } else {
            result = await deleteAdminFeedback(selectedId);
        }

        if (result.success) {
            setSelectedId(null);
            // Re-fetch data
            await fetchData();
        } else {
            alert(result.error || "מחיקה נכשלה");
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

    return (
        <>
            <div className={styles.controls}>
                <select
                    className={styles.select}
                    value={reportType}
                    onChange={(e) => {
                        setReportType(e.target.value as ReportType);
                        setSelectedId(null);
                    }}
                >
                    <option value="users">משתמשים רשומים</option>
                    <option value="songs">שירים</option>
                    <option value="feedbacks">פידבקים</option>
                    <option value="top-rated">לפי דירוג</option>
                    <option value="logs">לוגים</option>
                </select>

                {canDelete && selectedId && (
                    <button
                        className={styles.trashBtn}
                        onClick={handleDelete}
                        title="מחק שורה נבחרת"
                    >
                        <Trash2 size={20} />
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
                                    <th className={styles.checkboxCol}></th>
                                    <SortHeader label="תאריך העלאה" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם השיר" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="משתמש" sortKey="creatorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="טוקנים" sortKey="creatorTokens" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="פידבק אחרון" sortKey="lastFeedbackAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="#פידבקים" sortKey="feedbackCount" sortConfig={sortConfig} onSort={handleSort} />
                                    <th style={{ width: '80px', textAlign: 'center' }}>לשיר</th>
                                </tr>
                            ) : reportType === 'feedbacks' ? (
                                <tr>
                                    <th className={styles.checkboxCol}></th>
                                    <SortHeader label="תאריך" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם השיר" sortKey="songTitle" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מעלה השיר" sortKey="songCreatorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם המדרג" sortKey="authorName" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="דירוגים" sortKey="overall" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="לייק" sortKey="isLiked" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="הערה" sortKey="comment" sortConfig={sortConfig} onSort={handleSort} />
                                    <th style={{ width: '80px', textAlign: 'center' }}>לשיר</th>
                                </tr>
                            ) : reportType === 'top-rated' ? (
                                <tr>
                                    <th style={{ width: '50px' }}>#</th>
                                    <SortHeader label="שם השיר" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="דירוגים" sortKey="numRatings" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ממוצע גולמי" sortKey="rawAvg" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="משקל (v)" sortKey="weightedV" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="סכום משוקלל" sortKey="weightedSum" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="Bayesian" sortKey="bayesianAvg" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="התיישנות" sortKey="decay" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="ציון סופי" sortKey="finalScore" sortConfig={sortConfig} onSort={handleSort} />
                                    <th style={{ width: '80px', textAlign: 'center' }}>לשיר</th>
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
                            ) : (
                                <tr>
                                    <SortHeader label="תאריך" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="הודעה" sortKey="message" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מידע" sortKey="data" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="מקור" sortKey="source" sortConfig={sortConfig} onSort={handleSort} />
                                    <SortHeader label="שם משתמש" sortKey="userName" sortConfig={sortConfig} onSort={handleSort} />
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {sortedData.map((item) => (
                                <tr
                                    key={item.id}
                                    className={selectedId === item.id ? styles.selected : ''}
                                    onClick={() => canDelete && setSelectedId(selectedId === item.id ? null : item.id)}
                                    style={{ cursor: canDelete ? 'pointer' : 'default' }}
                                >
                                    {reportType === 'songs' && (
                                        <>
                                            <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedId === item.id}
                                                    onChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
                                                />
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.title}</td>
                                            <td>{item.creatorName || item.creatorEmail}</td>
                                            <td style={{ textAlign: 'center' }}>{item.creatorTokens}</td>
                                            <td>{item.lastFeedbackAt ? formatDate(item.lastFeedbackAt) : '-'}</td>
                                            <td style={{ textAlign: 'center' }}>{item.feedbackCount}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <a
                                                    href={`/give-feedback/${item.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.feedbackBtn}
                                                    title="תן פידבק"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MessageSquare size={18} />
                                                </a>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'feedbacks' && (
                                        <>
                                            <td className={styles.checkboxCol} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.checkbox}
                                                    checked={selectedId === item.id}
                                                    onChange={() => setSelectedId(selectedId === item.id ? null : item.id)}
                                                />
                                            </td>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.songTitle}</td>
                                            <td>
                                                <div className={styles.maxWidthCol} title={item.songCreatorName || item.songCreatorEmail}>
                                                    {item.songCreatorName || item.songCreatorEmail}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.maxWidthCol} title={item.authorName || item.authorEmail}>
                                                    {item.authorName || item.authorEmail}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.ratings}>
                                                    <span>ציון לשיר:{item.overall}</span>
                                                    <span>הפקה:{item.cat2}</span>
                                                    <span>שירה:{item.cat3}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.isLiked ? (
                                                    <Heart size={18} fill="#ef4444" color="#ef4444" />
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', opacity: 0.3 }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className={styles.comment} title={item.comment}>
                                                    {item.comment}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <a
                                                    href={`/give-feedback/${item.songSlug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.feedbackBtn}
                                                    title="תן פידבק"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MessageSquare size={18} />
                                                </a>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'top-rated' && (
                                        <>
                                            <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{data.indexOf(item) + 1}</td>
                                            <td>{item.title}</td>
                                            <td>{item.numRatings}</td>
                                            <td>{typeof item.rawAvg === 'number' ? item.rawAvg.toFixed(3) : item.rawAvg}</td>
                                            <td>{typeof item.weightedV === 'number' ? item.weightedV.toFixed(2) : item.weightedV}</td>
                                            <td>{typeof item.weightedSum === 'number' ? item.weightedSum.toFixed(2) : item.weightedSum}</td>
                                            <td>{typeof item.bayesianAvg === 'number' ? item.bayesianAvg.toFixed(3) : item.bayesianAvg}</td>
                                            <td>{typeof item.decay === 'number' ? item.decay.toFixed(3) : item.decay}</td>
                                            <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                                {typeof item.finalScore === 'number' ? item.finalScore.toFixed(4) : item.finalScore}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <a
                                                    href={`/give-feedback/${item.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.feedbackBtn}
                                                    title="תן פידבק"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MessageSquare size={18} />
                                                </a>
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
                                    {reportType === 'logs' && (
                                        <>
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
