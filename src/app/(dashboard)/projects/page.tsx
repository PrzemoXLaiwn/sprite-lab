"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, FolderOpen, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ProjectFolder {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  suggestedAssets: string | null;
  defaultStyleId: string | null;
  defaultView: string | null;
  _count?: { generations: number };
}

interface Project {
  id: string;
  name: string;
  gameType: string | null;
  perspective: string | null;
  artStyle: string | null;
  mood: string | null;
  systems: string | null;
  notes: string | null;
  createdAt: string;
  folders: ProjectFolder[];
  _count: { generations: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [gameType, setGameType] = useState("");
  const [perspective, setPerspective] = useState("");
  const [artStyle, setArtStyle] = useState("");
  const [mood, setMood] = useState("");
  const [systems, setSystems] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {
      console.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gameType, perspective, artStyle, mood, systems }),
      });
      if (res.ok) {
        setShowForm(false);
        setName(""); setGameType(""); setPerspective(""); setArtStyle(""); setMood(""); setSystems("");
        loadProjects();
      }
    } catch {
      console.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its folders?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    loadProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] p-4 sm:p-6">
      <div className="max-w-[900px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white/90">Projects</h1>
            <p className="text-xs text-white/30 mt-0.5">Organize assets by game project</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}
            className="h-9 text-xs bg-[#FF6B2C] hover:bg-[#e55a1f] text-white border-0">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Project
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="rounded-xl border border-white/5 bg-[#11151b] p-5 mb-6 space-y-4">
            <h2 className="text-sm font-semibold text-white/70">Describe your game</h2>
            <p className="text-[11px] text-white/25">AI will create an organized folder structure based on your game details.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">
                  Project name<span className="text-[#FF6B2C] ml-0.5">*</span>
                </label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="My Dungeon Crawler"
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none focus:border-[#FF6B2C]/30 placeholder:text-white/15" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Game type</label>
                <select value={gameType} onChange={(e) => setGameType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none appearance-none">
                  <option value="">Select...</option>
                  <option>Dungeon Crawler</option>
                  <option>Platformer</option>
                  <option>RPG</option>
                  <option>Roguelike</option>
                  <option>Survival</option>
                  <option>Tower Defense</option>
                  <option>Action</option>
                  <option>Puzzle</option>
                  <option>Card Game</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Perspective</label>
                <select value={perspective} onChange={(e) => setPerspective(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none appearance-none">
                  <option value="">Select...</option>
                  <option>Top-down</option>
                  <option>Side-scroll</option>
                  <option>Isometric</option>
                  <option>Front-facing</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Art style</label>
                <select value={artStyle} onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none appearance-none">
                  <option value="">Select...</option>
                  <option>Pixel Art</option>
                  <option>Pixel Art HD</option>
                  <option>Hand-Painted</option>
                  <option>Anime</option>
                  <option>Dark Fantasy</option>
                  <option>Cartoon</option>
                  <option>Vector</option>
                  <option>Realistic</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Mood</label>
                <select value={mood} onChange={(e) => setMood(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none appearance-none">
                  <option value="">Select...</option>
                  <option>Dark Fantasy</option>
                  <option>Colorful</option>
                  <option>Gritty</option>
                  <option>Whimsical</option>
                  <option>Sci-Fi</option>
                  <option>Horror</option>
                  <option>Peaceful</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Core systems</label>
                <input value={systems} onChange={(e) => setSystems(e.target.value)}
                  placeholder="combat, inventory, crafting, loot"
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0c10] border border-white/6 text-sm text-white/80 outline-none focus:border-[#FF6B2C]/30 placeholder:text-white/15" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={!name.trim() || creating}
                className="h-10 text-xs font-semibold bg-[#FF6B2C] hover:bg-[#e55a1f] text-white border-0">
                {creating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating plan...</> : "Generate Asset Plan"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}
                className="h-10 text-xs border-white/6 text-white/40 hover:bg-white/4">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Project list */}
        {projects.length === 0 && !showForm ? (
          <div className="rounded-xl border border-white/5 bg-[#11151b] p-12 text-center">
            <FolderOpen className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30 mb-1">No projects yet</p>
            <p className="text-[11px] text-white/15 mb-4">Create a project to organize your game assets into folders</p>
            <Button onClick={() => setShowForm(true)}
              className="h-9 text-xs bg-[#FF6B2C] hover:bg-[#e55a1f] text-white border-0">
              <Plus className="w-3.5 h-3.5 mr-1.5" />Create your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-white/5 bg-[#11151b] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white/80">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {project.artStyle && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/30">{project.artStyle}</span>}
                      {project.perspective && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/30">{project.perspective}</span>}
                      {project.mood && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/30">{project.mood}</span>}
                      {project.gameType && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/30">{project.gameType}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20">{project._count.generations} assets</span>
                    <button onClick={() => handleDelete(project.id)} className="text-white/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Folders */}
                {project.folders.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {project.folders.map((folder) => (
                      <Link key={folder.id}
                        href={`/generate?projectId=${project.id}&folderId=${folder.id}&categoryId=${folder.category}&subcategoryId=${folder.subcategory || ""}&styleId=${folder.defaultStyleId || ""}&view=${folder.defaultView || "DEFAULT"}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 hover:bg-[#FF6B2C]/8 border border-transparent hover:border-[#FF6B2C]/15 transition-all group"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-white/20 group-hover:text-[#FF6B2C]/60 shrink-0" />
                        <span className="text-[11px] text-white/40 group-hover:text-white/70 truncate">{folder.name}</span>
                        <ChevronRight className="w-3 h-3 text-white/10 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
