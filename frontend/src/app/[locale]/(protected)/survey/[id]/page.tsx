import { getAllSurveysStatic } from '@/lib/api';
import SurveyVoteClient from '@/components/SurveyVoteClient';

type SupportedLocale = 'he' | 'en' | 'fr' | 'yi';

export async function generateStaticParams() {
    const surveys = await getAllSurveysStatic();
    const locales: SupportedLocale[] = ['he', 'en', 'fr', 'yi'];

    const params = [];
    for (const locale of locales) {
        for (const survey of surveys) {
            params.push({ locale, id: survey.id.toString() });
        }
    }
    return params;
}

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <SurveyVoteClient surveyId={Number(id)} />;
}
