'use client'
import { useState } from 'react'

interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
}

export default function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggle = async (taskId: string, newCompleted: boolean) => {
    setToggling(taskId)
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t))
    )
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, completed: newCompleted }),
      })
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !newCompleted } : t))
      )
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => toggle(task.id, !task.completed)}
          disabled={toggling === task.id}
          className="w-full flex items-start gap-2 text-left active:opacity-70 transition-opacity"
        >
          <span className="text-sm mt-0.5 shrink-0">
            {toggling === task.id ? '⏳' : task.completed ? '✅' : '⬜'}
          </span>
          <div>
            <p
              className={`text-sm ${
                task.completed ? 'line-through text-gray-400' : 'text-[#1a1a2e]'
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-400">{task.description}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
