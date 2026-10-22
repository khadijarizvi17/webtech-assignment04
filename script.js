
(() => {
    "use strict";

    const STORAGE_KEY = "webtech_assignment04_markdown_slides";

    const DEFAULT_MARKDOWN = `# Markdown Slides
## Welcome to my presentation

Create slides using Markdown.

- Edit your slides
- Preview changes instantly
- Save your presentation

---

# How to Create Slides
## Use three dashes

Write your slide content and then add:

\`\`\`md
---
\`\`\`

Everything after the separator becomes the next slide.

---

# Keyboard Shortcuts
## Navigate easily

- Left Arrow: Previous slide
- Right Arrow: Next slide
- F11: Full screen
- Ctrl + S: Save presentation

---

# Thank You!
## Presentation completed`;

    const $ = (id) => document.getElementById(id);

    const input = $("markdownInput");
    const editorScreen = $("editorScreen");
    const presentationScreen = $("presentationScreen");
    const previewSlide = $("previewSlide");
    const presentationSlide = $("presentationSlide");

    let slides = [];
    let currentSlide = 0;
    let presenting = false;
    let toastTimer;

    // Convert special HTML characters into safe text.
    function escapeHtml(value) {
        return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // Convert inline Markdown formatting into HTML.
    function inlineMarkdown(text) {
        let safe = escapeHtml(text);

        safe = safe.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );

        safe = safe.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

        safe = safe.replace(
            /\*(.+?)\*/g,
            "<em>$1</em>"
        );

        safe = safe.replace(
            /~~(.+?)~~/g,
            "<del>$1</del>"
        );

        safe = safe.replace(
            /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        return safe;
    }

    // Render Markdown headings, paragraphs, lists and code blocks.
    function renderMarkdown(markdown) {
        const lines = markdown
            .replace(/\r\n?/g, "\n")
            .split("\n");

        const out = [];
        let paragraph = [];
        let listType = null;
        let inCode = false;
        let codeLines = [];

        function flushParagraph() {
            if (paragraph.length) {
                out.push(
                    `<p>${inlineMarkdown(paragraph.join(" "))}</p>`
                );
                paragraph = [];
            }
        }

        function closeList() {
            if (listType) {
                out.push(`</${listType}>`);
                listType = null;
            }
        }

        for (const line of lines) {

            // Handle fenced code blocks.
            if (/^\s*```/.test(line)) {
                flushParagraph();
                closeList();

                if (inCode) {
                    out.push(
                        `<pre><code>${escapeHtml(
                            codeLines.join("\n")
                        )}</code></pre>`
                    );

                    codeLines = [];
                    inCode = false;
                } else {
                    inCode = true;
                }

                continue;
            }

            if (inCode) {
                codeLines.push(line);
                continue;
            }

            // Handle empty lines.
            if (/^\s*$/.test(line)) {
                flushParagraph();
                closeList();
                continue;
            }

            // Handle headings from # to ######.
            const heading = line.match(
                /^\s*(#{1,6})\s+(.+)$/
            );

            if (heading) {
                flushParagraph();
                closeList();

                const level = heading[1].length;

                out.push(
                    `<h${level}>${inlineMarkdown(
                        heading[2].trim()
                    )}</h${level}>`
                );

                continue;
            }

            // Handle horizontal rules.
            if (
                /^\s*---+\s*$/.test(line) ||
                /^\s*\*\*\*\s*$/.test(line) ||
                /^\s*___\s*$/.test(line)
            ) {
                flushParagraph();
                closeList();
                out.push("<hr>");
                continue;
            }

            // Handle blockquotes.
            const quote = line.match(/^\s*>\s?(.*)$/);

            if (quote) {
                flushParagraph();
                closeList();

                out.push(
                    `<blockquote><p>${inlineMarkdown(
                        quote[1]
                    )}</p></blockquote>`
                );

                continue;
            }

            // Handle unordered and ordered lists.
            const unordered = line.match(
                /^\s*[-*+]\s+(.+)$/
            );

            const ordered = line.match(
                /^\s*\d+[.)]\s+(.+)$/
            );

            if (unordered || ordered) {
                flushParagraph();

                const wantedType = unordered ? "ul" : "ol";

                if (listType !== wantedType) {
                    closeList();
                    out.push(`<${wantedType}>`);
                    listType = wantedType;
                }

                out.push(
                    `<li>${inlineMarkdown(
                        (unordered || ordered)[1]
                    )}</li>`
                );

                continue;
            }

            closeList();
            paragraph.push(line.trim());
        }

        flushParagraph();
        closeList();

        // Close a code block if the user forgot its ending fence.
        if (inCode) {
            out.push(
                `<pre><code>${escapeHtml(
                    codeLines.join("\n")
                )}</code></pre>`
            );
        }

        return out.join("\n") ||
            "<p>This slide is empty. Add Markdown in the editor.</p>";
    }

    // Split one Markdown presentation into separate slides.
    function splitSlides(markdown) {
        return markdown
            .replace(/\r\n?/g, "\n")
            .split(/^\s*---+\s*$/m);
    }

    // Rebuild slides whenever the Markdown changes.
    function refreshSlides() {
        slides = splitSlides(input.value);

        if (currentSlide >= slides.length) {
            currentSlide = slides.length - 1;
        }

        if (currentSlide < 0) {
            currentSlide = 0;
        }

        renderCurrentSlide();
    }

    // Display the selected slide and update navigation controls.
    function renderCurrentSlide() {
        const total = Math.max(slides.length, 1);

        const content = renderMarkdown(
            slides[currentSlide] || ""
        );

        previewSlide.innerHTML = content;
        presentationSlide.innerHTML = content;

        $("previewCount").textContent =
            `${currentSlide + 1} / ${total}`;

        $("presentationCount").textContent =
            `${currentSlide + 1} / ${total}`;

        $("previewLabel").textContent =
            `Slide ${currentSlide + 1}`;

        // Disable Previous on the first slide.
        $("previewPrev").disabled = currentSlide === 0;
        $("presentPrev").disabled = currentSlide === 0;

        // Disable Next on the last slide.
        $("previewNext").disabled =
            currentSlide === total - 1;

        $("presentNext").disabled =
            currentSlide === total - 1;
    }

    // Navigate to the previous or next slide.
    function moveSlide(amount) {
        const next = currentSlide + amount;

        if (next < 0 || next >= slides.length) {
            return;
        }

        currentSlide = next;
        renderCurrentSlide();
    }

    // Show a temporary notification.
    function showToast(message) {
        const toast = $("toast");

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 1900);
    }

    // Save the Markdown presentation in browser memory.
    function saveSlides(showMessage = true) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                input.value
            );

            $("saveStatus").textContent =
                `Saved at ${new Date().toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )}`;

            if (showMessage) {
                showToast(
                    "Presentation saved in this browser."
                );
            }
        } catch (error) {
            showToast(
                "Could not save. Check browser storage settings."
            );
        }
    }

    // Load previously saved slides when the project opens.
    function loadSlides() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            input.value = saved !== null
                ? saved
                : DEFAULT_MARKDOWN;

            $("saveStatus").textContent =
                saved !== null
                    ? "Loaded saved presentation"
                    : "Sample presentation";

        } catch (error) {
            input.value = DEFAULT_MARKDOWN;

            $("saveStatus").textContent =
                "Browser storage unavailable";
        }

        refreshSlides();
    }

    // Open presentation mode.
    function startPresentation() {
        presenting = true;

        editorScreen.hidden = true;
        presentationScreen.hidden = false;

        $("presentBtn").textContent = "Presenting";

        renderCurrentSlide();
    }

    // Return to the editor.
    function stopPresentation() {
        presenting = false;

        presentationScreen.hidden = true;
        editorScreen.hidden = false;

        $("presentBtn").textContent = "Present ▶";
    }

    // Enter or exit browser full-screen mode.
    async function toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                const target = presenting
                    ? presentationScreen
                    : $("previewSlide").closest(".preview-panel");

                await target.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            showToast(
                "Full screen is not available in this browser."
            );
        }

        updateFullscreenLabels();
    }

    // Update full-screen button text.
    function updateFullscreenLabels() {
        const isFullscreen =
            Boolean(document.fullscreenElement);

        const label = isFullscreen
            ? "⛶ Exit full screen"
            : "⛶ Full screen";

        $("previewFullscreen").textContent = label;
        $("presentationFullscreen").textContent = label;
    }

    // Previous and Next buttons for both screens.
    $("previewPrev").addEventListener(
        "click",
        () => moveSlide(-1)
    );

    $("previewNext").addEventListener(
        "click",
        () => moveSlide(1)
    );

    $("presentPrev").addEventListener(
        "click",
        () => moveSlide(-1)
    );

    $("presentNext").addEventListener(
        "click",
        () => moveSlide(1)
    );

    // Full-screen buttons.
    $("previewFullscreen").addEventListener(
        "click",
        toggleFullscreen
    );

    $("presentationFullscreen").addEventListener(
        "click",
        toggleFullscreen
    );

    // Presentation mode buttons.
    $("presentBtn").addEventListener(
        "click",
        startPresentation
    );

    $("exitPresentBtn").addEventListener(
        "click",
        stopPresentation
    );

    // Save button.
    $("saveBtn").addEventListener(
        "click",
        () => saveSlides(true)
    );

    // Live preview while editing Markdown.
    input.addEventListener("input", () => {
        refreshSlides();

        $("saveStatus").textContent =
            "Unsaved changes";
    });

    // Create a new presentation.
    $("newBtn").addEventListener("click", () => {
        if (
            input.value.trim() &&
            !confirm(
                "Start a new presentation? Save your current work first if you want to keep it."
            )
        ) {
            return;
        }

        input.value =
            "# New Presentation\n\n" +
            "Write your first slide here.\n\n" +
            "---\n\n" +
            "# Second Slide\n\n" +
            "Add more content here.";

        currentSlide = 0;

        refreshSlides();

        $("saveStatus").textContent =
            "New presentation — not saved";
    });

    // Keyboard shortcuts.
    document.addEventListener("keydown", (event) => {
        const target = event.target;
        const typingInEditor = target === input;

        // Ctrl+S or Cmd+S saves the slides.
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "s"
        ) {
            event.preventDefault();
            saveSlides(true);
            return;
        }

        // F11 toggles full-screen mode.
        if (event.key === "F11") {
            event.preventDefault();
            toggleFullscreen();
            return;
        }

        // Keep arrow keys working normally inside the editor.
        if (
            typingInEditor &&
            (
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight"
            )
        ) {
            return;
        }

        if (event.key === "ArrowLeft") {
            moveSlide(-1);
        }

        if (event.key === "ArrowRight") {
            moveSlide(1);
        }

        if (
            event.key === "Escape" &&
            presenting
        ) {
            stopPresentation();
        }
    });

    // Keep the full-screen label synchronized with browser state.
    document.addEventListener(
        "fullscreenchange",
        updateFullscreenLabels
    );

    // Preserve the latest edit when leaving the page.
    window.addEventListener("beforeunload", () => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                input.value
            );
        } catch (error) {
            // Saving may be unavailable in private or restricted storage.
        }
    });

    // Start the application.
    loadSlides();

})();
