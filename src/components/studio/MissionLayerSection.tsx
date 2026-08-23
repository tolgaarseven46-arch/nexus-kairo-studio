import React, { useState } from 'react';
import {
  Shield,
  Tag,
  Check,
  Plus,
  Trash2,
  X,
  Lock,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Award,
  Radio,
  FileText,
} from 'lucide-react';
import { DroitRole, DroitCategory, AbilityItem, TaskItem, RestrictionItem } from '../../types';
import { Button } from '../common/Button';

interface MissionLayerSectionProps {
  role: DroitRole;
  category: DroitCategory;
  permissions: AbilityItem[];
  tasks: TaskItem[];
  restrictions: RestrictionItem[];
  onChangeRole: (updates: Partial<DroitRole>) => void;
  onChangeCategory: (updates: Partial<DroitCategory>) => void;
  onChangePermissions: (permissions: AbilityItem[]) => void;
  onChangeTasks: (tasks: TaskItem[]) => void;
  onChangeRestrictions: (restrictions: RestrictionItem[]) => void;
}

const DEFAULT_CATEGORY_OPTIONS = [
  'Yönetim',
  'Moderasyon',
  'Güvenlik',
  'Rehber / Destek',
  'Operasyon',
  'Analiz & Gözlem',
];

const SEVERITY_LEVELS: Array<RestrictionItem['severity']> = [
  'Kesin Yasak',
  'Yönetici Onayı Gerekir',
  'Uyarı Verilir',
];

const TASK_PRIORITIES: Array<TaskItem['priority']> = [
  'Düşük',
  'Orta',
  'Yüksek',
  'Kritik',
];

