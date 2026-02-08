"use client";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDndPlanner } from "@/hooks/useDndPlanner";
import VehicleColumn from "@/components/planner/VehicleColumn";

export default function RouteBoard() {
  const { routes, onDragEnd } = useDndPlanner();

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <section className="card h-full overflow-hidden">
        <div className="panel-title mb-3">Routes</div>
        {routes.length === 0 ? (
          <div className="empty-state">Run a plan to generate routes.</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto h-full pr-2 scroll-area">
            {routes.map((route) => (
              <SortableContext
                key={route.vehicle_id}
                items={route.stops.map((_, idx) => `${route.vehicle_id}:${idx}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="min-w-[280px] max-w-[320px]">
                  <VehicleColumn route={route} />
                </div>
              </SortableContext>
            ))}
          </div>
        )}
      </section>
    </DndContext>
  );
}
