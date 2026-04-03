'use client'

import { useState, useEffect, useMemo } from 'react';
import { getAdminSongsReport, getAdminFeedbacksReport, getAdminUsersReport, getAdminLogsReport } from '@/app/actions/admin';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './reports.module.css';

type ReportType = 'songs' | 'feedbacks' | 'users' | 'logs';

export function ReportsClient() {
    const [reportType, setReportType] = useState<ReportType>('songs');
    const [data, setData] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

    const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => {
        const isActive = sortConfig?.key === sortKey;
        return (
            <th 
                className={styles.sortable} 
                onClick={() => handleSort(sortKey)}
                title={`מיין לפי ${label}`}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
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
        const fetchData = async () => {
            setLoading(true);
            let result;
            if (reportType === 'songs') {
                result = await getAdminSongsReport();
            } else if (reportType === 'feedbacks') {
                result = await getAdminFeedbacksReport();
            } else if (reportType === 'logs') {
                result = await getAdminLogsReport();
            } else {
                result = await getAdminUsersReport();
            }

            if (result.success && result.data) {
                setData(result.data);
            } else {
                setData([]);
            }
            setLoading(false);
        };
        fetchData();
    }, [reportType]);

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
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                    <option value="feedbacks">פידבקים</option>
                    <option value="songs">שירים</option>
                    <option value="users">משתמשים רשומים</option>
                    <option value="logs">לוגים</option>
                </select>
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
                            <SortHeader label="תאריך העלאה" sortKey="createdAt" />
                            <SortHeader label="שם השיר" sortKey="title" />
                            <SortHeader label="משתמש" sortKey="creatorName" />
                        </tr>
                    ) : reportType === 'feedbacks' ? (
                        <tr>
                            <SortHeader label="תאריך" sortKey="createdAt" />
                            <SortHeader label="שם השיר" sortKey="songTitle" />
                            <SortHeader label="מעלה השיר" sortKey="songCreatorName" />
                            <SortHeader label="שם המדרג" sortKey="authorName" />
                            <SortHeader label="דירוגים" sortKey="overall" />
                            <SortHeader label="הערה" sortKey="comment" />
                        </tr>
                    ) : reportType === 'users' ? (
                        <tr>
                            <SortHeader label="מייל" sortKey="email" />
                            <SortHeader label="שם" sortKey="name" />
                            <SortHeader label="מספר טוקנים" sortKey="tokens" />
                            <SortHeader label="תאריך רישום" sortKey="createdAt" />
                            <SortHeader label="כניסה אחרונה" sortKey="lastVisit" />
                            <SortHeader label="לאחרונה נתן פידבק" sortKey="lastFeedbackGiven" />
                            <SortHeader label="לאחרונה קיבל פידבק" sortKey="lastFeedbackReceived" />
                        </tr>
                    ) : (
                        <tr>
                            <SortHeader label="תאריך" sortKey="createdAt" />
                            <SortHeader label="הודעה" sortKey="message" />
                            <SortHeader label="מידע" sortKey="data" />
                            <SortHeader label="מקור" sortKey="source" />
                            <SortHeader label="שם משתמש" sortKey="userName" />
                        </tr>
                    )}
                </thead>
                <tbody>
                    {sortedData.map((item) => (
                                <tr key={item.id}>
                                    {reportType === 'songs' && (
                                        <>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.title}</td>
                                            <td>{item.creatorName || item.creatorEmail}</td>
                                        </>
                                    )}
                                    {reportType === 'feedbacks' && (
                                        <>
                                            <td>{formatDate(item.createdAt)}</td>
                                            <td>{item.songTitle}</td>
                                            <td>{item.songCreatorName || item.songCreatorEmail}</td>
                                            <td>{item.authorName || item.authorEmail}</td>
                                            <td>
                                                <div className={styles.ratings}>
                                                    <span>הפקה:{item.cat2}</span>
                                                    <span>שירה:{item.cat3}</span>
                                                    <span>כללי:{item.overall}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.comment} title={item.comment}>
                                                    {item.comment}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    {reportType === 'users' && (
                                        <>
                                            <td>{item.email}</td>
                                            <td>{item.name}</td>
                                            <td>{item.tokens}</td>
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
