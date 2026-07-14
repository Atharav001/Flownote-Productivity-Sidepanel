import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, signOut, isSignedIn, getStoredClientId } from './services/googleAuth.js';
import { listTaskLists, insertTask, updateTask as updateGoogleTask, toGoogleTask } from './services/googleTasks.js';
import { fullSync, deleteFromGoogle, getLastSyncTime } from './services/taskSync.js';
import SetupGuide from './components/SetupGuide.jsx';

const generateId = () => Math.random().toString(36).substr(2, 9);

const VIBRANT_COLORS = [
  '#7C3AED', '#3B82F6', '#F59E0B', '#EF4444', '#A3A3A3', 
  '#FF00FF', '#39FF14', '#00FFFF', '#FF6600',
];

function useChromeStorage(key, initialValue) {
  const [state, setState] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], (result) => {
        if (result[key] !== undefined) {
          setState(result[key]);
        }
        setIsLoaded(true);
      });
    } else {
      const localData = localStorage.getItem(key);
      if (localData) {
        try { setState(JSON.parse(localData)); } catch (e) {}
      }
      setIsLoaded(true);
    }
  }, [key]);

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(state) : value;
    setState(valueToStore);
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: valueToStore });
    } else {
      localStorage.setItem(key, JSON.stringify(valueToStore));
    }
  };

  return [state, setValue, isLoaded];
}

