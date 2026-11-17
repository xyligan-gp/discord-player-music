import { CalendarClock, Clock } from 'lucide-react';
import { siteConfig } from '@/config';

const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/** Reading time and date of the last change of a guide, shown above its text. */
export function GuideInfo({ minutes, updatedAt }: { readonly minutes: number; readonly updatedAt?: string }) {
	const { readingTime, updatedAt: showDate } = siteConfig.guideInfo;
	const date = showDate && updatedAt ? new Date(updatedAt) : undefined;
	const validDate = date && !Number.isNaN(date.getTime()) ? date : undefined;

	if (!readingTime && !validDate) return null;

	return (
		<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
			{readingTime && (
				<span className="inline-flex items-center gap-1.5">
					<Clock size={14} /> {minutes} min read
				</span>
			)}
			{validDate && (
				<span className="inline-flex items-center gap-1.5">
					<CalendarClock size={14} /> Updated <time dateTime={validDate.toISOString()}>{formatter.format(validDate)}</time>
				</span>
			)}
		</div>
	);
}
