'use client';

import { useSearchParams } from 'next/navigation';
import VerticalListingClient from '@/components/VerticalListingClient';

export default function VerticalQueryPage() {
    const searchParams = useSearchParams();
    const slug = searchParams?.get('slug') || '';
    return <VerticalListingClient vertical={slug} />;
}
