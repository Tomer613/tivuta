'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';

export default function ProductQueryPage() {
    const searchParams = useSearchParams();
    const id = Number(searchParams?.get('id')) || 0;
    return <ProductDetailClient productId={id} />;
}
