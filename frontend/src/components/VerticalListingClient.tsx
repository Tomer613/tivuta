'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, PackageOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getProducts } from '@/lib/api';
import FilterSortSidebar, { SortOption } from '@/components/FilterSortSidebar';
import ProductTile, { Product } from '@/components/ProductTile';

interface T {
    title: string;
    subtitle: string;
    empty: string;
}

const COPY: Record<string, Record<string, T>> = {
    diamonds: {
        he: { title: 'עולם היהלומים', subtitle: 'תכשיטים ויהלומים נבחרים', empty: 'אין מוצרים להצגה כרגע' },
        en: { title: 'Diamonds World', subtitle: 'Selected jewelry and diamonds', empty: 'No products to show right now' },
        fr: { title: 'Univers Diamants', subtitle: 'Bijoux et diamants sélectionnés', empty: 'Aucun produit pour le moment' },
        yi: { title: 'דימענט וועלט', subtitle: 'אויסגעקליבענע שמוק', empty: 'נישטא קיין פראדוקטן איצט' },
    },
    cars: {
        he: { title: 'עולם הרכב', subtitle: 'דילים ברכבים חדשים ומשומשים', empty: 'אין מוצרים להצגה כרגע' },
        en: { title: 'Cars World', subtitle: 'Deals on new and used cars', empty: 'No products to show right now' },
        fr: { title: 'Univers Automobile', subtitle: "Offres sur voitures neuves et d'occasion", empty: 'Aucun produit pour le moment' },
        yi: { title: 'אויטא וועלט', subtitle: 'דילס אויף אויטאס', empty: 'נישטא קיין פראדוקטן איצט' },
    },
    insurance: {
        he: { title: 'עולם הביטוחים', subtitle: 'ביטוחי רכב, בריאות ודירה', empty: 'אין מוצרים להצגה כרגע' },
        en: { title: 'Insurance World', subtitle: 'Car, health and home insurance', empty: 'No products to show right now' },
        fr: { title: 'Univers Assurance', subtitle: 'Assurance auto, santé et habitation', empty: 'Aucun produit pour le moment' },
        yi: { title: 'אינשורענס וועלט', subtitle: 'אויטא, געזונטהייט און היים', empty: 'נישטא קיין פראדוקטן איצט' },
    },
};

export default function VerticalListingClient({ vertical, actionType }: { vertical: 'diamonds' | 'cars' | 'insurance'; actionType: 'appointment' | 'contact' }) {
    const params = useParams();
    const locale = (params?.locale as string) || 'he';
    const { token, isLoading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortOption>('newest');

    const t = (COPY[vertical] && COPY[vertical][locale]) || COPY[vertical].he;

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        getProducts(token, vertical, sort)
            .then(setProducts)
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, [token, vertical, sort]);

    if (authLoading || !token) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#d4af37]" size={36} />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#111a2f]">
            <header className="bg-[#0e1628] border-b border-[#d4af37]/20 py-16 px-8">
                <div className="max-w-7xl mx-auto text-start">
                    <h1 className="text-4xl md:text-5xl font-black text-[#f0e6d3] mb-3">{t.title}</h1>
                    <p className="text-xl text-[#f0e6d3]/60 font-light">{t.subtitle}</p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-8 flex flex-col lg:flex-row gap-12">
                <FilterSortSidebar locale={locale} sort={sort} onSortChange={setSort} />

                <div className="flex-grow">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
                        </div>
                    ) : products.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {products.map((p) => (
                                <ProductTile key={p.id} product={p} locale={locale} actionType={actionType} token={token} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-[#0e1628] rounded-[3rem] border-2 border-dashed border-[#d4af37]/20">
                            <PackageOpen size={64} className="mx-auto mb-6 text-[#f0e6d3]/30" />
                            <p className="text-[#f0e6d3]/60">{t.empty}</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
