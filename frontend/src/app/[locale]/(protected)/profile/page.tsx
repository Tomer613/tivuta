import ProfileClient from './ProfileClient';

export function generateStaticParams() {
    return [{ locale: 'he' }, { locale: 'en' }, { locale: 'fr' }, { locale: 'yi' }];
}

export default function ProfilePage() {
    return <ProfileClient />;
}
