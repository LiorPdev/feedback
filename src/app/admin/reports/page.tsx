import { syncUser } from '@/lib/user-auth';
import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '@/lib/constants';
import { ReportsClient } from '@/app/admin/reports/ReportsClient';
import styles from './reports.module.css';

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
    const dbUser = await syncUser();

    if (dbUser?.email !== ADMIN_EMAIL) {
        redirect('/');
    }

    return (
        <div className={styles.container}>
            <ReportsClient />
        </div>
    );
}
