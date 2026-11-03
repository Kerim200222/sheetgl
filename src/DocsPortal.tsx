import React, { useState, useMemo } from 'react';
import { ColumnCategory, DocsPortalProps, DocSubItem, getDocThemeColors } from './docs/types';
import { buildDocSections } from './docs/sectionRegistry';
import { DocsHeader } from './docs/components/DocsHeader';
import { DocsSidebar } from './docs/components/DocsSidebar';

export type { DocsPortalProps } from './docs/types';

export const DocsPortal: React.FC<DocsPortalProps> = ({
  isDark,
  lang,
  initialSection,
  initialSectionId,
  onSectionChange,
  onToggleTheme,
  onToggleLang,
  onNavigateStudio,
  onNavigateLanding,
  onOpenStudio,
  onOpenLanding,
}) => {
  const isTR = lang === 'tr';
  const resolvedInitialSection = initialSectionId || initialSection || 'quickstart';
  const handleGoStudio = onOpenStudio || onNavigateStudio || (() => {});
  const handleGoLanding = onOpenLanding || onNavigateLanding || (() => {});

  const [activeSectionId, setActiveSectionId] = useState<string>(resolvedInitialSection);
  const [activeSubId, setActiveSubId] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [resolvedInitialSection]: true,
    columns: true,
    validation: true,
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [colCategoryFilter, setColCategoryFilter] = useState<ColumnCategory>('all');
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const nextSec = initialSectionId || initialSection;
  const [prevSecProp, setPrevSecProp] = useState<string | undefined>(nextSec);
  if (nextSec && nextSec !== prevSecProp) {
    setPrevSecProp(nextSec);
    setActiveSectionId(nextSec);
    setExpandedSections((prev) => ({ ...prev, [nextSec]: true }));
  }

  const colors = useMemo(() => getDocThemeColors(isDark), [isDark]);

  const sections = useMemo(
    () =>
      buildDocSections({
        isDark,
        isTR,
        colors,
        colCategoryFilter,
        onCategoryFilterChange: setColCategoryFilter,
      }),
    [isDark, isTR, colors, colCategoryFilter]
  );

  const visibleSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.titleTr.toLowerCase().includes(q) ||
        s.titleEn.toLowerCase().includes(q) ||
        s.subtitleTr.toLowerCase().includes(q) ||
        s.subtitleEn.toLowerCase().includes(q) ||
        s.subItems.some(
          (sub) =>
            sub.labelTr.toLowerCase().includes(q) || sub.labelEn.toLowerCase().includes(q)
        )
    );
  }, [sections, searchQuery]);

  const activeSection =
    visibleSections.find((s) => s.id === activeSectionId) ||
    visibleSections[0] ||
    sections[0];

  const currentIdx = sections.findIndex((s) => s.id === activeSection.id);
  const prevSection = currentIdx > 0 ? sections[currentIdx - 1] : null;
  const nextSection = currentIdx < sections.length - 1 ? sections[currentIdx + 1] : null;

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    setActiveSubId('');
    setExpandedSections((prev) => ({ ...prev, [id]: true }));
    setMobileSidebarOpen(false);
    onSectionChange?.(id);
    const mainEl = document.getElementById('docs-main-scroll');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleExpandSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectSubItem = (sectionId: string, sub: DocSubItem) => {
    if (activeSectionId !== sectionId) {
      setActiveSectionId(sectionId);
      onSectionChange?.(sectionId);
    }
    setActiveSubId(sub.id);
    setExpandedSections((prev) => ({ ...prev, [sectionId]: true }));
    setMobileSidebarOpen(false);
    sub.onSelect?.();
    setTimeout(() => {
      const targetEl = document.getElementById(sub.id);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        overflow: 'hidden',
      }}
    >
      <DocsHeader
        isDark={isDark}
        isTR={isTR}
        colors={colors}
        isMobile={isMobile}
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
        onGoLanding={handleGoLanding}
        onGoStudio={handleGoStudio}
        onToggleLang={onToggleLang}
        onToggleTheme={onToggleTheme}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <DocsSidebar
          sections={visibleSections}
          activeSectionId={activeSection.id}
          activeSubId={activeSubId}
          expandedSections={expandedSections}
          searchQuery={searchQuery}
          isTR={isTR}
          colors={colors}
          isMobile={isMobile}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onSearchChange={setSearchQuery}
          onSelectSection={handleSelectSection}
          onToggleExpandSection={handleToggleExpandSection}
          onSelectSubItem={handleSelectSubItem}
        />

        <main
          id="docs-main-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '18px 14px 64px' : '40px 56px 80px',
          }}
        >
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  marginBottom: 18,
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>
                  📑 {isTR ? 'Bölüm:' : 'Section:'}{' '}
                  <strong style={{ color: colors.accent }}>
                    {isTR ? activeSection.titleTr : activeSection.titleEn}
                  </strong>
                </span>
                <span style={{ color: colors.accent, fontSize: 12 }}>
                  {isTR ? 'Tüm Konular ▾' : 'All Topics ▾'}
                </span>
              </button>
            )}

            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: colors.accentBg,
                  color: colors.accent,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {isTR ? activeSection.badgeTr : activeSection.badgeEn}
              </span>
              <h1
                style={{
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: 800,
                  margin: '0 0 10px',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                {isTR ? activeSection.titleTr : activeSection.titleEn}
              </h1>
              <p style={{ fontSize: isMobile ? 14.5 : 17, color: colors.muted, margin: 0, lineHeight: 1.6 }}>
                {isTR ? activeSection.subtitleTr : activeSection.subtitleEn}
              </p>
            </div>

            <div>{activeSection.render()}</div>

            {/* Bottom Prev / Next Step Navigation */}
            <div
              style={{
                marginTop: 48,
                paddingTop: 24,
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => handleSelectSection(prevSection.id)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← {isTR ? prevSection.titleTr : prevSection.titleEn}
                </button>
              ) : (
                <div />
              )}

              {nextSection && (
                <button
                  type="button"
                  onClick={() => handleSelectSection(nextSection.id)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    border: `1px solid ${colors.accent}`,
                    backgroundColor: colors.accentBg,
                    color: colors.accent,
                    fontSize: 14.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isTR ? nextSection.titleTr : nextSection.titleEn} →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
