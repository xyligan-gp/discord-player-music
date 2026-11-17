/** Settings of the website. */
export const siteConfig = {
	/** Show the "Previous" / "Next" links at the bottom of the guide pages. */
	guidePagination: true,

	/** What to show above the text of a guide page. */
	guideInfo: {
		/** Estimated reading time, like "3 min read". */
		readingTime: true,
		/** Date of the last change of the guide (from the commits of the repository, loaded when the site is built). */
		updatedAt: false,
	},
};
