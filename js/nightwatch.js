(function () {
  'use strict';

  const prefersReducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* 0. Homepage opening image: continuous scroll-linked mobile lockscreen swipe-up transition */
  const opening = document.getElementById('nw-open');
  const mainContent = document.getElementById('main-content');
  if (opening && mainContent) {
    let snapTimer = null;
    let isAutoSnapping = false;

    const syncOpenProgress = function () {
      const vh = Math.max(1, window.innerHeight || 800);
      const y = Math.max(0, window.scrollY || window.pageYOffset || 0);
      const progress = Math.min(1, Math.max(0, y / (vh * 0.85)));
      const done = y >= vh - 60 ? 1 : 0;

      document.body.style.setProperty('--nw-open-progress', progress.toFixed(4));
      document.body.style.setProperty('--nw-open-done', String(done));
      document.body.classList.toggle('is-past-open', y >= vh * 0.68);
    };

    syncOpenProgress();
    window.addEventListener('scroll', syncOpenProgress, { passive: true });
    window.addEventListener('resize', syncOpenProgress);

    /* Magnetic lockscreen snap when the user stops scrolling part-way in the opening zone */
    if (!prefersReducedMotion()) {
      window.addEventListener(
        'scroll',
        function () {
          if (isAutoSnapping) return;
          if (snapTimer) clearTimeout(snapTimer);
          const vh = Math.max(1, window.innerHeight || 800);
          const y = window.scrollY || 0;
          if (y <= 4 || y >= vh - 32) return;

          snapTimer = setTimeout(function () {
            const curY = window.scrollY || 0;
            if (curY <= 4 || curY >= vh - 32) return;
            isAutoSnapping = true;
            const targetY = curY >= vh * 0.22 ? Math.max(0, vh - 28) : 0;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
            setTimeout(function () {
              isAutoSnapping = false;
            }, 480);
          }, 150);
        },
        { passive: true }
      );
    }

    const scrollBtn = document.getElementById('nw-open-scroll');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', function (event) {
        event.preventDefault();
        const vh = Math.max(1, window.innerHeight || 800);
        window.scrollTo({
          top: Math.max(0, vh - 28),
          behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
      });
    }
  }

  /* 0b. Subtle same-origin page-leave transition (restored cleanly on bfcache pageshow) */
  window.addEventListener('pageshow', function () {
    document.body.classList.remove('nw-is-leaving');
  });

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || prefersReducedMotion()) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
      return;
    }

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (_) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    event.preventDefault();
    document.body.classList.add('nw-is-leaving');
    setTimeout(function () {
      window.location.href = url.href;
    }, 140);
  });

  /* 1. Mobile nav drawer */
  const menuToggle = document.getElementById('nw-menu-toggle');
  const mobileNav = document.getElementById('nw-mobile-nav');
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      menuToggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* 2. Global search modal (/ shortcut) */
  const searchModal = document.getElementById('nw-search-modal');
  const searchOpenBtn = document.getElementById('nw-search-open');
  const searchInput = document.getElementById('nw-search-input');
  const searchResults = document.getElementById('nw-search-results');
  const searchDataEl = document.getElementById('nw-search-data');
  let postsIndex = [];

  if (searchDataEl) {
    try {
      postsIndex = JSON.parse(searchDataEl.textContent || '[]');
    } catch (_) {
      postsIndex = [];
    }
  }

  function renderSearch(query) {
    if (!searchResults) return;
    const q = (query || '').trim().toLowerCase();
    const matches = q
      ? postsIndex.filter(function (p) {
          const hay = (p.title + ' ' + p.category + ' ' + (p.tags || []).join(' ') + ' ' + p.excerpt).toLowerCase();
          return hay.indexOf(q) !== -1;
        })
      : postsIndex;

    searchResults.textContent = '';
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-search-empty';
      empty.textContent = '没有找到匹配的文章';
      searchResults.appendChild(empty);
      return;
    }

    matches.forEach(function (item) {
      const link = document.createElement('a');
      link.className = 'nw-search-item';
      link.href = item.url;

      const head = document.createElement('div');
      head.className = 'nw-search-item-head';

      const title = document.createElement('span');
      title.className = 'nw-search-item-title';
      title.textContent = item.title;

      const meta = document.createElement('span');
      meta.className = 'nw-search-item-meta';
      meta.textContent = item.category + ' · ' + item.date;

      head.appendChild(title);
      head.appendChild(meta);

      const excerpt = document.createElement('p');
      excerpt.className = 'nw-search-item-excerpt';
      excerpt.textContent = item.excerpt;

      link.appendChild(head);
      link.appendChild(excerpt);
      searchResults.appendChild(link);
    });
  }

  function openSearch() {
    if (!searchModal || !searchInput) return;
    searchModal.hidden = false;
    renderSearch(searchInput.value);
    setTimeout(function () {
      searchInput.focus();
    }, 10);
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.hidden = true;
  }

  if (searchOpenBtn) {
    searchOpenBtn.addEventListener('click', openSearch);
  }

  if (searchModal) {
    searchModal.querySelectorAll('[data-close-search]').forEach(function (el) {
      el.addEventListener('click', closeSearch);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      renderSearch(searchInput.value);
    });
  }

  document.addEventListener('keydown', function (e) {
    const tag = (e.target && e.target.tagName) || '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (e.key === '/' && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape') {
      closeSearch();
      closeLightbox();
    }
  });

  /* 3. Homepage live category tabs + inline filter */
  const filterTabs = document.querySelectorAll('.nw-filter-tab');
  const homeFilterInput = document.getElementById('nw-home-filter');
  const postListEl = document.getElementById('nw-post-list');
  const emptyStateEl = document.getElementById('nw-empty-state');

  if (postListEl && (filterTabs.length || homeFilterInput)) {
    let activeCategory = 'all';
    const cards = Array.prototype.slice.call(postListEl.querySelectorAll('.nw-post-card'));

    function applyHomeFilter() {
      const q = homeFilterInput ? homeFilterInput.value.trim().toLowerCase() : '';
      let visibleCount = 0;
      cards.forEach(function (card) {
        const cat = card.getAttribute('data-category') || '';
        const hay = card.getAttribute('data-search') || '';
        const catOk = activeCategory === 'all' || cat === activeCategory;
        const textOk = !q || hay.indexOf(q) !== -1;
        const show = catOk && textOk;
        card.hidden = !show;
        if (show) visibleCount++;
      });
      if (emptyStateEl) {
        emptyStateEl.hidden = visibleCount > 0;
      }
    }

    filterTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeCategory = tab.getAttribute('data-filter') || 'all';
        filterTabs.forEach(function (t) {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        applyHomeFilter();
      });
    });

    if (homeFilterInput) {
      homeFilterInput.addEventListener('input', applyHomeFilter);
    }
  }

  /* 4. Code blocks: horizontal scroll wrapper + language header + copy button */
  const prose = document.getElementById('nw-prose');
  if (prose) {
    prose.querySelectorAll('figure.highlight').forEach(function (fig) {
      const table = fig.querySelector('table');
      if (table && !fig.querySelector('.nw-code-scroll')) {
        const scrollWrap = document.createElement('div');
        scrollWrap.className = 'nw-code-scroll';
        table.parentNode.insertBefore(scrollWrap, table);
        scrollWrap.appendChild(table);
      }

      if (!fig.querySelector('.nw-code-bar')) {
        const classes = Array.prototype.slice.call(fig.classList);
        const lang = classes.find(function (c) { return c !== 'highlight'; }) || 'text';

        const bar = document.createElement('div');
        bar.className = 'nw-code-bar';

        const langSpan = document.createElement('span');
        langSpan.className = 'nw-code-lang';
        langSpan.textContent = lang === 'plain' ? 'text' : lang;

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'nw-copy-btn';
        copyBtn.textContent = '复制';
        copyBtn.addEventListener('click', function () {
          const codeCell = fig.querySelector('td.code pre') || fig.querySelector('pre');
          const text = codeCell ? codeCell.innerText : '';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              copyBtn.textContent = '已复制';
              copyBtn.classList.add('is-copied');
              setTimeout(function () {
                copyBtn.textContent = '复制';
                copyBtn.classList.remove('is-copied');
              }, 1500);
            });
          }
        });

        bar.appendChild(langSpan);
        bar.appendChild(copyBtn);
        fig.insertBefore(bar, fig.firstChild);
      }
    });
  }

  /* 5. Post TOC scrollspy + reading progress */
  const tocNav = document.getElementById('nw-toc-nav');
  const progressEl = document.getElementById('nw-read-progress');
  if (prose && (tocNav || progressEl)) {
    const tocLinks = tocNav ? Array.prototype.slice.call(tocNav.querySelectorAll('a')) : [];
    const headingTargets = tocLinks
      .map(function (link) {
        const href = link.getAttribute('href') || '';
        const id = decodeURIComponent(href.replace(/^#/, ''));
        const el = id ? document.getElementById(id) : null;
        return el ? { link: link, el: el } : null;
      })
      .filter(Boolean);

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;

        if (progressEl) {
          const rect = prose.getBoundingClientRect();
          const total = Math.max(1, prose.offsetHeight - window.innerHeight * 0.6);
          const passed = Math.max(0, -rect.top + 120);
          const pct = Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
          progressEl.textContent = pct + '%';
        }

        if (headingTargets.length) {
          let current = headingTargets[0];
          for (let i = 0; i < headingTargets.length; i++) {
            if (headingTargets[i].el.getBoundingClientRect().top <= 120) {
              current = headingTargets[i];
            } else {
              break;
            }
          }
          headingTargets.forEach(function (item) {
            item.link.classList.toggle('is-active', item === current);
          });
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* 6. Image lightbox for article screenshots */
  const lightbox = document.getElementById('nw-lightbox');
  const lightboxImg = document.getElementById('nw-lightbox-img');
  const lightboxClose = document.getElementById('nw-lightbox-close');

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    if (lightboxImg) lightboxImg.src = '';
  }

  if (prose && lightbox && lightboxImg) {
    prose.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('click', function () {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || '';
        lightbox.hidden = false;
      });
    });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    if (lightboxClose) {
      lightboxClose.addEventListener('click', closeLightbox);
    }
  }
})();
