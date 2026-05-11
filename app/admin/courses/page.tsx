"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import { isAdmin } from "@/app/lib/admin";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, BookOpen, ArrowLeft, Save, X } from "lucide-react";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string;
  level: string;
  duration: string;
  is_active: boolean;
  display_order: number;
  module_count?: number;
}

interface ModuleData {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string;
  content: string;
  duration_min: number;
  display_order: number;
  is_free: boolean;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !isAdmin(data.user.email)) {
        router.replace("/smm/services");
        return;
      }
      setAuthed(true);
    })();
  }, [router]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/courses", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setCourses(j.courses || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchCourses();
  }, [authed, fetchCourses]);

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`¿Borrar curso "${title}"?`)) return;
    const r = await fetch(`/api/admin/courses?id=${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = await r.json();
      alert(j.error || "Error");
      return;
    }
    fetchCourses();
  };

  if (!authed) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Verificando...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-white/60 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <span className="font-bold tracking-widest">TRUST · ADMIN</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link href="/admin" className="text-white/60 hover:text-white">Dashboard</Link>
            <Link href="/admin/courses" className="text-blue-300 font-semibold">Cursos</Link>
            <Link href="/admin/network" className="text-white/60 hover:text-white">Red</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-400" />
            Gestión de Cursos
          </h1>
          <button
            onClick={() => { setEditingCourse(null); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo curso
          </button>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded p-3 text-sm">{error}</div>}

        {showForm && (
          <CourseForm
            course={editingCourse}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); fetchCourses(); }}
          />
        )}

        {loading ? (
          <p className="text-white/60">Cargando...</p>
        ) : courses.length === 0 ? (
          <p className="text-white/60">No hay cursos. Crea el primero.</p>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl">
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{c.title}</span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">{c.level}</span>
                      {!c.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300">Inactivo</span>}
                      <span className="text-xs text-white/40">{c.duration}</span>
                      <span className="text-xs text-emerald-300">{c.module_count || 0} módulos</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1 truncate">{c.description}</p>
                    <p className="text-[10px] text-white/30 mt-1">slug: {c.slug} · orden: {c.display_order}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)} className="p-2 bg-white/5 hover:bg-white/10 rounded" title="Ver módulos">
                      {expandedCourseId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setEditingCourse(c); setShowForm(true); }} className="p-2 bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 rounded" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteCourse(c.id, c.title)} className="p-2 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded" title="Borrar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedCourseId === c.id && <ModulesSection courseId={c.id} />}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Course Form ───────────────────────────────────────────────────────────────
function CourseForm({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    slug: course?.slug || "",
    title: course?.title || "",
    description: course?.description || "",
    cover_url: course?.cover_url || "",
    level: course?.level || "principiante",
    duration: course?.duration || "",
    display_order: course?.display_order || 0,
    is_active: course?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const method = course ? "PATCH" : "POST";
      const body = course ? { id: course.id, ...form } : form;
      const r = await fetch("/api/admin/courses", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/5 border border-blue-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{course ? "Editar curso" : "Nuevo curso"}</h3>
        <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded p-2 text-sm mb-3">{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="mi-curso-2026" />
        <Input label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Cover URL" value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} placeholder="https://..." />
        <Input label="Duración" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} placeholder="8 horas" />
        <SelectInput label="Nivel" value={form.level} onChange={(v) => setForm({ ...form, level: v })} options={["principiante", "intermedio", "avanzado"]} />
        <Input label="Orden" type="number" value={String(form.display_order)} onChange={(v) => setForm({ ...form, display_order: Number(v) })} />
      </div>
      <Textarea label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        <span className="text-sm">Activo (visible para usuarios)</span>
      </label>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
      >
        <Save className="w-4 h-4" /> {saving ? "Guardando..." : course ? "Actualizar" : "Crear"}
      </button>
    </div>
  );
}

// ── Modules Section ──────────────────────────────────────────────────────────
function ModulesSection({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ModuleData | null>(null);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/course-modules?course_id=${courseId}`, { credentials: "include" });
    const j = await r.json();
    setModules(j.modules || []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const deleteModule = async (id: string, title: string) => {
    if (!confirm(`¿Borrar módulo "${title}"?`)) return;
    await fetch(`/api/admin/course-modules?id=${id}`, { method: "DELETE", credentials: "include" });
    fetchModules();
  };

  return (
    <div className="border-t border-white/10 p-4 bg-black/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white/80">Módulos del curso</span>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Agregar módulo
        </button>
      </div>

      {showForm && (
        <ModuleForm
          courseId={courseId}
          module={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchModules(); }}
        />
      )}

      {loading ? (
        <p className="text-white/40 text-sm">Cargando...</p>
      ) : modules.length === 0 ? (
        <p className="text-white/40 text-sm">Sin módulos.</p>
      ) : (
        <div className="space-y-2">
          {modules.map((m) => (
            <div key={m.id} className="bg-white/5 rounded p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{m.title}</span>
                  {m.is_free && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Gratis</span>}
                  {m.duration_min > 0 && <span className="text-[10px] text-white/40">{m.duration_min} min</span>}
                  <span className="text-[10px] text-white/30">orden: {m.display_order}</span>
                </div>
                {m.description && <p className="text-xs text-white/50 mt-0.5 truncate">{m.description}</p>}
                {m.video_url && <p className="text-[10px] text-blue-300 mt-0.5 truncate">🎬 {m.video_url}</p>}
              </div>
              <button onClick={() => { setEditing(m); setShowForm(true); }} className="p-1.5 bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 rounded">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => deleteModule(m.id, m.title)} className="p-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-300 rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleForm({
  courseId,
  module: mod,
  onClose,
  onSaved,
}: {
  courseId: string;
  module: ModuleData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: mod?.title || "",
    description: mod?.description || "",
    video_url: mod?.video_url || "",
    content: mod?.content || "",
    duration_min: mod?.duration_min || 0,
    display_order: mod?.display_order || 0,
    is_free: mod?.is_free || false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const method = mod ? "PATCH" : "POST";
      const body = mod ? { id: mod.id, ...form } : { course_id: courseId, ...form };
      const r = await fetch("/api/admin/course-modules", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-blue-500/5 border border-blue-500/30 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold">{mod ? "Editar módulo" : "Nuevo módulo"}</h4>
        <button onClick={onClose}><X className="w-4 h-4 text-white/60 hover:text-white" /></button>
      </div>
      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded p-2 text-sm mb-2">{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Input label="Video URL (YouTube, Vimeo...)" value={form.video_url} onChange={(v) => setForm({ ...form, video_url: v })} placeholder="https://youtube.com/watch?v=..." />
        <Input label="Duración (min)" type="number" value={String(form.duration_min)} onChange={(v) => setForm({ ...form, duration_min: Number(v) })} />
        <Input label="Orden" type="number" value={String(form.display_order)} onChange={(v) => setForm({ ...form, display_order: Number(v) })} />
      </div>
      <Textarea label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      <Textarea label="Contenido (Markdown opcional)" value={form.content} onChange={(v) => setForm({ ...form, content: v })} rows={5} />
      <label className="flex items-center gap-2 mt-2 cursor-pointer">
        <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
        <span className="text-xs">Módulo gratis (visible sin suscripción)</span>
      </label>
      <button onClick={submit} disabled={saving} className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50">
        <Save className="w-3 h-3" /> {saving ? "Guardando..." : mod ? "Actualizar" : "Crear"}
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-white/60 mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block mt-3">
      <span className="text-xs text-white/60 mb-1 block">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none resize-y"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs text-white/60 mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm focus:border-blue-400 outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
