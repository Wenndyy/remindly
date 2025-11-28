// app/components/TaskList.tsx
"use client";

import React from "react";

export type TaskItem = {
  id?: string;
  title: string;
  date: string; 
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  time?: string;
  description?: string;
  guest?: string;
  location?: string;
  project?: string;
  project_color?: string;
  color?: string;
};

type TaskListProps = {
  tasks?: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
};

export default function TaskList({ tasks = [], onTaskClick }: TaskListProps) {
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };


  const displayTasks = tasks.length > 0 ? tasks : [];

  return (
    <div className="bg-white rounded-[15px] shadow pt-[34px] px-[25px] pb-[19px]">
      <h3 className="text-xl font-semibold mb-3 text-black">Tasks</h3>
      <ul className="space-y-2">
        {displayTasks.map((task) => (
          <li
            key={task.id || task.title}
            className="flex items-center justify-between p-4 border rounded-[10px] border-[#D7D7D7] cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onTaskClick?.(task)}
          >
            <div className="flex-1">
              <div className="font-semibold text-black mb-[5px]">{task.title}</div>
              <div className="text-sm text-black">
                {formatDisplayDate(task.date)}
              
              </div>
              
            </div>
            <div>
              {task.project && (
                <span 
                  className="inline-block text-xs px-3 py-1 rounded-[5px]"
                  style={{
                    backgroundColor: task.project_color ? `${task.project_color}20` : '#FEF3C7',
                    color: task.project_color ? task.project_color : '#92400E',
                    border: task.project_color ? `1px solid ${task.project_color}40` : '1px solid #F59E0B40'
                  }}
                >
                  {task.project}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

