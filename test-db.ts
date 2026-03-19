import { getDb } from './src/lib/db';

async function test() {
    const db = await getDb();
    try {
        await db.user.upsert({
            where: { id: 'test' },
            create: { id: 'test', email: 't@t.com', name: 'Test' },
            update: { email: 't@t.com', name: 'Test' }
        });
        console.log('Upsert user OK');
        
        await db.song.create({
            data: { url: 'u', title: 'test song', genre: 'g', slug: 's' + Date.now(), userId: 'test' }
        });
        console.log('Create song OK');
    } catch (err: any) {
        console.error('ERROR OBJECT:', err);
        console.error('ERROR MESSAGE:', err.message);
    }
}

test();
