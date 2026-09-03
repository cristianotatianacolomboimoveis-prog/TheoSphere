"use client";

// react-resizable-panels v4:
//   • PanelGroup        → Group
//   • PanelResizeHandle → Separator
//   • Panel             → Panel
//   • prop `direction`  → `orientation`
import { Group, Panel, Separator } from "react-resizable-panels";
import { useState, useSyncExternalStore } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useTheoStore } from "@/store/useTheoStore";
import { LayoutSwitcher } from "./LayoutSwitcher";
import { ContextualInsightsPanel } from "../reader/ContextualInsightsPanel";

/** Detecta se a viewport é mobile (<768px) — compatível com React Compiler */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSnapshotMobile() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshotMobile() {
  return false;
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    getSnapshotMobile,
    getServerSnapshotMobile,
  );
}

interface WorkspaceProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  bottomPane?: React.ReactNode;
  leftTitle?: string;
  middleTitle?: string;
  rightTitle?: string;
}

export function Workspace({
  leftPane,
  rightPane,
  bottomPane,
  leftTitle = "Texto Bíblico",
  middleTitle = "Análise Exegética",
  rightTitle = "Estudo de Palavras",
}: WorkspaceProps) {
  const { workspaceLayout, setWorkspaceLayout } = useTheoStore();
  const [maximizedPane, setMaximizedPane] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // Mobile: painéis empilhados verticalmente com tabs
  if (isMobile) {
    return (
      <MobileWorkspace
        leftPane={leftPane}
        rightPane={rightPane}
        bottomPane={bottomPane}
        leftTitle={leftTitle}
        middleTitle={middleTitle}
        rightTitle={rightTitle}
      />
    );
  }

  const toggleMaximize = (paneKey: string) => {
    setMaximizedPane((curr) => (curr === paneKey ? null : paneKey));
  };

  // Se algum painel estiver maximizado, renderiza apenas ele em tela cheia
  if (maximizedPane) {
    let content = leftPane;
    let title = leftTitle;
    if (maximizedPane === "middle") {
      content = rightPane;
      title = middleTitle;
    } else if (maximizedPane === "right") {
      content = bottomPane;
      title = rightTitle;
    } else if (maximizedPane === "copilot") {
      content = <ContextualInsightsPanel />;
      title = "Copilot Exegético";
    }

    return (
      <div className="w-full h-full bg-[#DDE2E8] dark:bg-[#12161B] flex flex-col overflow-hidden">
        <PaneTabHeader
          title={title}
          isMaximized={true}
          onToggleMaximize={() => toggleMaximize(maximizedPane)}
        />
        <div className="flex-grow overflow-hidden relative">{content}</div>
        <WorkspaceStatusBar />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#DDE2E8] dark:bg-[#12161B] flex flex-col overflow-hidden">
      {/* 1. MODO: FOCO TOTAL (SINGLE PANE) */}
      {workspaceLayout === "single" && (
        <div className="flex-grow flex flex-col overflow-hidden bg-white dark:bg-[#0D1117]">
          <PaneTabHeader
            title={leftTitle}
            isMaximized={false}
            onToggleMaximize={() => toggleMaximize("left")}
          />
          <div className="flex-grow overflow-hidden relative">{leftPane}</div>
        </div>
      )}

      {/* 2. MODO: ESTUDO PARALELO (SPLIT 50/50) */}
      {workspaceLayout === "split" && (
        <Group orientation="horizontal" className="flex-grow">
          <Panel
            defaultSize={50}
            minSize={25}
            className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10"
          >
            <PaneTabHeader
              title={leftTitle}
              isMaximized={false}
              onToggleMaximize={() => toggleMaximize("left")}
            />
            <div className="flex-grow overflow-hidden relative">{leftPane}</div>
          </Panel>

          <Separator className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
          </Separator>

          <Panel
            defaultSize={50}
            minSize={25}
            className="flex flex-col bg-white dark:bg-[#0D1117]"
          >
            <PaneTabHeader
              title={middleTitle}
              isMaximized={false}
              onToggleMaximize={() => toggleMaximize("middle")}
            />
            <div className="flex-grow overflow-hidden relative">
              {rightPane}
            </div>
          </Panel>
        </Group>
      )}

      {/* 3. MODO: BANCADA EXEGÉTICA (TRIPLE PANE - PADRÃO SUPERIOR AO LOGOS) */}
      {workspaceLayout === "triple" && (
        <Group orientation="horizontal" className="flex-grow">
          <Panel
            defaultSize={42}
            minSize={25}
            className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10"
          >
            <PaneTabHeader
              title={leftTitle}
              isMaximized={false}
              onToggleMaximize={() => toggleMaximize("left")}
            />
            <div className="flex-grow overflow-hidden relative">{leftPane}</div>
          </Panel>

          <Separator className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
          </Separator>

          <Panel defaultSize={58} minSize={25}>
            <Group orientation="vertical">
              <Panel
                defaultSize={55}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117] border-b border-gray-300 dark:border-white/10"
              >
                <PaneTabHeader
                  title={middleTitle}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("middle")}
                />
                <div className="flex-grow overflow-hidden relative">
                  {rightPane}
                </div>
              </Panel>

              <Separator className="h-1.5 hover:bg-blue-500/20 transition-colors cursor-row-resize flex items-center justify-center">
                <div className="h-[1px] w-full bg-gray-300 dark:bg-white/10" />
              </Separator>

              <Panel
                defaultSize={45}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117]"
              >
                <PaneTabHeader
                  title={rightTitle}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("right")}
                />
                <div className="flex-grow overflow-hidden relative">
                  {bottomPane}
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      )}

      {/* 4. MODO: COPILOT TEOLÓGICO IA */}
      {workspaceLayout === "copilot" && (
        <Group orientation="horizontal" className="flex-grow">
          <Panel
            defaultSize={60}
            minSize={30}
            className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10"
          >
            <PaneTabHeader
              title={leftTitle}
              isMaximized={false}
              onToggleMaximize={() => toggleMaximize("left")}
            />
            <div className="flex-grow overflow-hidden relative">{leftPane}</div>
          </Panel>

          <Separator className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
          </Separator>

          <Panel
            defaultSize={40}
            minSize={25}
            className="flex flex-col bg-white dark:bg-[#0D1117]"
          >
            <PaneTabHeader
              title="Ideias & Copilot RAG"
              isMaximized={false}
              onToggleMaximize={() => toggleMaximize("copilot")}
            />
            <div className="flex-grow overflow-hidden relative">
              <ContextualInsightsPanel />
            </div>
          </Panel>
        </Group>
      )}

      {/* 5. MODO: GRADE SINÓTICA 2X2 */}
      {workspaceLayout === "grid" && (
        <Group orientation="vertical" className="flex-grow">
          <Panel defaultSize={50} minSize={20}>
            <Group orientation="horizontal">
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10"
              >
                <PaneTabHeader
                  title={leftTitle}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("left")}
                />
                <div className="flex-grow overflow-hidden relative">
                  {leftPane}
                </div>
              </Panel>
              <Separator className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
                <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
              </Separator>
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117]"
              >
                <PaneTabHeader
                  title={middleTitle}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("middle")}
                />
                <div className="flex-grow overflow-hidden relative">
                  {rightPane}
                </div>
              </Panel>
            </Group>
          </Panel>

          <Separator className="h-1.5 hover:bg-blue-500/20 transition-colors cursor-row-resize flex items-center justify-center">
            <div className="h-[1px] w-full bg-gray-300 dark:bg-white/10" />
          </Separator>

          <Panel defaultSize={50} minSize={20}>
            <Group orientation="horizontal">
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10"
              >
                <PaneTabHeader
                  title={rightTitle}
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("right")}
                />
                <div className="flex-grow overflow-hidden relative">
                  {bottomPane}
                </div>
              </Panel>
              <Separator className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
                <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
              </Separator>
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col bg-white dark:bg-[#0D1117]"
              >
                <PaneTabHeader
                  title="Ideias & Copilot RAG"
                  isMaximized={false}
                  onToggleMaximize={() => toggleMaximize("copilot")}
                />
                <div className="flex-grow overflow-hidden relative">
                  <ContextualInsightsPanel />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      )}

      {/* Status Bar */}
      <WorkspaceStatusBar />
    </div>
  );
}