function App() {
  const [activeTab, setActiveTab] = useState('todos'); // todos, notes, editor, sticky-editor
  const [searchQuery, setSearchQuery] = useState('');
  
  const [todos, setTodos, todosLoaded] = useChromeStorage('flownote_todos', [
    { id: '1', title: 'Review Q3 design system updates', completed: false, priority: 'high', category: 'inbox' },
    { id: '2', title: 'Sync with engineering on sidebar constraints', completed: false, priority: 'medium', category: 'inbox' },
    { id: '3', title: 'Draft component JSON structure', completed: true, priority: 'low', category: 'today' },
  ]);

  const [categoryColors, setCategoryColors, colorsLoaded] = useChromeStorage('flownote_categoryColors', {
    inbox: '#A3A3A3', today: '#7C3AED', upcoming: '#3B82F6'
  });

  const [stickyNotes, setStickyNotes, stickyLoaded] = useChromeStorage('flownote_stickyNotes', [
    { id: '1', title: 'Redesign Sidebar UX', excerpt: 'Implement masonry layout for sticky notes.', date: 'Just now', color: '#00FFFF', tag: 'Ideas' },
  ]);

  const [longNotes, setLongNotes, longLoaded] = useChromeStorage('flownote_longNotes', [
    { id: '1', title: 'Project Kickoff', content: '<b>Goals:</b><br/><ul><li>Improve UX</li><li>Add rich text</li></ul>', date: 'Yesterday', color: '#7C3AED' }
  ]);

  const [editingNote, setEditingNote] = useState(null);
  const [editingSticky, setEditingSticky] = useState(null);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [taskLists, setTaskLists] = useState([]);
  const [selectedTaskList, setSelectedTaskList] = useChromeStorage('flownote_selectedTaskList', null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(getLastSyncTime());
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  useEffect(() => {
    const handleMessage = (request) => {
      if (request.action === 'open_quick_capture') {
        setActiveTab('editor');
        setEditingNote(null);
      }
    };
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, []);

  useEffect(() => {
    getStoredClientId().then(clientId => {
      if (!clientId) {
        setShowSetupGuide(true);
        return;
      }
      isSignedIn().then(connected => {
        if (connected) {
          setGoogleConnected(true);
          listTaskLists().then(lists => {
            setTaskLists(lists);
            if (!selectedTaskList && lists.length > 0) {
              setSelectedTaskList(lists[0]);
            }
          }).catch(() => {});
        }
      });
    });
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      await signIn();
      setGoogleConnected(true);
      setShowSetupGuide(false);
      const lists = await listTaskLists();
      setTaskLists(lists);
      if (lists.length > 0) {
        if (!selectedTaskList) setSelectedTaskList(lists[0]);
      }
      setSyncMessage({ type: 'success', text: 'Connected to Google Tasks!' });
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (e) {
      setSyncMessage({ type: 'error', text: e.message });
    }
  }, [selectedTaskList]);

  const handleGoogleSignOut = useCallback(async () => {
    try {
      await signOut();
      setGoogleConnected(false);
      setTaskLists([]);
      setSelectedTaskList(null);
      setSyncMessage({ type: 'success', text: 'Disconnected from Google Tasks.' });
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (e) {
      setSyncMessage({ type: 'error', text: e.message });
    }
  }, []);

  const handleSync = useCallback(async () => {
    if (!selectedTaskList || !googleConnected) return;
    setSyncInProgress(true);
    setSyncMessage(null);
    try {
      const result = await fullSync(selectedTaskList.id, todos, 'inbox', (msg) => {
        setSyncMessage({ type: 'info', text: msg });
      });
      setTodos(result.todos);
      setLastSyncTime(getLastSyncTime());
      setSyncMessage({
        type: 'success',
        text: `Sync complete! ${result.imported} imported, ${result.updated} updated, ${result.synced} synced.`,
      });
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (e) {
      setSyncMessage({ type: 'error', text: `Sync failed: ${e.message}` });
    } finally {
      setSyncInProgress(false);
    }
  }, [selectedTaskList, googleConnected, todos]);

  const handleClose = () => window.close();

  const handleEditLongNote = (note) => {
    setEditingNote(note);
    setActiveTab('editor');
  };

  const handleEditStickyNote = (note) => {
    setEditingSticky(note);
    setActiveTab('sticky-editor');
  };

  const saveLongNote = (note) => {
    if (editingNote) {
      setLongNotes(longNotes.map(n => n.id === editingNote.id ? { ...n, ...note } : n));
      setEditingNote(null);
    } else {
      setLongNotes([{ id: generateId(), ...note, date: 'Just now' }, ...longNotes]);
    }
    setActiveTab('notes');
  };

  const saveStickyNote = (note) => {
    if (editingSticky && editingSticky.id) {
      setStickyNotes(stickyNotes.map(n => n.id === editingSticky.id ? { ...n, ...note } : n));
    } else {
      setStickyNotes([{ id: generateId(), ...note, date: 'Just now' }, ...stickyNotes]);
    }
    setEditingSticky(null);
    setActiveTab('notes');
  };

  const filteredTodos = useMemo(() => {
    if (!searchQuery) return todos;
    const lowerQ = searchQuery.toLowerCase();
    return todos.filter(t => t.title.toLowerCase().includes(lowerQ));
  }, [todos, searchQuery]);

  const filteredSticky = useMemo(() => {
    if (!searchQuery) return stickyNotes;
    const lowerQ = searchQuery.toLowerCase();
    return stickyNotes.filter(n => n.title.toLowerCase().includes(lowerQ) || n.excerpt.toLowerCase().includes(lowerQ));
  }, [stickyNotes, searchQuery]);

  const filteredLongNotes = useMemo(() => {
    if (!searchQuery) return longNotes;
    const lowerQ = searchQuery.toLowerCase();
    return longNotes.filter(n => n.title.toLowerCase().includes(lowerQ) || n.content.toLowerCase().includes(lowerQ));
  }, [longNotes, searchQuery]);

  const isReady = todosLoaded && colorsLoaded && stickyLoaded && longLoaded;

  return (
    <div className="bg-surface-container-lowest min-h-screen flex text-on-surface font-body-main relative overflow-hidden">
      
      {/* SideNavBar */}
      <nav className="m-2 bg-surface-container-low text-primary shadow-lg flex flex-col h-[calc(100vh-16px)] w-[68px] py-4 px-2 border border-surface-variant/40 rounded-2xl items-center shrink-0 z-50">
        <div className="w-10 h-10 mb-8 flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.4)]">
          <img src="icon.png" alt="Flownote Logo" className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col gap-4 w-full items-center">
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setActiveTab('todos'); setEditingNote(null); setEditingSticky(null); }}
            className={`rounded-[14px] flex items-center justify-center w-12 h-12 transition-all duration-200 group relative border ${activeTab === 'todos' ? 'bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'text-on-surface-variant hover:bg-surface-variant/40 border-transparent hover:border-outline-variant/30'}`}
          >
            <span className="material-symbols-outlined fill">{activeTab === 'todos' ? 'fact_check' : 'checklist'}</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setActiveTab('notes'); setEditingNote(null); setEditingSticky(null); }}
            className={`rounded-[14px] flex items-center justify-center w-12 h-12 transition-all duration-200 group relative border ${activeTab === 'notes' ? 'bg-secondary/20 text-secondary border-secondary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-on-surface-variant hover:bg-surface-variant/40 border-transparent hover:border-outline-variant/30'}`}
          >
            <span className="material-symbols-outlined fill">{activeTab === 'notes' ? 'sticky_note_2' : 'note'}</span>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setActiveTab('editor'); setEditingNote(null); setEditingSticky(null); }}
            className={`rounded-[14px] flex items-center justify-center w-12 h-12 transition-all duration-200 group relative border ${activeTab === 'editor' ? 'bg-tertiary/20 text-tertiary border-tertiary shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-on-surface-variant hover:bg-surface-variant/40 border-transparent hover:border-outline-variant/30'}`}
          >
            <span className="material-symbols-outlined fill">{activeTab === 'editor' ? 'edit_document' : 'edit_square'}</span>
          </motion.button>
        </div>

        <div className="mt-auto flex flex-col gap-4 w-full items-center">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowSyncSettings(!showSyncSettings)}
            className={`rounded-[14px] flex items-center justify-center w-12 h-12 transition-all duration-200 group relative border ${googleConnected ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-on-surface-variant hover:bg-surface-variant/40 border-transparent hover:border-outline-variant/30'}`}
            title={googleConnected ? 'Google Tasks Connected' : 'Connect Google Tasks'}
          >
            <span className="material-symbols-outlined fill text-[20px]">sync</span>
            {syncInProgress && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary animate-ping"></span>
            )}
            {googleConnected && !syncInProgress && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400"></span>
            )}
          </motion.button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        
        {/* Universal Top Header */}
        <header className="h-[60px] shrink-0 border-b border-surface-variant/30 flex items-center px-4 justify-between bg-surface-container-lowest/90 backdrop-blur-md z-40">
          <div className="relative group w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container border border-surface-variant/50 rounded-full py-1.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" 
              placeholder="Search tasks, notes..." 
            />
          </div>
          <button 
            onClick={handleClose}
            className="ml-4 p-1.5 rounded-full bg-surface-container-high text-outline hover:bg-error hover:text-on-error transition-all shadow-sm border border-surface-variant hover:border-error flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </header>

        {syncMessage && (
          <div className={`px-4 py-2 text-xs font-bold text-center border-b backdrop-blur-md ${syncMessage.type === 'error' ? 'bg-error/20 text-error border-error/30' : syncMessage.type === 'info' ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 'bg-green-400/20 text-green-400 border-green-400/30'}`}>
            {syncMessage.text}
          </div>
        )}

        {showSyncSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-surface-variant/30 bg-surface-container-low/80 backdrop-blur-md"
          >
            <div className="px-4 py-3 flex flex-col gap-3">
              {!googleConnected && showSetupGuide ? (
                <SetupGuide
                  onClientIdSet={handleGoogleSignIn}
                  onBack={() => setShowSyncSettings(false)}
                />
              ) : !googleConnected ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">sync</span> Google Tasks Sync
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleGoogleSignIn}
                    className="bg-primary/20 text-primary rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-primary/30 border border-primary/30 transition-colors shadow-sm text-sm font-bold justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span> Sign in with Google
                  </motion.button>
                  <button
                    onClick={() => setShowSetupGuide(true)}
                    className="text-[10px] text-primary/70 hover:text-primary font-bold uppercase text-center"
                  >
                    Need to configure OAuth? Setup Guide →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">sync</span> Google Tasks Sync
                    </span>
                    <span className="text-[10px] font-bold text-green-400 uppercase bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/30">Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTaskList?.id || ''}
                      onChange={e => {
                        const list = taskLists.find(l => l.id === e.target.value);
                        setSelectedTaskList(list);
                      }}
                      className="flex-1 bg-surface-container border border-surface-variant/50 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                    >
                      {taskLists.map(list => (
                        <option key={list.id} value={list.id}>{list.title}</option>
                      ))}
                    </select>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={handleSync}
                      disabled={syncInProgress}
                      className="bg-primary/20 text-primary rounded-xl px-3 py-2 flex items-center gap-1 hover:bg-primary/30 border border-primary/30 transition-colors shadow-sm text-sm font-bold disabled:opacity-40"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${syncInProgress ? 'animate-spin' : ''}`}>sync</span>
                      Sync
                    </motion.button>
                  </div>
                  <div className="flex items-center justify-between">
                    {lastSyncTime && (
                      <span className="text-[10px] text-outline font-bold">Last sync: {new Date(lastSyncTime).toLocaleString()}</span>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSetupGuide(true)}
                        className="text-[10px] text-primary/70 hover:text-primary font-bold uppercase"
                      >
                        Settings
                      </button>
                      <button
                        onClick={handleGoogleSignOut}
                        className="text-[10px] text-error/70 hover:text-error font-bold uppercase"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {isReady && (
            <AnimatePresence mode="wait">
              {activeTab === 'todos' && <motion.div key="todos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full"><TodosView todos={filteredTodos} setTodos={setTodos} categoryColors={categoryColors} setCategoryColors={setCategoryColors} googleConnected={googleConnected} selectedTaskList={selectedTaskList} syncInProgress={syncInProgress} /></motion.div>}
              {activeTab === 'notes' && <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full"><NotesView stickyNotes={filteredSticky} longNotes={filteredLongNotes} setStickyNotes={setStickyNotes} setLongNotes={setLongNotes} onEditLongNote={handleEditLongNote} onEditStickyNote={handleEditStickyNote} /></motion.div>}
              {activeTab === 'editor' && <motion.div key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full"><RichEditorView note={editingNote} onSaveNote={saveLongNote} onCancel={() => { setEditingNote(null); setActiveTab('notes'); }} /></motion.div>}
              {activeTab === 'sticky-editor' && <motion.div key="sticky-editor" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full"><StickyEditorView note={editingSticky} onSave={saveStickyNote} /></motion.div>}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

function ColorPicker({ selectedColor, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="w-5 h-5 rounded-full border-[2px] border-surface-variant shadow-md hover:scale-110 transition-transform relative z-[51]" style={{ backgroundColor: selectedColor }}></button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }}></div>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute top-8 left-0 z-50 bg-[#1A1A1A] border border-surface-variant rounded-xl p-3 flex gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex-wrap w-[140px] origin-top-left animate-in fade-in zoom-in-95 duration-200"
          >
            {VIBRANT_COLORS.map(c => (
              <button key={c} onClick={(e) => { e.stopPropagation(); onChange(c); setOpen(false); }} className={`w-6 h-6 rounded-full hover:scale-125 hover:z-10 transition-transform shadow-sm ${selectedColor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#1A1A1A] scale-110' : ''}`} style={{ backgroundColor: c }}></button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Todos View
// -----------------------------------------------------------------------------

function TodoItem({ todo, updateTodo, deleteTodo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const inputRef = useRef(null);

  const priorityColors = { high: 'bg-error', medium: 'bg-tertiary', low: 'bg-outline-variant' };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() !== '') updateTodo(todo.id, { title: editTitle.trim() });
    else setEditTitle(todo.title);
    setIsEditing(false);
  };

  const toggleComplete = (e) => {
    e.stopPropagation();
    updateTodo(todo.id, { completed: !todo.completed });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, scale: 0.9 }}
      whileHover={{ scale: 1.01 }}
      className={`min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl group transition-all duration-200 hover:shadow-md border ${todo.completed ? 'opacity-40 bg-black/10 border-transparent grayscale-[50%]' : 'bg-black/20 border-transparent hover:bg-black/40 hover:border-white/10'}`}
    >
      <div className="p-1 -m-1 cursor-pointer" onClick={toggleComplete}>
        <button 
          className={`w-[22px] h-[22px] rounded-md border-[2px] flex items-center justify-center transition-all shrink-0 ${todo.completed ? 'border-primary bg-primary text-on-primary scale-110' : 'border-outline hover:border-primary bg-transparent'}`}
        >
          {todo.completed && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
        </button>
      </div>
      
      {isEditing ? (
        <input 
          ref={inputRef} value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={handleSave}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditTitle(todo.title); setIsEditing(false); } }}
          onClick={e => e.stopPropagation()}
          className="bg-background border border-primary/50 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary font-body-main text-body-main flex-1 w-full text-on-surface shadow-inner"
        />
      ) : (
        <span 
          onClick={() => { if (!todo.completed) setIsEditing(true); }}
          className={`cursor-text font-body-main text-body-main flex-1 w-full leading-snug break-words py-1 ${todo.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
        >
          {todo.title}
        </span>
      )}

      {!todo.completed && !isEditing && (
        <button 
          onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { priority: todo.priority === 'low' ? 'medium' : todo.priority === 'medium' ? 'high' : 'low' }); }} 
          className="p-1 hover:bg-surface-variant rounded-xl border border-transparent hover:border-outline-variant/30 flex items-center justify-center"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[todo.priority]} shrink-0 shadow-sm`}></div>
        </button>
      )}
      
      <button 
        onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} 
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/20 hover:text-error text-on-surface-variant transition-all flex items-center justify-center rounded-xl"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
      </button>
    </motion.div>
  );
}

