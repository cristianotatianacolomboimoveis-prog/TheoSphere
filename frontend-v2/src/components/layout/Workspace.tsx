"use client";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useState } from "react";
import { X, Columns, Rows, Maximize2, ChevronDown, MoreVertical } from "lucide-react";

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
  rightTitle = "Estudo de Palavras"
}: WorkspaceProps) {
  const [activeTabs, setActiveTabs] = useState({
    left: leftTitle,
    middle: middleTitle,
    right: rightTitle
  });

  return (
    <div className="w-full h-full bg-[#DDE2E8] dark:bg-[#12161B] flex flex-col overflow-hidden">
      
      <PanelGroup direction="horizontal" className="flex-grow">
        {/* Pane 1: Primary Content */}
        <Panel defaultSize={40} minSize={20} className="flex flex-col bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10">
          <PaneTabHeader title={activeTabs.left} />
          <div className="flex-grow overflow-hidden relative">
            {leftPane}
          </div>
        </Panel>
        
        <PanelResizeHandle className="w-1.5 hover:bg-blue-500/20 transition-colors cursor-col-resize flex items-center justify-center">
            <div className="w-[1px] h-full bg-gray-300 dark:bg-white/10" />
        </PanelResizeHandle>
        
        {/* Panes 2 & 3: Supporting Content */}
        <Panel defaultSize={60} minSize={20}>
          <PanelGroup direction="vertical">
            {/* Top Right Pane */}
            <Panel defaultSize={50} minSize={20} className="flex flex-col bg-white dark:bg-[#0D1117] border-b border-gray-300 dark:border-white/10">
              <PaneTabHeader title={activeTabs.middle} />
              <div className="flex-grow overflow-hidden">
                {rightPane}
              </div>
            </Panel>

            <PanelResizeHandle className="h-1.5 hover:bg-blue-500/20 transition-colors cursor-row-resize flex items-center justify-center">
                <div className="h-[1px] w-full bg-gray-300 dark:bg-white/10" />
            </PanelResizeHandle>

            {/* Bottom Right Pane */}
            <Panel defaultSize={50} minSize={20} className="flex flex-col bg-white dark:bg-[#0D1117]">
              <PaneTabHeader title={activeTabs.right} />
              <div className="flex-grow overflow-hidden">
                {bottomPane}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Logos Status Bar */}
      <div className="h-6 bg-[#E8EBF0] dark:bg-[#1E252B] border-t border-gray-300 dark:border-white/10 flex items-center px-4 justify-between">
         <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
            <span>Pronto</span>
            <div className="w-px h-3 bg-gray-300 dark:bg-white/10" />
            <span>Versão: 2.1.0-Logos</span>
         </div>
         <div className="flex items-center gap-4 text-[10px] text-gray-500 font-medium">
            <span>Latência: 45ms</span>
         </div>
      </div>
    </div>
  );
}

function PaneTabHeader({ title }: { title: string }) {
  return (
    <div className="h-8 bg-[#F3F5F7] dark:bg-[#1E252B] border-b border-gray-300 dark:border-white/10 flex items-center px-1 justify-between select-none">
      <div className="flex h-full items-end">
        <div className="h-full px-4 flex items-center gap-2 bg-white dark:bg-[#0D1117] border-r border-gray-300 dark:border-white/10 relative">
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">{title}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
          {/* Active indicator line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600" />
        </div>
        <div className="h-full px-3 flex items-center hover:bg-gray-200 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <span className="text-[11px] text-gray-400">+</span>
        </div>
      </div>
      <div className="flex items-center gap-1 pr-2">
        <button className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 rounded">
            <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 rounded">
            <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
