import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '@/lib/constants';
import { ReportsClient } from '@/app/admin/reports/ReportsClient';
import styles from './reports.module.css';

export default async function AdminReportsPage() {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (email !== ADMIN_EMAIL) {
        redirect('/');
    }

    return (
        <div className={styles.container}>
            <ReportsClient />
        </div>
    );
}