function TodosView({ todos, setTodos, categoryColors, setCategoryColors, googleConnected, selectedTaskList, syncInProgress }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('today');
  
  const handleAdd = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      const newTodo = { id: generateId(), title: newTaskTitle.trim(), completed: false, priority: 'low', category: selectedCategory };
      if (googleConnected && selectedTaskList) {
        try {
          const created = await insertTask(selectedTaskList.id, toGoogleTask(newTodo));
          newTodo.googleTaskId = created.id;
        } catch (err) {
          console.warn('Failed to push new task to Google:', err);
        }
      }
      setTodos([...todos, newTodo]);
      setNewTaskTitle('');
    }
  };

  const updateTodo = async (id, updates) => {
    const todo = todos.find(t => t.id === id);
    const updated = { ...todo, ...updates };
    setTodos(todos.map(t => t.id === id ? updated : t));
    if (googleConnected && selectedTaskList && updated.googleTaskId) {
      try {
        await updateGoogleTask(selectedTaskList.id, updated.googleTaskId, toGoogleTask(updated));
      } catch (err) {
        console.warn('Failed to update task in Google:', err);
      }
    }
  };

  const deleteTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    setTodos(todos.filter(t => t.id !== id));
    if (googleConnected && selectedTaskList && todo?.googleTaskId) {
      try {
        await deleteFromGoogle(selectedTaskList.id, todo.googleTaskId);
      } catch (err) {
        console.warn('Failed to delete task from Google:', err);
      }
    }
  };

  const renderCategoryBlock = (catKey, label) => {
    const catTodos = todos.filter(t => t.category === catKey && !t.completed);
    const color = categoryColors[catKey];
    
    return (
      <motion.section 
        layout
        className="flex flex-col gap-2 p-3.5 rounded-2xl border transition-colors mb-5 shadow-lg relative"
        style={{ backgroundColor: `${color}1A`, borderColor: `${color}66` }}
      >
        {/* Decorative background glow */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: color }}></div>
        </div>
        
        <header className="flex items-center justify-between px-1 mb-2 relative z-20">
          <div className="flex items-center gap-2">
            <ColorPicker selectedColor={color} onChange={(c) => setCategoryColors({...categoryColors, [catKey]: c})} />
            <h2 className="font-label-caps uppercase tracking-widest font-bold text-sm" style={{ color }}>{label}</h2>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}33`, color: color }}>{catTodos.length}</span>
        </header>
        <div className="flex flex-col gap-1.5 relative z-10">
          <AnimatePresence>
            {catTodos.map(t => <TodoItem key={t.id} todo={t} updateTodo={updateTodo} deleteTodo={deleteTodo} />)}
          </AnimatePresence>
          {catTodos.length === 0 && (
            <div className="py-4 text-center font-body-compact text-sm italic opacity-60" style={{ color }}>No tasks here yet!</div>
          )}
        </div>
      </motion.section>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col scrollbar-hide pb-24">
        {renderCategoryBlock('inbox', 'Inbox')}
        {renderCategoryBlock('today', 'Today')}
        {renderCategoryBlock('upcoming', 'Upcoming')}

        {todos.filter(t => t.completed).length > 0 && (
          <section className="flex flex-col gap-1.5 mt-6 p-4 border border-surface-variant rounded-2xl bg-surface-container-lowest/50 shadow-inner">
            <header className="flex items-center justify-between px-1 mb-3">
              <h2 className="font-label-caps text-on-surface-variant/60 uppercase tracking-widest font-bold text-sm">Completed</h2>
            </header>
            <div className="flex flex-col gap-1.5 opacity-80">
              <AnimatePresence>
                {todos.filter(t => t.completed).map(t => <TodoItem key={t.id} todo={t} updateTodo={updateTodo} deleteTodo={deleteTodo} />)}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>

      {/* Input Footer */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-8 pointer-events-none">
        <div className="pointer-events-auto flex items-center bg-surface-container-high border border-surface-variant rounded-2xl p-1 shadow-2xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all backdrop-blur-xl">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px] ml-3 mr-1">add_task</span>
          <input 
            value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={handleAdd}
            placeholder={`Add a task and press Enter...`}
            className="w-full bg-transparent border-none text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none py-2.5 px-2 font-body-main"
          />
          <div className="shrink-0 flex items-center bg-surface-container border border-surface-variant rounded-xl px-2 py-1 mr-1">
            <select 
              value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-label-caps text-outline focus:ring-0 cursor-pointer uppercase outline-none font-bold text-[10px]"
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="inbox">Inbox</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Notes View
// -----------------------------------------------------------------------------

function NotesView({ stickyNotes, longNotes, setStickyNotes, setLongNotes, onEditLongNote, onEditStickyNote }) {
  const deleteSticky = (id) => setStickyNotes(stickyNotes.filter(n => n.id !== id));
  const deleteLongNote = (id) => setLongNotes(longNotes.filter(n => n.id !== id));

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 scrollbar-hide pb-20 flex flex-col gap-8">
        
        {/* Sticky Notes Grid */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b border-surface-variant pb-2">
            <h2 className="font-label-caps text-outline uppercase tracking-widest flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[16px]">sticky_note_2</span> Sticky Notes
            </h2>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onEditStickyNote({})}
              className="bg-primary/20 text-primary rounded-xl px-3 py-1 flex items-center gap-1 hover:bg-primary/30 border border-primary/30 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">add</span> <span className="text-xs font-bold">New</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {stickyNotes.map(note => (
                <motion.div 
                  layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} 
                  key={note.id} 
                  onClick={() => onEditStickyNote(note)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="glass-card rounded-2xl p-4 relative group border transition-all cursor-pointer shadow-lg hover:shadow-xl" 
                  style={{ backgroundColor: `${note.color}1A`, borderColor: `${note.color}66` }}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <span className="font-label-caps flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md bg-background/50 backdrop-blur-sm" style={{ color: note.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: note.color }}></span> {note.tag}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSticky(note.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 bg-error/10 rounded-xl material-symbols-outlined text-[14px] text-error hover:bg-error hover:text-white transition-all">delete</button>
                  </div>
                  <h3 className="font-sidebar-title text-on-surface mb-2 text-lg font-bold">{note.title}</h3>
                  <p className="font-body-compact text-on-surface-variant/90 whitespace-pre-wrap leading-relaxed line-clamp-4">{note.excerpt}</p>
                  <div className="mt-4 text-outline text-[10px] uppercase font-bold opacity-70">{note.date}</div>
                </motion.div>
              ))}
              {stickyNotes.length === 0 && (
                <div className="p-8 text-center text-outline border border-dashed border-surface-variant rounded-2xl">
                  No sticky notes. Create one to capture a quick thought!
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Long Notes */}
        <section>
          <div className="flex justify-between items-center mb-4 border-b border-surface-variant pb-2">
            <h2 className="font-label-caps text-outline uppercase tracking-widest flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[16px]">edit_document</span> Full Notes
            </h2>
            <motion.button 
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onEditLongNote(null)}
              className="bg-secondary/20 text-secondary rounded-xl px-3 py-1 flex items-center gap-1 hover:bg-secondary/30 border border-secondary/30 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">add</span> <span className="text-xs font-bold">New</span>
            </motion.button>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {longNotes.map(note => (
                <motion.div 
                  layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} 
                  key={note.id} 
                  onClick={() => onEditLongNote(note)}
                  whileHover={{ x: 4 }}
                  className="bg-surface-container-high hover:bg-surface-container-highest cursor-pointer border border-surface-variant/50 rounded-2xl p-4 relative group shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-sidebar-title font-bold text-xl drop-shadow-sm" style={{ color: note.color }}>{note.title}</h3>
                    <button onClick={(e) => { e.stopPropagation(); deleteLongNote(note.id); }} className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-[16px] text-error bg-error/10 p-1.5 rounded-xl hover:bg-error hover:text-white transition-all">delete</button>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant font-body-main line-clamp-3 opacity-80" dangerouslySetInnerHTML={{ __html: note.content }}></div>
                  <div className="mt-4 text-outline text-[10px] uppercase font-bold">{note.date}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sticky Editor View (Fullscreen)
// -----------------------------------------------------------------------------

function StickyEditorView({ note, onSave }) {
  const [title, setTitle] = useState(note?.title || '');
  const [excerpt, setExcerpt] = useState(note?.excerpt || '');
  const [color, setColor] = useState(note?.color || '#00FFFF');
  const [tag, setTag] = useState(note?.tag || 'Idea');

  const handleBack = () => {
    // Only save if there's actual content
    if (title.trim() || excerpt.trim()) {
      onSave({ id: note?.id || generateId(), title, excerpt, color, tag, date: 'Updated just now' });
    } else {
      // If empty, just go back (behaves like cancel)
      onSave({ id: note?.id, title, excerpt, color, tag, date: 'Empty' }); 
      // Note: the save function will replace it, but maybe we should let App handle deletion if empty.
      // For simplicity, it saves it, but users can delete it.
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="flex flex-col h-full bg-surface-container-lowest m-3 rounded-2xl border overflow-hidden shadow-2xl"
      style={{ borderColor: `${color}80`, backgroundColor: `${color}0A` }}
    >
      <header className="flex items-center justify-between p-3 border-b backdrop-blur-md" style={{ borderBottomColor: `${color}30`, backgroundColor: `${color}1A` }}>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-xl bg-background/50 hover:bg-background transition-colors flex items-center justify-center text-on-surface shadow-sm group">
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <div className="font-bold text-lg font-sidebar-title drop-shadow-sm" style={{ color }}>Sticky Note</div>
        </div>
        <div className="flex gap-3 items-center bg-background/40 p-1.5 rounded-xl border border-white/5">
          <input value={tag} onChange={e=>setTag(e.target.value)} className="bg-transparent text-label-caps font-bold uppercase focus:outline-none w-24 text-right" style={{ color }} placeholder="Tag..." />
          <ColorPicker selectedColor={color} onChange={setColor} />
        </div>
      </header>
      
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
        <input 
          autoFocus={!note?.title}
          value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Note Title"
          className="bg-transparent border-none text-3xl font-sidebar-title font-bold focus:outline-none w-full text-on-surface placeholder:text-on-surface-variant/30"
        />
        <textarea 
          autoFocus={!!note?.title}
          value={excerpt} onChange={e=>setExcerpt(e.target.value)}
          placeholder="Start typing your thoughts here..."
          className="bg-transparent border-none flex-1 resize-none focus:outline-none w-full text-lg font-body-main text-on-surface-variant placeholder:text-on-surface-variant/20 leading-relaxed"
        />
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Rich Editor View
// -----------------------------------------------------------------------------

function RichEditorView({ note, onSaveNote, onCancel }) {
  const [title, setTitle] = useState(note ? note.title : '');
  const [color, setColor] = useState(note ? note.color : '#F59E0B');
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && note) {
      editorRef.current.innerHTML = note.content;
    }
  }, [note]);

  const execCmd = (cmd, arg=null) => {
    document.execCommand(cmd, false, arg);
    editorRef.current.focus();
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = `<img src="${event.target.result}" style="max-width: 100%; border-radius: 12px; margin-top: 12px; resize: both; overflow: hidden; border: 1px solid #444; box-shadow: 0 4px 15px rgba(0,0,0,0.5);" />`;
          document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const save = () => {
    const html = editorRef.current.innerHTML;
    if (html && (html.trim() || title.trim())) {
      onSaveNote({ title: title || 'Untitled Document', content: html, color });
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest m-3 rounded-2xl border shadow-2xl overflow-hidden" style={{ borderColor: `${color}40` }}>
      <header className="flex items-center justify-between p-3 border-b" style={{ backgroundColor: `${color}1A`, borderBottomColor: `${color}30` }}>
        <div className="flex items-center gap-3 w-full">
          <button onClick={save} className="p-2 rounded-xl bg-background/50 hover:bg-background transition-colors flex items-center justify-center text-on-surface shadow-sm group shrink-0">
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <input 
            value={title} onChange={e=>setTitle(e.target.value)}
            placeholder="Document Title..."
            className="bg-transparent border-none font-bold text-xl focus:outline-none w-full drop-shadow-sm"
            style={{ color }}
          />
          <div className="shrink-0 bg-background/40 p-1.5 rounded-xl border border-white/5"><ColorPicker selectedColor={color} onChange={setColor} /></div>
        </div>
      </header>
      
      <div className="flex items-center gap-1 p-2 bg-surface-container-high border-b border-surface-variant/50 shadow-inner">
        <button onClick={() => execCmd('bold')} className="p-1.5 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant/30 text-on-surface transition-colors" title="Bold"><span className="material-symbols-outlined text-[18px]">format_bold</span></button>
        <button onClick={() => execCmd('italic')} className="p-1.5 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant/30 text-on-surface transition-colors" title="Italic"><span className="material-symbols-outlined text-[18px]">format_italic</span></button>
        <button onClick={() => execCmd('underline')} className="p-1.5 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant/30 text-on-surface transition-colors" title="Underline"><span className="material-symbols-outlined text-[18px]">format_underlined</span></button>
        <div className="w-px h-5 bg-surface-variant/80 mx-2"></div>
        <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded-xl hover:bg-surface-variant border border-transparent hover:border-outline-variant/30 text-on-surface transition-colors"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto scrollbar-hide bg-surface-container-lowest">
        <div 
          ref={editorRef} contentEditable onPaste={handlePaste}
          className="w-full min-h-full focus:outline-none prose prose-invert max-w-none text-on-surface font-body-main text-[15px] leading-loose"
          data-placeholder="Start typing or paste an image here..."
          style={{ emptyCells: 'show' }}
        ></div>
      </div>
    </div>
  );
}

export default App;
