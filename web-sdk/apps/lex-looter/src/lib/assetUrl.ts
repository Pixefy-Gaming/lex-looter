/** Resolve a file from the app's public static directory. */
export const assetUrl = (path: string): string => {
	const baseUrl = import.meta.env.BASE_URL;
	const normalizedPath = path.replace(/^\/+/, '');

	return `${baseUrl}${normalizedPath}`;
};
