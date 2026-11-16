import { Redirect } from '@/components/Redirect';
import { getDefaultVersion } from '@/lib/docs';

export default function DocsPage() {
	return <Redirect to={`/docs/${getDefaultVersion()}/general/welcome/`} />;
}
