'use client'

import { useState, useEffect } from 'react';
import { getAdminSongsReport, getAdminFeedbacksReport, getAdminUsersReport } from '@/app/actions/admin';
import styles from './reports.module.css';

type ReportType = 'songs' | 'feedbacks' | 'users';

export function ReportsClient() {
    const [reportType, setReportType] = useState<ReportType>('songs');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let result;
            if (reportType === 'songs') {
                result = await getAdminSongsReport();
            } else if (reportType === 'feedbacks') {
                result = await getAdminFeedbacksReport();
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
                                    <th>תאריך העלאה</th>
                                    <th>שם השיר</th>
                                    <th>משתמש</th>
                                </tr>
                            ) : reportType === 'feedbacks' ? (
                                <tr>
                                    <th>תאריך</th>
                                    <th>שם השיר</th>
                                    <th>מעלה השיר</th>
                                    <th>שם המדרג</th>
                                    <th>דירוגים</th>
                                    <th>הערה</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>תאריך רישום</th>
                                    <th>מייל</th>
                                    <th>שם</th>
                                    <th>מספר טוקנים</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {data.map((item) => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.createdAt)}</td>
                                    {reportType === 'songs' && (
                                        <>
                                            <td>{item.title}</td>
                                            <td>{item.creatorName}</td>
                                        </>
                                    )}
                                    {reportType === 'feedbacks' && (
                                        <>
                                            <td>{item.songTitle}</td>
                                            <td>{item.songCreatorName}</td>
                                            <td>{item.authorName}</td>
                                            <td>
                                                <div className={styles.ratings}>
                                                    <span>מילים:{item.lyrics}</span>
                                                    <span>לחן:{item.composition}</span>
                                                    <span>בצוע:{item.production}</span>
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
