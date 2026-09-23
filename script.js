(() => {
  "use strict";

  // 所有核心内容和链接都可在 JavaScript 关闭时正常使用。
  const year = document.getElementById("copyright-year");
  if (year) year.textContent = String(new Date().getFullYear());

  document.querySelectorAll("[data-print-resume]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => window.print());
  });

  const toast = document.getElementById("toast");
  let toastTimer;
  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.textContent = "";
    }, 3000);
  }

  // 本地直接打开 HTML 时，兼容不提供 Clipboard API 的浏览器环境。
  function copyWithSelection(text) {
    const previousFocus = document.activeElement;
    const input = document.createElement("textarea");
    input.value = text;
    input.readOnly = true;
    input.setAttribute("aria-label", "临时复制内容");
    input.style.cssText = "position:fixed;left:-9999px;top:0;font-size:16px;";
    document.body.appendChild(input);
    try {
      input.focus({ preventScroll: true });
      input.select();
      input.setSelectionRange(0, input.value.length);
      if (!document.execCommand("copy")) throw new Error("复制不可用");
    } finally {
      input.remove();
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus({ preventScroll: true });
      }
    }
  }

  document.querySelectorAll(".copy-button").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const text = button.dataset.copy;
      if (!text) return;
      button.disabled = true;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            copyWithSelection(text);
          }
        } else {
          copyWithSelection(text);
        }
        showToast("已复制到剪贴板");
      } catch {
        showToast("暂时无法自动复制，请选中联系方式手动复制");
      } finally {
        button.disabled = false;
      }
    });
  });

  const isBlogPage = document.body.classList.contains("blog-page");
  if (isBlogPage) {
    // 通过目录或分享链接进入文章时，展开正文并定位到文章标题。
    function revealBlogArticle() {
      let articleId;
      try {
        articleId = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const article = document.getElementById(articleId);
      if (!article || !article.classList.contains("blog-post")) return;
      const content = article.querySelector(".blog-post-content");
      if (content) content.open = true;
      window.requestAnimationFrame(() => {
        article.scrollIntoView({ block: "start" });
        scheduleNavigationUpdate();
      });
    }

    document.querySelectorAll("[data-collapse-post]").forEach((button) => {
      const content = button.closest(".blog-post-content");
      const article = button.closest(".blog-post");
      if (!content || !article) return;
      button.hidden = false;
      button.addEventListener("click", () => {
        content.open = false;
        // 将焦点交回可见的展开入口，避免焦点停留在已隐藏的按钮上。
        content.querySelector("summary")?.focus({ preventScroll: true });
        window.requestAnimationFrame(() => {
          article.scrollIntoView({ block: "start" });
          scheduleNavigationUpdate();
        });
      });
    });

    window.addEventListener("hashchange", revealBlogArticle);
    document.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element
        ? event.target.closest('a[href^="#"]')
        : null;
      // 相同锚点不会再次触发 hashchange，仍允许重新展开已收起的文章。
      if (link && link.hash === window.location.hash) revealBlogArticle();
    });
    revealBlogArticle();
  }

  const links = Array.from(document.querySelectorAll(".nav-link"));
  const sections = links
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter(Boolean);
  let scrollScheduled = false;
  let activeId = "";

  function updateNavigation() {
    scrollScheduled = false;
    if (!sections.length) return;
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const offset = isMobile ? 110 : 100;
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) current = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    if (activeId === current.id) return;
    activeId = current.id;
    links.forEach((link) => {
      const isActive = link.hash === `#${activeId}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    // 只滚动目录自身，让当前文章保持可见，避免改变正文阅读位置。
    if (isBlogPage) {
      const activeLink = links.find((link) => link.hash === `#${activeId}`);
      const menu = document.querySelector(isMobile ? ".blog-navigation" : ".blog-sidebar");
      if (!activeLink || !menu) return;
      const itemBounds = activeLink.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      if (isMobile) {
        if (itemBounds.left < menuBounds.left + 16) {
          menu.scrollLeft += itemBounds.left - menuBounds.left - 16;
        } else if (itemBounds.right > menuBounds.right - 16) {
          menu.scrollLeft += itemBounds.right - menuBounds.right + 16;
        }
      } else if (itemBounds.top < menuBounds.top + 16) {
        menu.scrollTop += itemBounds.top - menuBounds.top - 16;
      } else if (itemBounds.bottom > menuBounds.bottom - 16) {
        menu.scrollTop += itemBounds.bottom - menuBounds.bottom + 16;
      }
    }
  }

  function scheduleNavigationUpdate() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(updateNavigation);
  }

  window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
  window.addEventListener("resize", scheduleNavigationUpdate);
  window.addEventListener("load", scheduleNavigationUpdate);
  if (isBlogPage) {
    // 正文展开或收起后，重新计算文章位置与当前目录项。
    document.querySelectorAll(".blog-post-content").forEach((content) => {
      content.addEventListener("toggle", scheduleNavigationUpdate);
    });
  }
  updateNavigation();
})();
