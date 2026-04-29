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
            // PART 1: MAIN SIDEBAR COURSE PROGRESS
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
                    
                    // 1. Clean up existing indicators to prevent duplicates on state change
                    const standardDot = link.querySelector('.sidebar-section-link-suffix.unread, .custom-sidebar-dot');
                    const existingBadge = link.querySelector('.custom-sidebar-badge');
                    const existingCheckmark = link.querySelector('.course-lesson-completed');
                    
                    if (standardDot) standardDot.remove();
                    if (existingBadge) existingBadge.remove();
                    if (existingCheckmark) existingCheckmark.remove();
    
                    // 2. Logic: Show Checkmark if completed, otherwise show Badge
                    if (totalCount > 0 && readCount >= totalCount) {
                        
                        // Render Checkmark
                        let checkmark = document.createElement('span');
                        checkmark.className = 'course-lesson-completed sidebar-section-link-suffix icon';
                        checkmark.innerHTML = `<svg class="fa d-icon d-icon-check svg-icon fa-width-auto svg-string" width="1em" height="1em" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><use href="#check"></use></svg>`;
                        
                        link.appendChild(checkmark);
                        link.classList.add('has-course-checkmark');
                        link.classList.remove('has-course-badge');
                        
                    } else {
                        
                        // Render Number Badge
                        let badge = document.createElement('span');
                        badge.className = 'custom-sidebar-badge';
                        badge.innerHTML = `<span class="badge-total">${readCount}</span> <span class="badge-separator">/</span> <span class="badge-total">${totalCount}</span>`;
                        
                        link.appendChild(badge);
                        link.classList.add('has-course-badge'); 
                        link.classList.remove('has-course-checkmark');
                        
                    }
                }
            });
    
            // ==========================================
            // PART 2: DOCS (COURSE) SIDEBAR CHECKMARKS
            // ==========================================
            const docsLinks = document.querySelectorAll('.docs-sidebar-nav-link');
    
            docsLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('/t/')) return;
                
                // Extract the topic ID from the URL
                const match = href.match(/\/t\/(?:[^\/]+\/)*(\d+)(?:\/|$)/);
                if (!match || !match[1]) return;
                
                const topicId = parseInt(match[1], 10);
                
                let checkmark = link.querySelector('.course-lesson-completed');
                
                // If the user has read this specific topic ID
                if (allReadTopics.has(topicId)) {
                    if (!checkmark) {
                        checkmark = document.createElement('span');
                        checkmark.className = 'course-lesson-completed sidebar-section-link-suffix icon';
                        checkmark.innerHTML = `<svg class="fa d-icon d-icon-check svg-icon fa-width-auto svg-string" width="1em" height="1em" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><use href="#check"></use></svg>`;
                        link.appendChild(checkmark);
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