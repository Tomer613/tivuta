'use client';

import { useSearchParams } from 'next/navigation';
import SurveyVoteClient from '@/components/SurveyVoteClient';

export default function SurveyQueryPage() {
    const id = Number(useSearchParams()?.get('id')) || 0;
    return <SurveyVoteClient surveyId={id} />;
}