export const MissionLayerSection: React.FC<MissionLayerSectionProps> = ({
  role,
  category,
  permissions,
  tasks,
  restrictions,
  onChangeRole,
  onChangeCategory,
  onChangePermissions,
  onChangeTasks,
  onChangeRestrictions,
}) => {
  // Category adder inline state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Permission adder inline state
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [newPermName, setNewPermName] = useState('');
  const [newPermCategory, setNewPermCategory] = useState('Özel');

  // Task adder inline state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('Yüksek');

  // Restriction adder inline state
  const [isAddingRestriction, setIsAddingRestriction] = useState(false);
  const [newRestText, setNewRestText] = useState('');
  const [newRestSeverity, setNewRestSeverity] = useState<RestrictionItem['severity']>('Kesin Yasak');

  // Category handling
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORY_OPTIONS, ...(category.customCategories || [])])
  );

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    onChangeCategory({
      name: cat,
      customCategories: [...(category.customCategories || []), cat],
    });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Permission handling
  const handleTogglePermission = (id: string) => {
    onChangePermissions(
      permissions.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleAddCustomPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermName.trim()) return;
    const newPerm: AbilityItem = {
      id: `perm_${Date.now()}`,
      name: newPermName.trim(),
      category: newPermCategory.trim() || 'Özel',
      enabled: true,
      isCustom: true,
    };
    onChangePermissions([...permissions, newPerm]);
    setNewPermName('');
    setIsAddingPermission(false);
  };

  const handleDeletePermission = (id: string) => {
    onChangePermissions(permissions.filter((p) => p.id !== id));
  };

  // Task handling
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      enabled: true,
    };
    onChangeTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleToggleTask = (id: string) => {
    onChangeTasks(
      tasks.map((t) => (t.id === id ? { ...t, enabled: t.enabled !== false ? false : true } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    onChangeTasks(tasks.filter((t) => t.id !== id));
  };

  // Restriction handling
  const handleAddRestriction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestText.trim()) return;
    const newRest: RestrictionItem = {
      id: `rest_${Date.now()}`,
      text: newRestText.trim(),
      severity: newRestSeverity,
    };
    onChangeRestrictions([...restrictions, newRest]);
    setNewRestText('');
    setIsAddingRestriction(false);
  };

  const handleDeleteRestriction = (id: string) => {
    onChangeRestrictions(restrictions.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-widest uppercase">
                KATMAN 03
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                YETKİ & DİREKTİF
              </span>
            </div>
            <h2 className="text-sm font-mono font-bold text-zinc-100">GÖREV</h2>
          </div>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">Rol, Yetki & Sınırlar</span>
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-210px)] font-sans text-xs">
        
        {/* 1. Kategori & Rol Tanımlama */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80 font-mono">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            <span>Kategori ve Operasyonel Rol</span>
          </div>

          <div className="space-y-3">
            {/* Kategori Seçici & Yeni Kategori Ekleme */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-400 text-[11px]">Kategori:</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Yeni Kategori Ekle</span>
                </button>
              </div>

              <select
                value={category.name || 'Yönetim'}
                onChange={(e) => onChangeCategory({ name: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {isAddingCategory && (
              <form
                onSubmit={handleAddCustomCategory}
                className="p-2.5 rounded-lg bg-zinc-900 border border-emerald-500/40 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Yeni kategori adı (örn. Siber İstihbarat, Lojistik)..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
                <Button variant="primary" size="sm" type="submit">
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}

            {/* Rol ve Rütbe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Droit Rolü:</label>
                <input
                  type="text"
                  value={role.title || 'Sunucu Yöneticisi'}
                  onChange={(e) => onChangeRole({ title: e.target.value })}
                  placeholder="örn. Sunucu Yöneticisi, Güvenlik Şefi..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-[11px] block mb-1">Rütbe / Seviye:</label>
                <input
                  type="text"
                  value={role.rank || 'Tier-1 Baş Droit'}
                  onChange={(e) => onChangeRole({ rank: e.target.value })}
                  placeholder="örn. Tier-1 Baş Droit, Alfa Nöbetçi..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Seçilebilir Yetkiler (Permissions Matrix) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>SEÇİLEBİLİR YETKİLER ({permissions.filter((p) => p.enabled).length}/{permissions.length} Aktif)</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Varsayılan olarak kapalıdır; dilediğiniz yetkileri açın.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingPermission(true)}
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Özel yetki ekle</span>
            </button>
          </div>

          {/* Permissions Toggle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {permissions.map((perm) => (
              <div
                key={perm.id}
                onClick={() => handleTogglePermission(perm.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  perm.enabled
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-100 shadow-sm shadow-emerald-500/10'
                    : 'bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold transition-colors ${
                      perm.enabled
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'border-zinc-700 bg-zinc-950 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div className="truncate font-mono text-xs">
                    <div>{perm.name}</div>
                    {perm.category && (
                      <div className="text-[9px] text-zinc-500 uppercase">{perm.category}</div>
                    )}
                  </div>
                </div>

                {perm.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePermission(perm.id);
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Yetkiyi Kaldır"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Inline Add Custom Permission Form */}
          {isAddingPermission && (
            <form
              onSubmit={handleAddCustomPermission}
              className="p-3 rounded-lg bg-zinc-900 border border-emerald-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-mono"
            >
              <input
                type="text"
                value={newPermName}
                onChange={(e) => setNewPermName(e.target.value)}
                placeholder="Yetki adı (örn. Özel webhook tetikleme)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <input
                type="text"
                value={newPermCategory}
                onChange={(e) => setNewPermCategory(e.target.value)}
                placeholder="Kategori (örn. Güvenlik)"
                className="w-28 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" type="submit">
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsAddingPermission(false);
                    setNewPermName('');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 3. Görevler (Tasks List) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
              <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
              <span>GÖREVLER & DİREKTİFLER ({tasks.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingTask(true)}
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Görev ekle</span>
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/90 flex items-center justify-between gap-3 text-xs text-zinc-300 shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-4 h-4 rounded flex items-center justify-center border text-[9px] transition-colors cursor-pointer ${
                      task.enabled !== false
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'border-zinc-700 bg-zinc-950 text-transparent'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </button>
                  <span className={`truncate font-sans ${task.enabled === false ? 'line-through text-zinc-500' : ''}`}>
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded border font-bold ${
                      task.priority === 'Kritik'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : task.priority === 'Yüksek'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                    title="Görevi Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline Add Task Form */}
          {isAddingTask && (
            <form
              onSubmit={handleAddTask}
              className="p-3 rounded-lg bg-zinc-900 border border-emerald-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-mono"
            >
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Görev tanımı (örn. Sunucudaki spam akışını temizle)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" type="submit">
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* 4. Sınırlar & Kısıtlar (Restrictions) */}
        <div className="space-y-3 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>SINIRLAR & KESİN KISITLAR ({restrictions.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingRestriction(true)}
              className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Sınır ekle</span>
            </button>
          </div>

          <div className="space-y-2">
            {restrictions.map((rest) => (
              <div
                key={rest.id}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/90 flex items-center justify-between gap-3 text-xs text-zinc-300 shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate font-sans">{rest.text}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded border font-bold ${
                      rest.severity === 'Kesin Yasak'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                        : rest.severity === 'Yönetici Onayı Gerekir'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {rest.severity || 'Kesin Yasak'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRestriction(rest.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                    title="Sınırı Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline Add Restriction Form */}
          {isAddingRestriction && (
            <form
              onSubmit={handleAddRestriction}
              className="p-3 rounded-lg bg-zinc-900 border border-emerald-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 font-mono"
            >
              <input
                type="text"
                value={newRestText}
                onChange={(e) => setNewRestText(e.target.value)}
                placeholder="Sınır tanımı (örn. Sunucu sahibinin onayı olmadan kalıcı ban uygulayamaz)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <select
                value={newRestSeverity}
                onChange={(e) => setNewRestSeverity(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {SEVERITY_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" type="submit">
                  Ekle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsAddingRestriction(false);
                    setNewRestText('');
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
