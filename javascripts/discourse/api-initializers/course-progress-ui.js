import { apiInitializer } from "discourse/lib/api";

export default apiInitializer((api) => {
    api.onPageChange((url) => {
        const currentUser = api.getCurrentUser();
        if (!currentUser) return;

        // Fetch your custom server-side API
        fetch('/course-progress.json')
          .then(response => response.json())
          .then(data => {
            if (!data || !data.courses) return;

            const courses = data.courses;

            // Flatten all read topic IDs into a single global Set for lightning-fast lookups
            const allReadTopics = new Set();
            for (const catId in courses) {
                courses[catId].read_topic_ids.forEach(id => allReadTopics.add(id));
            }

            // ==========================================
            // PART 1: MAIN SIDEBAR COURSE BADGES
            // ==========================================
            const sidebarLinks = document.querySelectorAll('.sidebar-section-link-wrapper a.sidebar-section-link');

            sidebarLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('/c/')) return;

                const match = href.match(/\/c\/(?:[^\/]+\/)*(\d+)(?:\/|$)/);
                if (!match || !match[1]) return;

                const categoryId = match[1];

                // If this category is returned by our Course API
                if (courses[categoryId]) {
                    const courseInfo = courses[categoryId];
                    const readCount = courseInfo.read_count;
                    const totalCount = courseInfo.total_topics;

                    // Remove standard Discourse dots to prevent overlap
                    const standardDot = link.querySelector('.sidebar-section-link-suffix.unread, .custom-sidebar-dot');
                    if (standardDot) standardDot.remove();

                    // Find or create our custom progress badge
                    let badge = link.querySelector('.custom-sidebar-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'custom-sidebar-badge';
                        link.appendChild(badge);
                        // Add scope class so we only apply flexbox CSS to these specific links
                        link.classList.add('has-course-badge');
                    }

                    // Form the HTML: [ Read / Total ]
                    const unreadTotal = totalCount - readCount;

                    badge.innerHTML = `<span class="badge-total">${readCount}</span> <span class="badge-separator">/</span> <span class="badge-total">${totalCount}</span>`;
                }
            });

            // ==========================================
            // PART 2: DOCS (COURSE) SIDEBAR CHECKMARKS
            // ==========================================
            const docsLinks = document.querySelectorAll('.docs-sidebar-nav-link');

            docsLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('/t/')) return;

                // Extract the topic ID from the URL (handles both /t/502 and /t/slug/502)
                const match = href.match(/\/t\/(?:[^\/]+\/)*(\d+)(?:\/|$)/);
                if (!match || !match[1]) return;

                const topicId = parseInt(match[1], 10);

                let checkmark = link.querySelector('.course-lesson-completed');

                // If the user has read this specific topic ID
                if (allReadTopics.has(topicId)) {
                    if (!checkmark) {
                        checkmark = document.createElement('span');
                        checkmark.className = 'course-lesson-completed sidebar-section-link-suffix icon';
                        // Inject the native Discourse checkmark SVG
                        checkmark.innerHTML = `<svg class="fa d-icon d-icon-check svg-icon fa-width-auto svg-string" width="1em" height="1em" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><use href="#check"></use></svg>`;
                        link.appendChild(checkmark);
                        // Add scope class for CSS flexbox
                        link.classList.add('has-course-checkmark');
                    }
                } else {
                    // Remove checkmark if somehow marked unread
                    if (checkmark) {
                        checkmark.remove();
                        link.classList.remove('has-course-checkmark');
                    }
                }
            });

          })
          .catch(err => console.error("Error fetching course progress:", err));
    });
});