/**
 * Barra de status com alternador rápido de layouts e indicadores
 */
function WorkspaceStatusBar() {
  return (
    <div className="h-7 bg-[#E8EBF0] dark:bg-[#1E252B] border-t border-gray-300 dark:border-white/10 flex items-center px-4 justify-between select-none">
      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Pronto • Sincronizado
        </span>
        <div className="w-px h-3 bg-gray-300 dark:bg-white/10" />
        <span className="font-bold text-gray-600 dark:text-gray-400">
          Link Set A
        </span>
      </div>

      <div className="flex items-center gap-2">
        <LayoutSwitcher variant="toolbar" />
      </div>
    </div>
  );
}

/**
 * Layout mobile: tabs no topo, um painel visível por vez.
 */
function MobileWorkspace({
  leftPane,
  rightPane,
  bottomPane,
  leftTitle,
  middleTitle,
  rightTitle,
}: WorkspaceProps) {
  const tabs = [
    { key: "left", label: leftTitle, pane: leftPane },
    { key: "middle", label: middleTitle, pane: rightPane },
    ...(bottomPane
      ? [{ key: "bottom", label: rightTitle, pane: bottomPane }]
      : []),
    {
      key: "copilot",
      label: "Copilot RAG",
      pane: <ContextualInsightsPanel />,
    },
  ];
  const [activeTab, setActiveTab] = useState("left");
  const current = tabs.find((t) => t.key === activeTab) || tabs[0];

  return (
    <div className="w-full h-full bg-[#DDE2E8] dark:bg-[#12161B] flex flex-col overflow-hidden">
      {/* Mobile Tab Bar */}
      <div className="flex bg-[#F3F5F7] dark:bg-[#1E252B] border-b border-gray-300 dark:border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-0 px-3 py-2 text-[11px] font-bold truncate transition-colors relative ${
              activeTab === tab.key
                ? "text-gray-800 dark:text-white bg-white dark:bg-[#0D1117]"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Active Pane */}
      <div className="flex-grow overflow-hidden bg-white dark:bg-[#0D1117]">
        {current?.pane}
      </div>
    </div>
  );
}

/**
 * Cabeçalho do painel com título, indicador de sincronização e botão de maximizar
 */
function PaneTabHeader({
  title,
  isMaximized,
  onToggleMaximize,
}: {
  title: string;
  isMaximized: boolean;
  onToggleMaximize?: () => void;
}) {
  return (
    <div className="h-8 bg-[#F3F5F7] dark:bg-[#1E252B] border-b border-gray-300 dark:border-white/10 flex items-center justify-between px-1 select-none">
      <div className="flex h-full items-end">
        <div className="h-full px-3 flex items-center gap-2 bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10 relative">
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
            {title}
          </span>
          <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            A
          </span>
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
        </div>
      </div>

      {onToggleMaximize && (
        <button
          onClick={onToggleMaximize}
          className="p-1 mr-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title={isMaximized ? "Restaurar Painéis" : "Maximizar Painel"}
          aria-label={isMaximized ? "Restaurar Painéis" : "Maximizar Painel"}
        >
          {isMaximized ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
