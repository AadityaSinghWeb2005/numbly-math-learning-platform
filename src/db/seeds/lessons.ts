import { db } from '@/db';
import { lessons } from '@/db/schema';

async function main() {
    const sampleLessons = [
        {
            title: 'Basic Addition',
            description: 'Learn the fundamentals of adding numbers together',
            duration: '10 min',
            difficulty: 'Beginner',
            orderIndex: 1,
            createdAt: new Date().toISOString(),
        },
        {
            title: 'Basic Subtraction',
            description: 'Master the basics of subtracting numbers',
            duration: '12 min',
            difficulty: 'Beginner',
            orderIndex: 2,
            createdAt: new Date().toISOString(),
        },
        {
            title: 'Multiplication Basics',
            description: 'Discover the world of multiplication and times tables',
            duration: '15 min',
            difficulty: 'Beginner',
            orderIndex: 3,
            createdAt: new Date().toISOString(),
        },
        {
            title: 'Division Fundamentals',
            description: 'Understand how to divide numbers and share quantities',
            duration: '15 min',
            difficulty: 'Intermediate',
            orderIndex: 4,
            createdAt: new Date().toISOString(),
        },
        {
            title: 'Fractions Introduction',
            description: 'Learn about parts of a whole with fractions',
            duration: '20 min',
            difficulty: 'Intermediate',
            orderIndex: 5,
            createdAt: new Date().toISOString(),
        },
        {
            title: 'Decimals and Percentages',
            description: 'Work with decimal numbers and percentage calculations',
            duration: '18 min',
            difficulty: 'Intermediate',
            orderIndex: 6,
            createdAt: new Date().toISOString(),
        },
    ];

    await db.insert(lessons).values(sampleLessons);
    
    console.log('✅ Lessons seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});