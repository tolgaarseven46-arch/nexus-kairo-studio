import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Character, DroitPhysical, DroitBrain, DroitMission } from '../../types';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolSidebar, ActiveToolLayer } from './EditorToolSidebar';
import { EditorCanvasViewport } from './EditorCanvasViewport';
import { EditorBottomPanel } from './EditorBottomPanel';

interface DroitEditorViewProps {
  initialCharacter: Character;
  onSaveCharacter: (id: string, updatedData: Partial<Character>) => Promise<void>;
  onExit: () => void;
}

export const DroitEditorView: React.FC<DroitEditorViewProps> = ({
  initialCharacter,
  onSaveCharacter,
  onExit,
}) => {
  // Main Character State
  const [character, setCharacter] = useState<Character>(initialCharacter);
  const [activeTool, setActiveTool] = useState<ActiveToolLayer>('physical');

  // Interactive Viewport State (Zoom & Pan)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Real-time Preview Elements (Expression, Hair, Outfit)
  const [currentExpression, setCurrentExpression] = useState<string>('normal');
  const [hairStyle, setHairStyle] = useState<string>('Cyber Mohawk');
  const [outfitStyle, setOutfitStyle] = useState<string>('Taktik Zırh');

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>('Değişiklikler Hazır');

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<Character[]>([initialCharacter]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isHistoryUpdate = useRef(false);

  // Sync if initialCharacter changes externally
  useEffect(() => {
    setCharacter(initialCharacter);
    setHistory([initialCharacter]);
    setHistoryIndex(0);
  }, [initialCharacter.id]);

  // Helper to push state to history stack
  const updateCharacterWithHistory = useCallback((updater: (prev: Character) => Character) => {
    setCharacter((prev) => {
      const next = updater(prev);
      if (!isHistoryUpdate.current) {
        setHistory((prevHist) => {
          const newHist = prevHist.slice(0, historyIndex + 1);
          return [...newHist, next];
        });
        setHistoryIndex((prevIdx) => prevIdx + 1);
      }
      return next;
    });
  }, [historyIndex]);

  // Undo Handler
  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryUpdate.current = true;
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setCharacter(history[prevIdx]);
      setTimeout(() => {
        isHistoryUpdate.current = false;
      }, 50);
    }
  };

  // Redo Handler
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryUpdate.current = true;
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setCharacter(history[nextIdx]);
      setTimeout(() => {
        isHistoryUpdate.current = false;
      }, 50);
    }
  };

  // Save Handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCharacter(character.id, character);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedText(`Kaydedildi (${timeStr})`);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard Shortcuts Listener (1, 2, 3 for tools, Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') {
        setActiveTool('physical');
      } else if (e.key === '2') {
        setActiveTool('brain');
      } else if (e.key === '3') {
        setActiveTool('mission');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, character]);

  // Section-specific change handlers
  const handleNameChange = (name: string) => {
    updateCharacterWithHistory((prev) => ({ ...prev, name }));
  };

  const handlePhysicalChange = (updated: Partial<DroitPhysical>) => {
    updateCharacterWithHistory((prev) => ({
      ...prev,
      physical: { ...prev.physical, ...updated },
    }));
  };

  const handleBrainChange = (updated: Partial<DroitBrain>) => {
    updateCharacterWithHistory((prev) => ({
      ...prev,
      brain: { ...prev.brain, ...updated },
    }));
  };

  const handleMissionChange = (updated: Partial<DroitMission>) => {
    updateCharacterWithHistory((prev) => ({
      ...prev,
      mission: { ...prev.mission, ...updated },
    }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. TOP BAR */}
      <EditorTopBar
        droitName={character.name}
        onDroitNameChange={handleNameChange}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onExit={onExit}
        isSaving={isSaving}
        lastSavedText={lastSavedText}
        zoomLevel={zoomLevel}
        onResetView={() => {
          setZoomLevel(1.0);
          setPanOffset({ x: 0, y: 0 });
        }}
      />

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Vertical Tool Panel */}
        <EditorToolSidebar
          activeTool={activeTool}
          onSelectTool={(tool) => setActiveTool(tool)}
        />

        {/* Center Canvas & Bottom Panel Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Main Character Viewport (Center) */}
          <div className="flex-1 min-h-0 relative">
            <EditorCanvasViewport
              physical={character.physical}
              currentExpression={currentExpression}
              hairStyle={hairStyle}
              outfitStyle={outfitStyle}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              panOffset={panOffset}
              setPanOffset={setPanOffset}
            />
          </div>

          {/* Horizontal Collapsible Bottom Settings Panel */}
          <EditorBottomPanel
            activeTool={activeTool}
            character={character}
            onChangePhysical={handlePhysicalChange}
            onChangeBrain={handleBrainChange}
            onChangeMission={handleMissionChange}
            currentExpression={currentExpression}
            onChangeExpression={(exp) => setCurrentExpression(exp)}
            hairStyle={hairStyle}
            onChangeHairStyle={(st) => setHairStyle(st)}
            outfitStyle={outfitStyle}
            onChangeOutfitStyle={(outfit) => setOutfitStyle(outfit)}
          />
        </div>
      </div>
    </div>
  );
};
